# Bayit-Plus - Claude Project Configuration

## ⚠️ CRITICAL: POETRY ONLY

**This project uses Poetry exclusively for Python dependency management.**

❌ NEVER use: `pip`, `pip3`, `venv`, `virtualenv`, `requirements.txt`
✅ ALWAYS use: `poetry add`, `poetry install`, `poetry run`

See `/POETRY_ONLY.md` for complete guide.

## Quick Commands

### Backend (Poetry)
```bash
cd backend
poetry install
poetry run uvicorn app.main:app --reload
poetry run pytest
poetry add package-name
```

### Frontend (npm)
```bash
cd web
npm install
npm run dev
```

## Project Info
- Python: 3.13.11 (required: 3.11+)
- Backend: FastAPI + Poetry
- Frontend: React + Vite + Glass components
- Database: MongoDB Atlas
- Deployment: Google Cloud Run

## Key Rules
1. Poetry only for Python (MANDATORY)
2. No mocks/TODOs in production
3. Environment variables for all config
4. Glass components only for UI
5. Tailwind CSS for styling

## Documentation
- `POETRY_ONLY.md` - Poetry usage ⭐
- `SECRETS.md` - Secrets management
- `backend/pyproject.toml` - Dependencies
