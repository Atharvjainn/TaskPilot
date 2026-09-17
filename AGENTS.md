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
frontend/ (Next.js App Router, Tailwind CSS, TypeScript, Lucide Icons)
    → microphone capture (Groq Whisper / Web Speech API) → editable transcript box
    → user reviews/edits transcript, clicks Send → POST /voice to backend

backend/main.py            (FastAPI app, orchestrates everything)
    → backend/nlu.py         (transcript -> intent + raw entities, via Groq tool calling)
    → backend/resolve.py     (raw entity text -> real DB rows, via fuzzy matching)
    → backend/models.py      (SQLAlchemy schema: Project, Location, Contractor, Snag, Task)
```

No custom ML training anywhere. Intent/entity extraction is done by an
LLM (Groq: `llama-3.3-70b-versatile`) via function-calling/tool-use against schemas defined in
`nlu.py` — not a trained classifier. See the docstring at the top of
`nlu.py` for why.

## Key design decisions (don't undo these without a reason)

1. **Two-layer error correction, and only two.**
   - Layer 1: the raw transcript is shown as editable text BEFORE it's
     sent to the NLU layer (catches speech-recognition mishears).
   - Layer 2: for any data-modifying intent (`create_snag`, `assign_task`), 
     a confirmation summary is shown BEFORE writing to the DB (catches NLU/resolution mistakes).
   - Never remove either safety net or let a create/assign intent execute
     without confirmation.
   - Deliberately NOT building: per-field editing on the confirmation
     card. The recovery path for a bad match is "Cancel, edit the transcript
     phrasing, resend" — already a complete loop.

2. **Three intents supported:** `create_snag`, `assign_task`, and `search_records` (supports snags and tasks).

3. **Entities are resolved with fuzzy matching (`rapidfuzz`), not
   exact string matching.** `resolve.py`'s `MATCH_THRESHOLD` (currently
   60) controls how loose a match is accepted.

4. **Single-project demo.** `get_active_project()` in `main.py` just
   grabs the first project row. This is intentional for demo scope —
   do not build multi-project/multi-tenant logic unless asked.

## Files and what they own

| File | Owns |
|---|---|
| `backend/models.py` | DB schema + session management (Project, Location, Contractor, Snag, Task). |
| `backend/seed.py` | Demo data. Run after any schema change: `python seed.py`. Idempotent — skips if already seeded. |
| `backend/nlu.py` | The function schemas (`create_snag`, `assign_task`, `search_records`) + the Groq API call. |
| `backend/resolve.py` | Fuzzy-matching logic for locations and contractors. |
| `backend/main.py` | Request handling, voice audio transcription (Groq Whisper), confirmation flow, DB writes, status updates. |
| `frontend/` | Next.js App Router (TypeScript, Tailwind CSS, Lucide Icons), dual-mode voice capture (Whisper + Web Speech), SpeechSynthesis TTS spoken feedback, project directory badges, prompt chips, and interactive dashboard for snags and tasks. |

## How to run

### Backend
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python seed.py                       # one-time
uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```
Then open `http://localhost:3000` in Chrome or Edge.

## How to test changes

1. `python nlu.py` — sanity-checks intent extraction against hardcoded examples.
2. `http://localhost:8000/docs` — FastAPI's interactive tester.
3. Full loop: `http://localhost:3000` in Chrome, mic → edit transcript →
   send → confirm → check database.