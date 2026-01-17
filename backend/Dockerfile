# Runtime image
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq5 \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Copy dependency files
COPY requirements.txt ./

# Install dependencies
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create non-root user
RUN useradd -m -u 1000 appuser && chown -R appuser /app
USER appuser

# Cloud Run expects port 8080 by default
ENV PORT=8080
EXPOSE 8080

# Environment variables for live subtitle transcription
# Set these in Cloud Run console or gcloud command:
# Speech-to-Text Provider:
# - SPEECH_TO_TEXT_PROVIDER: "elevenlabs" (recommended), "google", or "whisper"
# - ELEVENLABS_API_KEY: Required if SPEECH_TO_TEXT_PROVIDER=elevenlabs (150ms latency)
# - OPENAI_API_KEY: Required if SPEECH_TO_TEXT_PROVIDER=whisper
# - Google Cloud credentials are auto-configured on Cloud Run
#
# Live Translation Provider:
# - LIVE_TRANSLATION_PROVIDER: "google" (recommended), "openai", or "claude"
# - Google Cloud Translate: Auto-configured with GCP credentials
# - OpenAI: Uses OPENAI_API_KEY with GPT-4o-mini
# - Claude: Uses ANTHROPIC_API_KEY

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8080/health')" || exit 1

# Start with proper signal handling
CMD exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT} --workers 2 --log-level info
