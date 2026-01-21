# Poetry-Only Policy - Bayit-Plus

## ⚠️ CRITICAL: Use ONLY Poetry for Python Dependency Management

This project uses **Poetry exclusively** for all Python dependency management. Never use pip, venv, or virtualenv directly.

## ❌ FORBIDDEN Commands

**NEVER use these commands:**

```bash
# ❌ WRONG - Never use pip
pip install package
pip3 install package
python -m pip install package

# ❌ WRONG - Never use venv
python -m venv env_name
virtualenv env_name

# ❌ WRONG - Never use requirements.txt
pip install -r requirements.txt
pip freeze > requirements.txt
```

## ✅ CORRECT: Use Poetry Commands

### Installing Dependencies

```bash
poetry install              # Install all dependencies
poetry add package-name     # Add new package
poetry add --group dev pytest  # Add dev dependency
poetry update              # Update dependencies
```

### Running Python Code

```bash
poetry run python script.py
poetry run uvicorn app.main:app --reload
poetry run pytest
poetry run black .
```

### Managing Environment

```bash
poetry env info            # Show environment info
poetry env use python3.13  # Use specific Python
poetry show                # Show packages
poetry show --tree         # Show dependency tree
```

## Common Tasks

| Task | ❌ WRONG | ✅ CORRECT |
|------|---------|-----------|
| Install package | `pip install requests` | `poetry add requests` |
| Run tests | `python -m pytest` | `poetry run pytest` |
| Run server | `python -m uvicorn app.main:app` | `poetry run uvicorn app.main:app --reload` |
| Run Python | `python script.py` | `poetry run python script.py` |
| Show packages | `pip list` | `poetry show` |

## Why Poetry Only?

1. **Lock File**: `poetry.lock` ensures reproducible builds
2. **Dependency Resolution**: Automatic conflict resolution
3. **Virtual Environments**: Managed automatically
4. **Modern Standard**: Industry best practice

## Backend Workflow

```bash
cd backend
poetry install                           # Install dependencies
poetry run uvicorn app.main:app --reload  # Run server
poetry run pytest                        # Run tests
poetry run black .                       # Format code
poetry add new-package                   # Add package
```

---

**Remember: If you're typing `pip` or `venv`, you're doing it wrong!** 🚫

Use Poetry. Always. Everywhere. 🎯
