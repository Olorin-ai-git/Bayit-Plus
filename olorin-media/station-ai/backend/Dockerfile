FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy shared packages first (from parent context)
COPY packages/olorin-shared /app/packages/olorin-shared

# Copy requirements and install dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install olorin-shared package
RUN pip install --no-cache-dir /app/packages/olorin-shared

# Copy application code
COPY backend/app/ ./app/

# Create cache directory
RUN mkdir -p ./cache

# Cloud Run uses PORT env variable (default 8080)
ENV PORT=8080

# Run uvicorn with the PORT from environment
CMD exec uvicorn app.main:app --host 0.0.0.0 --port $PORT
