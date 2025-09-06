# Multi-stage Docker build for Olorin Backend Service - Optimized for Production
# Build arguments for flexible configuration
ARG PYTHON_VERSION=3.11
ARG POETRY_VERSION=1.8.0
ARG APP_ENV=production
ARG WORKERS=1

# Stage 1: Base image with common system dependencies
FROM python:${PYTHON_VERSION}-slim AS base
ARG POETRY_VERSION

# Set environment variables for build optimization
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONHASHSEED=random \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Install system dependencies in single layer
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    libpq-dev \
    curl \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# Stage 2: Poetry dependency resolver and installer
FROM base AS poetry-deps
ARG POETRY_VERSION
ARG APP_ENV

# Install Poetry with specific version
RUN pip install --no-cache-dir poetry==${POETRY_VERSION}

# Configure Poetry for production builds
ENV POETRY_NO_INTERACTION=1 \
    POETRY_VENV_IN_PROJECT=1 \
    POETRY_CACHE_DIR=/tmp/poetry_cache

# Copy dependency files (separate layer for better caching)
COPY pyproject.toml poetry.lock ./

# Install dependencies based on environment
RUN if [ "$APP_ENV" = "development" ]; then \
        poetry install --no-root; \
    else \
        poetry install --no-dev --no-root; \
    fi && \
    rm -rf /tmp/poetry_cache

# Stage 3: Application runtime image
FROM python:${PYTHON_VERSION}-slim AS runner
ARG APP_ENV
ARG WORKERS

# Install only runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev \
    curl \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/* \
    && groupadd -r olorin \
    && useradd -r -g olorin -s /bin/bash -m olorin

# Copy Python packages from poetry-deps stage
COPY --from=poetry-deps /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=poetry-deps /usr/local/bin /usr/local/bin

# Create application directory with proper permissions
WORKDIR /app
RUN mkdir -p /app/logs /app/uploads /app/reports /usr/share/fonts/truetype/ \
    && chown -R olorin:olorin /app /usr/share/fonts/truetype/

# Copy application code with proper ownership
COPY --chown=olorin:olorin app/ /app/app/
COPY --chown=olorin:olorin main.py simple_main.py /app/

# Switch to non-root user for security
USER olorin

# Set optimized environment variables
ENV PYTHONPATH="/app" \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    ENVIRONMENT=${APP_ENV} \
    WORKERS=${WORKERS}

# Expose port (configurable via Cloud Run)
EXPOSE 8090

# Enhanced health check with timeout and proper error handling
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:${PORT:-8090}/health || exit 1

# Optimized startup command with configurable workers
CMD ["sh", "-c", "exec python -m uvicorn main:app --host 0.0.0.0 --port ${PORT:-8090} --workers ${WORKERS:-1} --access-log --log-level info"]
