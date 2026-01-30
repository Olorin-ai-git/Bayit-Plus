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
WORKDIR /app

# Copy packages first (from parent context)
COPY packages ./packages

# Copy backend code
COPY backend ./backend

# Change to backend directory for Poetry install
WORKDIR /app/backend

# Install dependencies (only main dependencies)
RUN poetry config virtualenvs.create false && \
    poetry install --only main --no-interaction --no-ansi

# Install spaCy language models for live trivia
RUN python -m spacy download en_core_web_sm

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

# Copy application code and packages
COPY --chown=bayit:bayit --from=builder /app/backend/app ./app
COPY --chown=bayit:bayit --from=builder /app/packages ./packages

# Switch to non-root user
USER bayit

# Expose port (Cloud Run uses PORT env var, default 8000 for local)
EXPOSE 8000
EXPOSE 8080

# Health check - uses PORT environment variable
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD python -c "import os, urllib.request; port = os.getenv('PORT', '8000'); urllib.request.urlopen(f'http://localhost:{port}/health')" || exit 1

# Run application - reads PORT from environment (Cloud Run sets PORT=8080)
# Falls back to 8000 for local development
CMD sh -c "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 4"
