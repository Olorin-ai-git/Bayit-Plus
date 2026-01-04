# Simple Docker build for Olorin Backend Service
FROM python:3.11-slim

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    libpq-dev \
    curl \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Create application directory
WORKDIR /app

# Install Poetry
RUN pip install poetry==1.8.0

# Copy dependency files
COPY pyproject.toml poetry.lock ./

# Install dependencies (without dev dependencies, without creating venv)
RUN poetry config virtualenvs.create false && \
    poetry install --no-dev --no-root --no-interaction

# Copy application code
COPY app/ /app/app/
COPY scripts/server/main.py /app/

# Set Python path
ENV PYTHONPATH="/app"

# Expose port
EXPOSE 8090

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:${PORT:-8090}/health || exit 1

# Start command - use simple main.py with CORS middleware
CMD ["sh", "-c", "exec python -m uvicorn main:app --host 0.0.0.0 --port ${PORT:-8090} --workers 1 --access-log --log-level info"]
