# Olorin.ai Platform Backend Dockerfile
# Deploys the Olorin-specific FastAPI application independently from Bayit+ backend

FROM python:3.11-slim AS base

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq5 \
    ffmpeg \
    curl \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install Poetry
RUN pip install --no-cache-dir poetry==2.1.1

# Set working directory
WORKDIR /app

# Copy Olorin packages FIRST (needed by Poetry dependencies)
COPY packages /packages

# Copy Poetry configuration from backend directory
COPY backend/pyproject.toml backend/poetry.lock* ./

# Convert absolute file paths to relative paths for Docker build
RUN sed -i 's|file:///Users/olorin/Documents/Bayit-Plus/packages|file:///packages|g' pyproject.toml

# Configure Poetry to not create virtual environment in Docker
RUN poetry config virtualenvs.create false

# Install dependencies
RUN poetry install --no-interaction --no-ansi

# Copy application code from main backend
COPY backend/app ./app

# Create non-root user (security best practice)
RUN useradd -m -u 1000 appuser && chown -R appuser /app
USER appuser

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    ENVIRONMENT=production \
    PORT=8080

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

# Run Olorin FastAPI application
CMD ["uvicorn", "app.olorin_main:app", "--host", "0.0.0.0", "--port", "8080", "--workers", "2"]
