# Olorin.ai Platform Backend Dockerfile
# Deploys the Olorin-specific FastAPI application independently from Bayit+ backend

FROM python:3.11-slim AS base

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install Poetry
RUN pip install --no-cache-dir poetry==2.1.1

# Set working directory
WORKDIR /app

# Copy Poetry configuration
COPY ../backend/pyproject.toml ../backend/poetry.lock* ./

# Configure Poetry to not create virtual environment in Docker
RUN poetry config virtualenvs.create false

# Install dependencies (production only, no dev dependencies)
RUN poetry install --no-interaction --no-ansi --no-dev

# Copy application code from main backend
COPY ../backend/app ./app

# Copy packages (Olorin packages are installed via Poetry)
COPY ../packages /packages

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV ENVIRONMENT=production
ENV PORT=8080

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

# Run Olorin FastAPI application
CMD ["poetry", "run", "uvicorn", "app.olorin_main:app", "--host", "0.0.0.0", "--port", "8080"]
