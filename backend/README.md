# Bayit+ Backend

FastAPI service for the Bayit+ (בית פלוס) Jewish streaming platform: Live TV,
VOD, Radio, Podcasts, Audiobooks, the Beta 500 AI credits program, and the
Olorin AI training/knowledge layer.

- Stack: FastAPI, MongoDB (Beanie ODM), Poetry, Python 3.11+
- The API MUST run on port 8000 (Vite proxy, CI, and docs depend on it).

## Quick start

```bash
poetry install
poetry run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

## Tests and quality gates

From the repository root:

```bash
scripts/ci/full-battery.sh backend   # pytest with coverage
scripts/ci/tighten.sh --backend-only # black / isort / mypy
scripts/ci/smoke-test.sh --backend-only
```

## Layout

```
app/
  api/        API routes (partner + super-admin surfaces)
  models/     Beanie ODM documents
  services/   Business logic (training/knowledge, dubbing, live, etc.)
  core/       Config, database, security
scripts/      Operational and maintenance scripts
tests/        Pytest suite
```

See the repository root `CLAUDE.md` for platform-wide rules and
`docs/` for feature and deployment guides.
