# Library Integrity Verification - Cloud Run Job
FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Poetry
RUN curl -sSL https://install.python-poetry.org | python3 - \
    && ln -s /root/.local/bin/poetry /usr/local/bin/poetry

# Set working directory
WORKDIR /app

# Copy local packages first (required dependencies)
COPY packages/bayit-voice-pipeline /packages/bayit-voice-pipeline
COPY packages/bayit-translation /packages/bayit-translation
COPY packages/olorin-core /packages/olorin-core
COPY packages/olorin-shared /packages/olorin-shared
COPY packages/python/olorin-i18n /packages/python/olorin-i18n

# Copy backend dependency files
COPY backend/pyproject.toml backend/poetry.lock ./

# Install dependencies (no dev dependencies)
RUN poetry config virtualenvs.create false \
    && poetry install --only main --no-interaction --no-ansi

# Copy backend application code
COPY backend/app ./app

# Copy scripts
COPY scripts/backend/verify_library_integrity.py ./verify_library_integrity.py

# Set Python path
ENV PYTHONPATH=/app

# Health check (optional for Cloud Run Jobs)
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD python -c "import sys; sys.exit(0)"

# Run the verification script
# Default to dry-run mode for safety, can be overridden with CMD
ENTRYPOINT ["python", "verify_library_integrity.py"]
CMD ["--dry-run", "--batch-size", "100", "--concurrency", "20"]
