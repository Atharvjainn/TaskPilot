"""
Entity resolution layer for TaskPilot.
Resolves raw entity strings from NLU to database records using fuzzy string matching.
"""

from typing import Optional, Dict, Any, List
from rapidfuzz import process, fuzz
from sqlalchemy.orm import Session
from models import Location, Contractor

MATCH_THRESHOLD = 60  # Minimum score to accept a match


def resolve_location(db: Session, project_id: int, raw_location: Optional[str]) -> Dict[str, Any]:
    """
    Fuzzy match raw location text against project's known locations.
    """
    if not raw_location or not raw_location.strip():
        return {"matched": False, "location": None, "raw": raw_location, "score": 0}

    locations = db.query(Location).filter(Location.project_id == project_id).all()
    if not locations:
        return {"matched": False, "location": None, "raw": raw_location, "score": 0}

    loc_dict = {loc.name: loc for loc in locations}
    choices = list(loc_dict.keys())

    # Try token_set_ratio which works well for partial/reordered matches
    best_match = process.extractOne(
        raw_location,
        choices,
        scorer=fuzz.token_set_ratio,
        score_cutoff=MATCH_THRESHOLD
    )

    if best_match:
        matched_name, score, _ = best_match
        return {
            "matched": True,
            "location": loc_dict[matched_name],
            "raw": raw_location,
            "score": score
        }

    return {"matched": False, "location": None, "raw": raw_location, "score": 0}


def resolve_contractor(db: Session, project_id: int, raw_contractor: Optional[str]) -> Dict[str, Any]:
    """
    Fuzzy match raw contractor text against contractor names and trades.
    """
    if not raw_contractor or not raw_contractor.strip():
        return {"matched": False, "contractor": None, "raw": raw_contractor, "score": 0}

    contractors = db.query(Contractor).filter(Contractor.project_id == project_id).all()
    if not contractors:
        return {"matched": False, "contractor": None, "raw": raw_contractor, "score": 0}

    # Map both trade and name to the contractor object
    choices_to_contractor: Dict[str, Contractor] = {}
    for c in contractors:
        choices_to_contractor[c.name] = c
        choices_to_contractor[c.trade] = c
        # Also allow combined "Trade Contractor" e.g., "Plumbing Contractor"
        choices_to_contractor[f"{c.trade} Contractor"] = c

    choices = list(choices_to_contractor.keys())

    best_match = process.extractOne(
        raw_contractor,
        choices,
        scorer=fuzz.token_set_ratio,
        score_cutoff=MATCH_THRESHOLD
    )

    if best_match:
        matched_choice, score, _ = best_match
        return {
            "matched": True,
            "contractor": choices_to_contractor[matched_choice],
            "raw": raw_contractor,
            "score": score
        }

    return {"matched": False, "contractor": None, "raw": raw_contractor, "score": 0}


def resolve_entities(db: Session, project_id: int, raw_entities: Dict[str, Any]) -> Dict[str, Any]:
    """
    Resolves both location and contractor raw entities.
    """
    loc_res = resolve_location(db, project_id, raw_entities.get("location"))
    contr_res = resolve_contractor(db, project_id, raw_entities.get("contractor"))

    return {
        "title": raw_entities.get("title", ""),
        "description": raw_entities.get("description", ""),
        "priority": raw_entities.get("priority", "Medium"),
        "location": {
            "matched": loc_res["matched"],
            "id": loc_res["location"].id if loc_res["location"] else None,
            "name": loc_res["location"].name if loc_res["location"] else None,
            "raw": loc_res["raw"],
            "score": loc_res["score"]
        },
        "contractor": {
            "matched": contr_res["matched"],
            "id": contr_res["contractor"].id if contr_res["contractor"] else None,
            "name": contr_res["contractor"].name if contr_res["contractor"] else None,
            "trade": contr_res["contractor"].trade if contr_res["contractor"] else None,
            "raw": contr_res["raw"],
            "score": contr_res["score"]
        }
    }
