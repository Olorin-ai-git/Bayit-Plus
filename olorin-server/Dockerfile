# Multi-stage build for Olorin Backend Service
FROM python:3.11-slim AS poetry-deps

# Install system dependencies required for Python packages
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Poetry
RUN pip install poetry==1.8.0
COPY pyproject.toml poetry.lock ./
RUN poetry config virtualenvs.create false \
    && poetry install --no-dev --no-root

# Production stage
FROM python:3.11-slim AS runner

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd -r olorin \
    && useradd -r -g olorin -s /bin/bash olorin

# Copy Python packages from poetry-deps stage
COPY --from=poetry-deps /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=poetry-deps /usr/local/bin /usr/local/bin

# Set working directory
WORKDIR /app

# Copy application code
COPY --chown=olorin:olorin . .

# Create fonts directory (PDF fonts will be installed if needed at runtime)
RUN mkdir -p /usr/share/fonts/truetype/

# Create necessary directories
RUN mkdir -p /app/logs /app/uploads /app/reports \
    && chown -R olorin:olorin /app

# Switch to non-root user
USER olorin

# Set Python path and environment variables
ENV PYTHONPATH="/app:$PYTHONPATH"
ENV PYTHONUNBUFFERED=1
ENV ENVIRONMENT=production

# Expose port (will be set by Cloud Run via PORT env var, defaults to 8000)
EXPOSE ${PORT:-8000}

# Health check (use PORT env var, default to 8000)
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:${PORT:-8000}/health || exit 1

# Command to run the application (use PORT env var, default to 8000)
# Start with single worker for debugging startup issues
CMD ["sh", "-c", "echo 'Starting on port ${PORT:-8000}' && python -m uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1 --log-level info"]
