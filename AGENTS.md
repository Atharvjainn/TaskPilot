# AGENTS.md

Context file for any AI coding agent (or future-me) working on this repo.
Read this before making changes.

## What this project is

A voice-to-command layer for construction/interior project software.
Instead of navigating menus to log a site issue, a user speaks a command
("Create a snag for the master bathroom ceiling, assign it to the
false-ceiling contractor") and the system understands the intent,
resolves the details against real project data, confirms with the user,
and executes it.

Built for the ArchScale hackathon, problem statement AS-03.

## Architecture (read in this order to understand the system)

```
frontend/index.html
    → browser Web Speech API captures voice → editable transcript box
    → user reviews/edits transcript, clicks Send → POST /voice to backend

backend/main.py            (FastAPI app, orchestrates everything)
    → backend/nlu.py         (transcript -> intent + raw entities, via Gemini function calling)
    → backend/resolve.py     (raw entity text -> real DB rows, via fuzzy matching)
    → backend/models.py      (SQLAlchemy schema: Project, Location, Contractor, Snag)
```

No custom ML training anywhere. Intent/entity extraction is done by an
LLM (Gemini) via function-calling/tool-use against schemas defined in
`nlu.py` — not a trained classifier. See the docstring at the top of
`nlu.py` for why.

## Key design decisions (don't undo these without a reason)

1. **Two-layer error correction, and only two.**
   - Layer 1: the raw transcript is shown as editable text BEFORE it's
     sent to the NLU layer (catches speech-recognition mishears).
   - Layer 2: for any data-modifying intent (currently only
     `create_snag`), a confirmation summary is shown BEFORE writing to
     the DB (catches NLU/resolution mistakes).
   - Never remove either safety net or let a create-type intent execute
     without confirmation.
   - Deliberately NOT building: per-field editing on the confirmation
     card (e.g. a dropdown to override a wrongly-matched contractor).
     The recovery path for a bad match is "Cancel, edit the transcript
     phrasing, resend" — already a complete loop. Field-level editing
     would need new list endpoints, more frontend state, and more
     surface area to test, for marginal benefit over an already-
     recoverable failure mode. Do not add this unless everything else
     is done and there's spare time before the deadline.

2. **Two intents only, by design:** `create_snag` and `search_snags`.
   Do not add more without updating this file and re-testing the
   existing two — scope was deliberately kept tight for a solo build.

3. **Entities are resolved with fuzzy matching (`rapidfuzz`), not
   exact string matching.** `resolve.py`'s `MATCH_THRESHOLD` (currently
   60) controls how loose a match is accepted. If lowering this,
   re-test against the seeded contractor/location names for false
   positives.

4. **Single-project demo.** `get_active_project()` in `main.py` just
   grabs the first project row. This is intentional for demo scope —
   do not build multi-project/multi-tenant logic unless asked.

## Files and what they own

| File | Owns |
|---|---|
| `backend/models.py` | DB schema + session management. Change here if adding new entity types. |
| `backend/seed.py` | Demo data. Run after any schema change: `python seed.py`. Idempotent — skips if already seeded. |
| `backend/nlu.py` | The function schemas (source of truth for what the system can do) + the Gemini API call. Change here to add a new intent or fix bad entity extraction. |
| `backend/resolve.py` | Fuzzy-matching logic. Change here if location/contractor matching is too strict/loose. |
| `backend/main.py` | Request handling, confirmation flow, DB writes. Change here to add a new intent's execution logic. |
| `frontend/index.html` | Single-page vanilla JS/HTML frontend, no build step. Talks to `http://localhost:8000`. Owns the editable-transcript-before-send flow. |

## How to run

```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
export GEMINI_API_KEY=your_key_here
python seed.py                       # one-time
uvicorn main:app --reload --port 8000
```
Then open `frontend/index.html` directly in Chrome (Web Speech API
requires Chrome/Edge, not Firefox).

## How to test changes

1. `python nlu.py` — sanity-checks intent extraction against 3 hardcoded
   examples. Run this FIRST after touching `nlu.py`'s schema.
2. `http://localhost:8000/docs` — FastAPI's interactive tester. Use
   `POST /voice` directly with a raw transcript before testing via
   voice/frontend — isolates backend bugs from browser/mic issues.
3. Full loop: `frontend/index.html` in Chrome, mic → edit transcript →
   send → confirm → check `voice_project.db` for the new row
   (`sqlite3 voice_project.db "SELECT * FROM snags;"`).

Minimum manual test checklist before any demo:
- Happy path create (`create_snag`, clean phrasing, exact location/contractor)
- Happy path search (`search_snags`, filtered by location or contractor)
- Ambiguous/unmatched location → should return `type: "clarify"`, not crash
- Cancel on a confirmation → should return `type: "cancelled"`, no DB write
- Transcript edit → resend with corrected text → confirms correctly

## Known constraints / non-goals

- No multi-user auth, no multi-tenant support — single demo project only.
- No offline STT — depends on Chrome's Web Speech API (requires internet).
- No `assign_task` intent yet (was scoped out for solo build time; the
  pattern for adding it is: add a tool to `nlu.py`, a resolver if needed,
  and a handler in `main.py`, following `create_snag` as the template).
- No per-field editing on the confirmation card (see design decision #1).
- No real Meta/WhatsApp/project-software integration — this is a
  standalone prototype with a seeded SQLite DB standing in for a real
  project management backend.