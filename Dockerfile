# Multi-stage build for Bayit+ FastAPI backend
FROM python:3.11-slim as builder

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install Poetry
RUN curl -sSL https://install.python-poetry.org | python3 - && \
    ln -s /root/.local/bin/poetry /usr/local/bin/poetry

# Set working directory
WORKDIR /build

# Copy local packages first
COPY packages /build/packages

# Copy backend directory
COPY backend /build/backend

# Install dependencies from backend directory (includes local packages as editable)
WORKDIR /build/backend
RUN poetry config virtualenvs.create false && \
    poetry install --only main --no-interaction --no-ansi

# Production stage
FROM python:3.11-slim

# Install runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN useradd -m -u 1000 bayit && \
    mkdir -p /app && \
    chown -R bayit:bayit /app

WORKDIR /app

# Copy installed packages from builder
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy local package source directories (needed for editable installs)
COPY --from=builder /build/packages /app/packages

# Copy application code
COPY --chown=bayit:bayit backend/app ./app

# Switch to non-root user
USER bayit

# Expose port (Cloud Run uses PORT env var)
EXPOSE 8000

# Run application (use PORT env var, default to 8000 for local dev)
CMD sh -c "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 4"
