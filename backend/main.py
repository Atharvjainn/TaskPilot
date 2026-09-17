"""
FastAPI application for TaskPilot voice-to-command backend.
Orchestrates NLU extraction, entity resolution, confirmation flow, and database operations.
Supports intents: create_snag, assign_task, and search_snags.
"""

import os
from typing import Optional, Dict, Any, List
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import or_
from groq import Groq

from models import get_db, init_db, Project, Location, Contractor, Snag, Task
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

FRONTEND_FILE = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "index.html"))


@app.get("/")
def serve_frontend():
    """Serves the single-page voice UI directly at root."""
    if os.path.exists(FRONTEND_FILE):
        return FileResponse(FRONTEND_FILE)
    return {"message": "TaskPilot API is running. (Frontend file not found at " + FRONTEND_FILE + ")"}


@app.post("/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    """
    Transcribes microphone audio using Groq Whisper (whisper-large-v3-turbo).
    Works reliably across all browsers without Google Web Speech network restrictions.
    """
    groq_key = os.getenv("GROQ_API_KEY")
    if not groq_key:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY is not set.")

    client = Groq(api_key=groq_key)
    audio_content = await file.read()

    try:
        transcription = client.audio.transcriptions.create(
            file=(file.filename or "audio.webm", audio_content),
            model="whisper-large-v3-turbo",
            response_format="text"
        )
        return {"transcript": transcription.strip()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")


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
            "contractor_trade": s.contractor.trade if s.contractor else None,
            "created_at": s.created_at.isoformat() if s.created_at else None
        }
        for s in snags
    ]


@app.get("/tasks")
def get_tasks(db: Session = Depends(get_db)):
    """
    Retrieves all tasks for the active project.
    """
    project = get_active_project(db)
    tasks = (
        db.query(Task)
        .filter(Task.project_id == project.id)
        .order_by(Task.created_at.desc())
        .all()
    )
    return [
        {
            "id": t.id,
            "title": t.title,
            "description": t.description,
            "due_date": t.due_date,
            "status": t.status,
            "priority": t.priority,
            "location": t.location.name if t.location else None,
            "contractor": t.contractor.name if t.contractor else None,
            "contractor_trade": t.contractor.trade if t.contractor else None,
            "created_at": t.created_at.isoformat() if t.created_at else None
        }
        for t in tasks
    ]


@app.post("/voice")
def process_voice_transcript(req: VoiceRequest, db: Session = Depends(get_db)):
    """
    Main voice endpoint:
    1. Sends transcript to NLU for intent & raw entity extraction.
    2. Resolves entities against DB with fuzzy matching.
    3. Returns confirmation card payload (create_snag / assign_task) or executes search directly.
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
                "intent": "create_snag",
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

    elif intent == "assign_task":
        resolved = resolve_entities(db, project.id, raw_entities)

        # Ensure a contractor was specified and matched
        if raw_entities.get("contractor") and not resolved["contractor"]["matched"]:
            return {
                "type": "clarify",
                "message": f"Could not find contractor matching '{raw_entities.get('contractor')}'. Please specify a valid contractor or trade.",
                "raw_entities": raw_entities,
                "transcript": transcript
            }

        if not resolved["contractor"]["id"]:
            return {
                "type": "clarify",
                "message": "Please specify which contractor or trade to assign this task to.",
                "raw_entities": raw_entities,
                "transcript": transcript
            }

        # If location was mentioned but couldn't be matched
        if raw_entities.get("location") and not resolved["location"]["matched"]:
            return {
                "type": "clarify",
                "message": f"Could not find location matching '{raw_entities.get('location')}'. Please clarify the location.",
                "raw_entities": raw_entities,
                "transcript": transcript
            }

        return {
            "type": "confirm",
            "intent": "assign_task",
            "message": "Please confirm the task assignment details before assigning.",
            "data": {
                "intent": "assign_task",
                "project_id": project.id,
                "title": resolved["title"] or transcript,
                "description": resolved["description"],
                "due_date": resolved["due_date"],
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
            "message": "Sorry, I couldn't recognize an actionable command. You can try: 'Create a snag for...', 'Assign task to...', or 'Show me snags in...'",
            "raw_transcript": transcript
        }


@app.post("/confirm")
def handle_confirmation(req: ConfirmRequest, db: Session = Depends(get_db)):
    """
    Handles confirmation step for data-modifying intents (create_snag, assign_task).
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
        intent = payload.get("intent")

        if not title:
            raise HTTPException(status_code=400, detail="Title is required.")

        # 1. Assign Task execution
        if intent == "assign_task":
            contractor_id = payload.get("contractor_id")
            if not contractor_id:
                raise HTTPException(status_code=400, detail="A valid contractor is required to assign a task.")

            new_task = Task(
                project_id=project_id,
                contractor_id=contractor_id,
                location_id=payload.get("location_id"),
                title=title,
                description=payload.get("description"),
                due_date=payload.get("due_date"),
                priority=payload.get("priority", "Medium"),
                status="Pending"
            )
            db.add(new_task)
            db.commit()
            db.refresh(new_task)

            return {
                "type": "created",
                "intent": "assign_task",
                "message": f"Task successfully assigned to {new_task.contractor.name}!",
                "task": {
                    "id": new_task.id,
                    "title": new_task.title,
                    "description": new_task.description,
                    "due_date": new_task.due_date,
                    "status": new_task.status,
                    "priority": new_task.priority,
                    "location": new_task.location.name if new_task.location else None,
                    "contractor": new_task.contractor.name if new_task.contractor else None,
                    "created_at": new_task.created_at.isoformat() if new_task.created_at else None
                }
            }

        # 2. Create Snag execution (default)
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
            "intent": "create_snag",
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
