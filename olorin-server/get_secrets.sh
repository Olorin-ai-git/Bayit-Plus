#!/bin/bash

# Retrieve secrets from Firebase using Firebase CLI
echo "Retrieving secrets from Firebase..."

# Get all required secrets
export JWT_SECRET_KEY=$(firebase functions:secrets:access JWT_SECRET_KEY --project olorin-ai 2>/dev/null)
export ANTHROPIC_API_KEY=$(firebase functions:secrets:access ANTHROPIC_API_KEY --project olorin-ai 2>/dev/null)
export OPENAI_API_KEY=$(firebase functions:secrets:access OPENAI_API_KEY --project olorin-ai 2>/dev/null)
export OLORIN_API_KEY=$(firebase functions:secrets:access OLORIN_API_KEY --project olorin-ai 2>/dev/null)
export DATABASE_PASSWORD=$(firebase functions:secrets:access DATABASE_PASSWORD --project olorin-ai 2>/dev/null)
export REDIS_API_KEY=$(firebase functions:secrets:access REDIS_API_KEY --project olorin-ai 2>/dev/null)
export SPLUNK_USERNAME=$(firebase functions:secrets:access SPLUNK_USERNAME --project olorin-ai 2>/dev/null)
export SPLUNK_PASSWORD=$(firebase functions:secrets:access SPLUNK_PASSWORD --project olorin-ai 2>/dev/null)

# Check if critical secrets were retrieved
if [ -z "$JWT_SECRET_KEY" ]; then
    echo "Warning: JWT_SECRET_KEY not found, generating a temporary one"
    export JWT_SECRET_KEY=$(openssl rand -base64 64)
fi

if [ -z "$ANTHROPIC_API_KEY" ]; then
    echo "Warning: ANTHROPIC_API_KEY not found"
fi

echo "Secrets loaded. Starting server..."

# Start the server with the loaded secrets
poetry run python -m app.local_server
