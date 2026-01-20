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

# ❌ WRONG - Never activate venv manually
source venv/bin/activate
```

## ✅ CORRECT: Use Poetry Commands

### Installing Dependencies

```bash
# Install all dependencies from poetry.lock
poetry install

# Install only production dependencies (no dev dependencies)
poetry install --no-dev

# Install with all extras
poetry install --all-extras

# Update dependencies
poetry update

# Add a new dependency
poetry add package-name

# Add a development dependency
poetry add --group dev package-name
```

### Running Python Code

```bash
# Run Python script with Poetry
poetry run python script.py

# Run application
poetry run uvicorn app.main:app --reload

# Run pytest
poetry run pytest

# Run any command in Poetry environment
poetry run <command>
```

### Managing Environment

```bash
# Show environment info
poetry env info

# List available environments
poetry env list

# Use specific Python version
poetry env use python3.13

# Remove environment
poetry env remove python3.13

# Activate shell (if you must)
poetry shell
```

### Package Management

```bash
# Show installed packages
poetry show

# Show dependency tree
poetry show --tree

# Show outdated packages
poetry show --outdated

# Remove a package
poetry remove package-name
```

## Why Poetry Only?

1. **Lock File**: `poetry.lock` ensures reproducible builds
2. **Dependency Resolution**: Poetry resolves conflicts automatically
3. **Virtual Environments**: Poetry manages virtualenvs automatically
4. **Project Isolation**: Each project has its own isolated environment
5. **Modern Workflow**: Poetry is the modern Python packaging standard

## Common Tasks

### Task: Install a new package

```bash
# ❌ WRONG
pip install requests

# ✅ CORRECT
poetry add requests
```

### Task: Run tests

```bash
# ❌ WRONG
python -m pytest
pip install pytest
pytest

# ✅ CORRECT
poetry run pytest
```

### Task: Run linters

```bash
# ❌ WRONG
pip install black
black .

# ✅ CORRECT
poetry run black .
poetry run isort .
poetry run mypy .
```

### Task: Start development server

```bash
# ❌ WRONG
python -m uvicorn app.main:app

# ✅ CORRECT
poetry run uvicorn app.main:app --reload
```

### Task: Run Python REPL

```bash
# ❌ WRONG
python
python3

# ✅ CORRECT
poetry run python
```

### Task: Check package versions

```bash
# ❌ WRONG
pip list
pip freeze

# ✅ CORRECT
poetry show
poetry show --tree
```

## Pre-commit Hooks with Poetry

Pre-commit hooks automatically run in Poetry environment when configured correctly:

```yaml
# .pre-commit-config.yaml
repos:
  - repo: local
    hooks:
      - id: pytest
        name: pytest
        entry: poetry run pytest
        language: system
        pass_filenames: false
```

## CI/CD with Poetry

```yaml
# .github/workflows/test.yml
steps:
  - name: Install Poetry
    run: curl -sSL https://install.python-poetry.org | python3 -

  - name: Install dependencies
    run: poetry install

  - name: Run tests
    run: poetry run pytest

  - name: Run linters
    run: |
      poetry run black --check .
      poetry run isort --check .
      poetry run mypy .
```

## Docker with Poetry

```dockerfile
FROM python:3.13-slim

# Install Poetry
RUN pip install poetry

WORKDIR /app

# Copy dependency files
COPY pyproject.toml poetry.lock ./

# Install dependencies (without virtualenv in Docker)
RUN poetry config virtualenvs.create false && \
    poetry install --no-dev

# Copy application
COPY . .

# Run with Poetry
CMD ["poetry", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0"]
```

## Troubleshooting

### "ModuleNotFoundError" when running code

```bash
# ❌ WRONG - Don't install with pip
pip install missing-module

# ✅ CORRECT - Add to Poetry
poetry add missing-module
```

### "Command not found" error

```bash
# Make sure you're using poetry run
poetry run <command>

# Or enter Poetry shell
poetry shell
<command>
```

### Poetry environment issues

```bash
# Remove and recreate environment
poetry env remove python3.13
poetry env use python3.13
poetry install
```

## Backend Development Workflow

```bash
# 1. Navigate to backend
cd backend

# 2. Install dependencies
poetry install

# 3. Run development server
poetry run uvicorn app.main:app --reload

# 4. Run tests
poetry run pytest

# 5. Run linters
poetry run black .
poetry run isort .
poetry run mypy .

# 6. Add new dependency
poetry add fastapi
poetry add --group dev pytest

# 7. Update dependencies
poetry update
```

## When You See pip/venv in Documentation

If you see instructions using pip or venv, **translate to Poetry**:

| Old (pip/venv)                    | New (Poetry)                      |
| --------------------------------- | --------------------------------- |
| `pip install requests`            | `poetry add requests`             |
| `pip install -r requirements.txt` | `poetry install`                  |
| `python -m venv env`              | Poetry handles this automatically |
| `source env/bin/activate`         | `poetry shell` or `poetry run`    |
| `pip list`                        | `poetry show`                     |
| `pip freeze`                      | `poetry show --tree`              |
| `python script.py`                | `poetry run python script.py`     |
| `pytest`                          | `poetry run pytest`               |

## Integration with Pre-commit

Pre-commit hooks automatically use Poetry environment:

```bash
# Install pre-commit
poetry add --group dev pre-commit

# Install hooks
poetry run pre-commit install

# Run hooks manually
poetry run pre-commit run --all-files
```

## Summary

✅ **ALWAYS use Poetry** for:

- Installing packages
- Running Python code
- Managing environments
- Development workflow
- CI/CD pipelines

❌ **NEVER use**:

- pip/pip3
- venv/virtualenv
- requirements.txt
- Manual environment activation

## Questions?

See [Poetry Documentation](https://python-poetry.org/docs/) for more details.

For project-specific questions, see `backend/README.md` or ask the team.

---

**Remember: If you're typing `pip` or `venv`, you're doing it wrong!** 🚫

Use Poetry. Always. Everywhere. 🎯
