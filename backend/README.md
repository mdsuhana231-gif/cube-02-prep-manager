# Prep Manager backend

FastAPI service for the first Prep Manager scaffold. The mock provider makes one deterministic unit-level call and never treats the synthetic CSV as Amazon ground truth.

## Run locally

```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

API docs: http://localhost:8000/docs

## Test

```powershell
cd backend
pytest
```

The current service stores captures in memory for a local demo. `schema.sql` defines the PostgreSQL-compatible shape and organization RLS boundary for the persistence phase.
