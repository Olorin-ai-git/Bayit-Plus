#!/bin/bash
# Batch create all missing secrets
set -e

PROJECT_ID="bayit-plus"

# Function to create or update secret
create_secret() {
    local secret_name=$1
    local secret_value=$2
    
    if gcloud secrets describe "$secret_name" --project="$PROJECT_ID" &>/dev/null; then
        echo "Updating existing secret: $secret_name"
        echo -n "$secret_value" | gcloud secrets versions add "$secret_name" \
            --project="$PROJECT_ID" \
            --data-file=- 2>&1
    else
        echo "Creating new secret: $secret_name"
        echo -n "$secret_value" | gcloud secrets create "$secret_name" \
            --project="$PROJECT_ID" \
            --replication-policy="automatic" \
            --data-file=- \
            --labels="environment=production,service=bayit-plus" 2>&1
    fi
    
    if [ $? -eq 0 ]; then
        echo "✓ Success: $secret_name"
    else
        echo "✗ Failed: $secret_name"
    fi
    echo ""
}

echo "============================================"
echo "Creating Bayit+ Secrets in Secret Manager"
echo "Project: $PROJECT_ID"
echo "============================================"
echo ""

# 1. Admin Credentials
create_secret "bayit-admin-email" "admin@olorin.ai"
create_secret "bayit-admin-password" "Admin123!Bayit"

# 2. Bayit+ MongoDB URI (from .env)
MONGODB_URI="mongodb+srv://admin_db_user:Jersey1973!@cluster0.ydrvaft.mongodb.net/bayit_plus?retryWrites=true&w=majority&appName=Cluster0"
create_secret "bayit-mongodb-uri" "$MONGODB_URI"

# 3. MongoDB DB Name
create_secret "bayit-mongodb-db-name" "bayit_plus"

# 4. Station AI MongoDB (placeholder - needs real value)
create_secret "station-ai-mongodb-uri" "mongodb+srv://placeholder-update-me"

# 5. Olorin Fraud MongoDB (placeholder - needs real value)
create_secret "olorin-fraud-mongodb-uri" "mongodb+srv://placeholder-update-me"
create_secret "olorin-fraud-mongodb-source-uri" "mongodb+srv://placeholder-update-me"

# 6. CVPlus MongoDB (placeholder - needs real value)
create_secret "cvplus-mongodb-uri" "mongodb+srv://placeholder-update-me"
create_secret "cvplus-mongodb-source-uri" "mongodb+srv://placeholder-update-me"

# 7. Google OAuth (from .env)
create_secret "bayit-google-client-id" "624470113582-7j5ptjiq9dhdlmc709792c1do5v3cee6.apps.googleusercontent.com"
create_secret "bayit-google-client-secret" "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"
create_secret "bayit-google-redirect-uri" "https://bayit.tv/auth/google/callback"

# 8. ElevenLabs
create_secret "bayit-elevenlabs-webhook-secret" "placeholder-elevenlabs-webhook"
create_secret "bayit-elevenlabs-hebrew-voice-id" "EXAVITQu4vr4xnSDxMaL"
create_secret "bayit-elevenlabs-english-voice-id" "EXAVITQu4vr4xnSDxMaL"

# 9. GeoNames (from .env)
create_secret "bayit-geonames-username" "Olorin1973"
create_secret "bayit-geonames-api-base-url" "https://secure.geonames.org"
create_secret "bayit-geonames-timeout-seconds" "10"

# 10. Location Encryption (from .env)
create_secret "bayit-location-encryption-key" "3n__gO10_RPLM8Kx3JAxV4_4RDgWNoqahNfykimTm-4="
create_secret "bayit-location-cache-ttl-hours" "24"
create_secret "bayit-location-reverse-geocode-rate-limit" "30"
create_secret "bayit-location-content-rate-limit" "60"

# 11. Other services
create_secret "bayit-turbo-token" "placeholder-turbo-token"
create_secret "bayit-csrf-enabled" "false"
create_secret "bayit-log-level" "INFO"

# 12. GCP
create_secret "bayit-gcp-project-id" "bayit-plus"
create_secret "bayit-gcs-bucket-name" "bayit-plus-media"
create_secret "bayit-cors-origins" '["https://bayit.tv","https://www.bayit.tv","https://bayit-plus.web.app","http://localhost:3000","http://localhost:3200","http://localhost:3211","http://localhost:8000"]'

# 13. Audit settings
create_secret "bayit-audit-stuck-timeout-minutes" "30"
create_secret "bayit-audit-no-activity-timeout-minutes" "15"
create_secret "bayit-audit-health-check-interval-seconds" "300"

echo ""
echo "============================================"
echo "Secret creation complete!"
echo "============================================"
