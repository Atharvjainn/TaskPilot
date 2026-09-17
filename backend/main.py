"""
FastAPI application for TaskPilot voice-to-command backend.
Orchestrates NLU extraction, entity resolution, confirmation flow, and database operations.
"""

from typing import Optional, Dict, Any, List
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import or_

from models import get_db, init_db, Project, Location, Contractor, Snag
from nlu import extract_intent_and_entities
from resolve import resolve_entities, resolve_location, resolve_contractor

app = FastAPI(
    title="TaskPilot API",
    description="Voice-to-command backend for construction/interior project software",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup_event():
    init_db()


def get_active_project(db: Session) -> Project:
    """
    Returns the first project row as the single active project for demo scope.
    """
    project = db.query(Project).first()
    if not project:
        raise HTTPException(
            status_code=404,
            detail="No active project found. Please run seed.py first."
        )
    return project


# Request / Response Schemas
class VoiceRequest(BaseModel):
    transcript: str


class ConfirmRequest(BaseModel):
    action: str  # "confirm" or "cancel"
    payload: Dict[str, Any]


@app.get("/project")
def get_project_info(db: Session = Depends(get_db)):
    """
    Returns active project metadata, locations, and contractors.
    """
    project = get_active_project(db)
    locations = db.query(Location).filter(Location.project_id == project.id).all()
    contractors = db.query(Contractor).filter(Contractor.project_id == project.id).all()
    return {
        "id": project.id,
        "name": project.name,
        "description": project.description,
        "locations": [{"id": l.id, "name": l.name, "floor": l.floor} for l in locations],
        "contractors": [{"id": c.id, "name": c.name, "trade": c.trade} for c in contractors]
    }


@app.get("/snags")
def get_snags(db: Session = Depends(get_db)):
    """
    Retrieves all snags for the active project.
    """
    project = get_active_project(db)
    snags = (
        db.query(Snag)
        .filter(Snag.project_id == project.id)
        .order_by(Snag.created_at.desc())
        .all()
    )
    return [
        {
            "id": s.id,
            "title": s.title,
            "description": s.description,
            "status": s.status,
            "priority": s.priority,
            "location": s.location.name if s.location else None,
            "contractor": s.contractor.name if s.contractor else None,
            "created_at": s.created_at.isoformat() if s.created_at else None
        }
        for s in snags
    ]


@app.post("/voice")
def process_voice_transcript(req: VoiceRequest, db: Session = Depends(get_db)):
    """
    Main voice endpoint:
    1. Sends transcript to NLU for intent & raw entity extraction.
    2. Resolves entities against DB with fuzzy matching.
    3. Returns confirmation card payload (create_snag) or executes search directly (search_snags).
    """
    transcript = req.transcript.strip()
    if not transcript:
        raise HTTPException(status_code=400, detail="Transcript cannot be empty.")

    project = get_active_project(db)

    # 1. NLU Extraction
    nlu_result = extract_intent_and_entities(transcript)
    intent = nlu_result.get("intent")
    raw_entities = nlu_result.get("raw_entities", {})

    # 2. Intent Routing
    if intent == "create_snag":
        resolved = resolve_entities(db, project.id, raw_entities)

        # If user explicitly specified a location that couldn't be matched at all
        if raw_entities.get("location") and not resolved["location"]["matched"]:
            return {
                "type": "clarify",
                "message": f"Could not find location matching '{raw_entities.get('location')}'. Please clarify the location.",
                "raw_entities": raw_entities,
                "transcript": transcript
            }

        return {
            "type": "confirm",
            "intent": "create_snag",
            "message": "Please confirm the snag details before saving.",
            "data": {
                "project_id": project.id,
                "title": resolved["title"] or transcript,
                "description": resolved["description"],
                "priority": resolved["priority"],
                "location_id": resolved["location"]["id"],
                "location_name": resolved["location"]["name"],
                "raw_location": resolved["location"]["raw"],
                "contractor_id": resolved["contractor"]["id"],
                "contractor_name": resolved["contractor"]["name"],
                "contractor_trade": resolved["contractor"]["trade"],
                "raw_contractor": resolved["contractor"]["raw"]
            },
            "transcript": transcript
        }

    elif intent == "search_snags":
        # Resolve search filters
        query = db.query(Snag).filter(Snag.project_id == project.id)

        loc_match = resolve_location(db, project.id, raw_entities.get("location"))
        if loc_match["matched"] and loc_match["location"]:
            query = query.filter(Snag.location_id == loc_match["location"].id)

        contr_match = resolve_contractor(db, project.id, raw_entities.get("contractor"))
        if contr_match["matched"] and contr_match["contractor"]:
            query = query.filter(Snag.contractor_id == contr_match["contractor"].id)

        if raw_entities.get("status"):
            query = query.filter(Snag.status.ilike(f"%{raw_entities['status']}%"))

        if raw_entities.get("query"):
            q_term = f"%{raw_entities['query']}%"
            query = query.filter(or_(Snag.title.ilike(q_term), Snag.description.ilike(q_term)))

        results = query.order_by(Snag.created_at.desc()).all()

        return {
            "type": "search_results",
            "intent": "search_snags",
            "count": len(results),
            "filters": {
                "location": loc_match["location"].name if loc_match["matched"] else raw_entities.get("location"),
                "contractor": contr_match["contractor"].name if contr_match["matched"] else raw_entities.get("contractor"),
                "status": raw_entities.get("status")
            },
            "snags": [
                {
                    "id": s.id,
                    "title": s.title,
                    "description": s.description,
                    "status": s.status,
                    "priority": s.priority,
                    "location": s.location.name if s.location else None,
                    "contractor": s.contractor.name if s.contractor else None,
                    "created_at": s.created_at.isoformat() if s.created_at else None
                }
                for s in results
            ],
            "transcript": transcript
        }

    else:
        return {
            "type": "unknown",
            "message": "Sorry, I couldn't recognize an actionable command. You can try: 'Create a snag for...' or 'Show me snags in...'",
            "raw_transcript": transcript
        }


@app.post("/confirm")
def handle_confirmation(req: ConfirmRequest, db: Session = Depends(get_db)):
    """
    Handles confirmation step for data-modifying intents (create_snag).
    """
    if req.action == "cancel":
        return {
            "type": "cancelled",
            "message": "Action was cancelled. No changes were saved to the project."
        }

    if req.action == "confirm":
        payload = req.payload
        project_id = payload.get("project_id")
        title = payload.get("title")

        if not title:
            raise HTTPException(status_code=400, detail="Title is required to create a snag.")

        new_snag = Snag(
            project_id=project_id,
            title=title,
            description=payload.get("description"),
            priority=payload.get("priority", "Medium"),
            location_id=payload.get("location_id"),
            contractor_id=payload.get("contractor_id"),
            status="Open"
        )
        db.add(new_snag)
        db.commit()
        db.refresh(new_snag)

        return {
            "type": "created",
            "message": "Snag successfully created!",
            "snag": {
                "id": new_snag.id,
                "title": new_snag.title,
                "description": new_snag.description,
                "status": new_snag.status,
                "priority": new_snag.priority,
                "location": new_snag.location.name if new_snag.location else None,
                "contractor": new_snag.contractor.name if new_snag.contractor else None,
                "created_at": new_snag.created_at.isoformat() if new_snag.created_at else None
            }
        }

    raise HTTPException(status_code=400, detail=f"Unsupported confirmation action: '{req.action}'")
