# TaskPilot

A voice-to-command layer for construction/interior project software. Instead of navigating menus to log a site issue, a user speaks a command — *"Create a snag for the master bathroom ceiling, assign it to the false-ceiling contractor"* — and the system understands the intent, resolves the details against real project data, confirms with the user, and executes it.

Built for the ArchScale hackathon (problem statement AS-03).

## How it works

1. **Capture** — the frontend records voice via Groq Whisper or the Web Speech API and shows an editable transcript.
2. **Understand** — the transcript is sent to the backend, where an LLM (Groq `llama-3.3-70b-versatile`) extracts intent + entities via function calling.
3. **Resolve** — raw entity text (location names, contractor names) is fuzzy-matched (`rapidfuzz`) against real DB rows.
4. **Confirm** — any data-modifying intent (`create_snag`, `assign_task`) shows a confirmation summary before writing to the database.
5. **Execute** — on confirmation, the backend writes to the DB and the frontend gives spoken feedback via SpeechSynthesis.

Supported intents: `create_snag`, `assign_task`, `search_records` (snags and tasks).

## Architecture

```
frontend/   Next.js App Router (TypeScript, Tailwind CSS, Lucide Icons)
            mic capture → editable transcript → POST /voice → dashboard

backend/main.py     FastAPI app, orchestrates everything
    → backend/nlu.py       transcript -> intent + raw entities (Groq tool calling)
    → backend/resolve.py   raw entity text -> real DB rows (fuzzy matching)
    → backend/models.py    SQLAlchemy schema: Project, Location, Contractor, Snag, Task
```

## Tech stack

- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS 4
- **Backend:** FastAPI, SQLAlchemy, Groq (LLM + Whisper), rapidfuzz
- **Database:** SQLite by default, Postgres-ready (`psycopg2-binary` included)

## Prerequisites

- Node.js 18+
- Python 3.10+
- A [Groq API key](https://console.groq.com/keys)

## Local setup

### Backend

```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
```

Create a `.env` file in `backend/`:

```env
GROQ_API_KEY=your_groq_api_key
# optional overrides
GROQ_MODEL=llama-3.3-70b-versatile
DATABASE_URL=sqlite:///voice_project.db
```

Seed demo data and start the server:

```bash
python seed.py                       # one-time, idempotent
uvicorn main:app --reload --port 8000
```

API docs: `http://localhost:8000/docs`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000` in Chrome or Edge (needed for Web Speech API mic support).

Optionally set the backend URL explicitly in `frontend/.env.local`:

```env
NEXT_PUBLIC_API_BASE=http://localhost:8000
```

If unset, the frontend defaults to `http://localhost:8000`.

## Testing changes

- `python nlu.py` — sanity-checks intent extraction against hardcoded examples.
- `http://localhost:8000/docs` — FastAPI's interactive tester.
- Full loop: open `http://localhost:3000` in Chrome, mic → edit transcript → send → confirm → check database.

## Notes

- This is a single-project demo (`get_active_project()` grabs the first project row) — not multi-tenant.
- Voice transcription needs a browser that supports the Web Speech API (Chrome/Edge) for the non-Whisper path.