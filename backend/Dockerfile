# =============================================================================
# Multi-stage Dockerfile for Bayit+ Backend
# Optimized for smaller image size and faster cold starts
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Builder - Install dependencies and export requirements
# -----------------------------------------------------------------------------
FROM python:3.11-slim AS builder

WORKDIR /build

# Install Poetry in builder stage
ENV POETRY_HOME=/opt/poetry
ENV POETRY_VERSION=1.8.0
ENV PATH="$POETRY_HOME/bin:$PATH"
RUN pip install --no-cache-dir poetry==${POETRY_VERSION}

# Copy dependency files
COPY pyproject.toml poetry.lock ./

# Export requirements to a file (without dev dependencies)
RUN poetry export -f requirements.txt --output requirements.txt --without-hashes --only main

# -----------------------------------------------------------------------------
# Stage 2: Runtime - Minimal production image
# -----------------------------------------------------------------------------
FROM python:3.11-slim AS runtime

WORKDIR /app

# Install only runtime system dependencies (no build tools)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Copy requirements from builder
COPY --from=builder /build/requirements.txt .

# Install Python dependencies (no Poetry needed at runtime)
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY app/ ./app/

# Create non-root user for security
RUN useradd -m -u 1000 appuser && chown -R appuser /app
USER appuser

# Cloud Run expects port 8080 by default
ENV PORT=8080
EXPOSE 8080

# Environment documentation for Cloud Run configuration:
# Speech-to-Text Provider:
# - SPEECH_TO_TEXT_PROVIDER: "elevenlabs" (recommended), "google", or "whisper"
# - ELEVENLABS_API_KEY: Required if SPEECH_TO_TEXT_PROVIDER=elevenlabs
# - OPENAI_API_KEY: Required if SPEECH_TO_TEXT_PROVIDER=whisper
#
# Live Translation Provider:
# - LIVE_TRANSLATION_PROVIDER: "google" (recommended), "openai", or "claude"

# Health check for container orchestration
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -sf http://localhost:8080/health || exit 1

# Start with proper signal handling for graceful shutdown
CMD exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT} --workers 2 --log-level info
