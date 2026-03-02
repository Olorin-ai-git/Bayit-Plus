# Multi-stage build for Bayit+ Admin Service (overlay pattern).
#
# Strategy: Install deps from the backend's pyproject.toml (has everything
# the admin routes need), then merge the backend's app/ as base with the
# admin service's overlay files on top.
#
# No media processing deps (admin doesn't need ffmpeg/xvfb).
FROM python:3.11-slim AS builder

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install Poetry
RUN curl -sSL https://install.python-poetry.org | python3 - && \
    ln -s /root/.local/bin/poetry /usr/local/bin/poetry

WORKDIR /app

# Copy monorepo packages (path dependencies used by backend)
COPY packages ./packages

# Copy monolith backend (source of all shared deps and app code)
COPY backend ./backend

# Install backend deps (includes everything admin routes need)
WORKDIR /app/backend
RUN poetry config virtualenvs.create false && \
    poetry install --only main --no-interaction --no-ansi

# Production stage (slim - no media processing deps)
FROM python:3.11-slim

# Create non-root user
RUN useradd -m -u 1000 bayit && \
    mkdir -p /app && \
    chown -R bayit:bayit /app

WORKDIR /app

# Copy installed packages from builder
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy Python path-dependency packages (editable installs reference /app/packages/)
# Only the 6 packages used by backend, not the full packages/ dir (avoids node_modules)
COPY --chown=bayit:bayit --from=builder /app/packages/bayit-voice-pipeline ./packages/bayit-voice-pipeline
COPY --chown=bayit:bayit --from=builder /app/packages/bayit-translation ./packages/bayit-translation
COPY --chown=bayit:bayit --from=builder /app/packages/olorin-core ./packages/olorin-core
COPY --chown=bayit:bayit --from=builder /app/packages/olorin-shared ./packages/olorin-shared
COPY --chown=bayit:bayit --from=builder /app/packages/python/olorin-i18n ./packages/python/olorin-i18n
COPY --chown=bayit:bayit --from=builder /app/packages/olorin-email ./packages/olorin-email

# Layer 1: Copy the full backend app/ as the base (core, models, services, routes)
COPY --chown=bayit:bayit --from=builder /app/backend/app ./app

# Layer 2: Overlay admin service files on top (main.py, api/router_registry.py, api/service_models.py)
COPY --chown=bayit:bayit bayit-admin/app/main.py ./app/main.py
COPY --chown=bayit:bayit bayit-admin/app/api/router_registry.py ./app/api/router_registry.py
COPY --chown=bayit:bayit bayit-admin/app/api/service_models.py ./app/api/service_models.py

# Copy shared i18n locales
COPY --chown=bayit:bayit shared/i18n/locales ./shared/i18n/locales

USER bayit

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
    CMD python -c "import os, urllib.request; port = os.getenv('PORT', '8080'); urllib.request.urlopen(f'http://localhost:{port}/health')" || exit 1

# Admin service - 2 workers (low traffic, handles ~170 REST endpoints)
CMD sh -c "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080} --workers 2"
