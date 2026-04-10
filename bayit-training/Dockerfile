# Multi-stage build for Olorin Training Service (overlay pattern).
#
# Strategy: Install deps from the backend's pyproject.toml, then merge
# the backend's app/ as base with the service's app/main.py and
# app/api/router_registry.py overlaid on top.
FROM python:3.11-slim AS builder

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

RUN curl -sSL https://install.python-poetry.org | python3 - && \
    ln -s /root/.local/bin/poetry /usr/local/bin/poetry

WORKDIR /app

COPY packages ./packages
COPY backend ./backend

WORKDIR /app/backend
# Strip GPU/ML deps (torch, CUDA) that the training service does not need.
# Pin beanie to 2.0.x to stay compatible with motor 3.x.
RUN sed -i '/demucs/d; /torchcodec/d; /spacy/d' pyproject.toml && \
    sed -i 's/beanie (>=2.0.1,<3.0.0)/beanie (>=2.0.1,<2.1.0)/' pyproject.toml && \
    rm -f poetry.lock && \
    poetry config virtualenvs.create false && \
    poetry install --only main --no-interaction --no-ansi

FROM python:3.11-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg curl unzip libgl1 libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Deno — required by yt-dlp for YouTube JS extraction
RUN curl -fsSL https://deno.land/install.sh | DENO_INSTALL=/usr/local sh

RUN useradd -m -u 1000 bayit && \
    mkdir -p /app && \
    chown -R bayit:bayit /app

WORKDIR /app

COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

COPY --chown=bayit:bayit --from=builder /app/packages/bayit-voice-pipeline ./packages/bayit-voice-pipeline
COPY --chown=bayit:bayit --from=builder /app/packages/bayit-translation ./packages/bayit-translation
COPY --chown=bayit:bayit --from=builder /app/packages/olorin-core ./packages/olorin-core
COPY --chown=bayit:bayit --from=builder /app/packages/olorin-shared ./packages/olorin-shared
COPY --chown=bayit:bayit --from=builder /app/packages/python/olorin-i18n ./packages/python/olorin-i18n
COPY --chown=bayit:bayit --from=builder /app/packages/olorin-email ./packages/olorin-email

# Layer 1: Full monolith app/ as base
COPY --chown=bayit:bayit --from=builder /app/backend/app ./app

# Layer 2: Overlay training service files
COPY --chown=bayit:bayit bayit-training/app/main.py ./app/main.py
COPY --chown=bayit:bayit bayit-training/app/api/router_registry.py ./app/api/router_registry.py

COPY --chown=bayit:bayit shared/i18n/locales ./shared/i18n/locales

USER bayit

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
    CMD python -c "import os, urllib.request; port = os.getenv('PORT', '8080'); urllib.request.urlopen(f'http://localhost:{port}/health')" || exit 1

CMD sh -c "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080} --workers 2"
