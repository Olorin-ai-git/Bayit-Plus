#!/bin/bash
# Retrieve secrets from Google Cloud Secret Manager

PROJECT_ID="bayit-plus"

# Function to get secret value
get_secret() {
    local secret_name=$1
    gcloud secrets versions access latest --secret="$secret_name" --project="$PROJECT_ID" 2>/dev/null
}

echo "# Bayit+ Backend Configuration - Retrieved from GCP Secret Manager"
echo "# $(date)"
echo ""

echo "# SECURITY"
echo "SECRET_KEY=$(get_secret bayit-secret-key)"
echo "DEBUG=false"
echo ""

echo "# DATABASE"
echo "MONGODB_URL=$(get_secret bayit-mongodb-url)"
echo "MONGODB_DB_NAME=$(get_secret bayit-mongodb-db-name)"
echo ""

echo "# GCP"
echo "GCP_PROJECT_ID=$(get_secret bayit-gcp-project-id)"
echo "GCS_BUCKET_NAME=$(get_secret bayit-gcs-bucket-name)"
echo "BACKEND_CORS_ORIGINS=$(get_secret bayit-cors-origins)"
echo ""

echo "# STRIPE"
echo "STRIPE_API_KEY=$(get_secret bayit-stripe-api-key)"
echo "STRIPE_SECRET_KEY=$(get_secret bayit-stripe-secret-key)"
echo "STRIPE_WEBHOOK_SECRET=$(get_secret bayit-stripe-webhook-secret)"
echo "STRIPE_PRICE_BASIC=$(get_secret bayit-stripe-price-basic)"
echo "STRIPE_PRICE_PREMIUM=$(get_secret bayit-stripe-price-premium)"
echo "STRIPE_PRICE_FAMILY=$(get_secret bayit-stripe-price-family)"
echo ""

echo "# AI SERVICES"
echo "OPENAI_API_KEY=$(get_secret bayit-openai-api-key)"
echo "ANTHROPIC_API_KEY=$(get_secret bayit-anthropic-api-key)"
echo "ELEVENLABS_API_KEY=$(get_secret bayit-elevenlabs-api-key)"
echo ""

echo "# TMDB"
echo "TMDB_API_KEY=$(get_secret tmdb-api-key)"
echo "TMDB_API_TOKEN=$(get_secret tmdb-api-token)"
echo ""

echo "# GOOGLE OAUTH"
echo "GOOGLE_CLIENT_ID=$(get_secret bayit-google-client-id)"
echo "GOOGLE_CLIENT_SECRET=$(get_secret bayit-google-client-secret)"
echo "GOOGLE_REDIRECT_URI=$(get_secret bayit-google-redirect-uri)"
echo ""

echo "# TWILIO"
echo "TWILIO_ACCOUNT_SID=$(get_secret bayit-twilio-account-sid)"
echo "TWILIO_AUTH_TOKEN=$(get_secret bayit-twilio-auth-token)"
echo "TWILIO_PHONE_NUMBER=$(get_secret bayit-twilio-phone-number)"
echo ""

echo "# OTHER SERVICES"
echo "OPENSUBTITLES_API_KEY=$(get_secret opensubtitles-api-key)"
echo "PICOVOICE_ACCESS_KEY=$(get_secret picovoice-access-key)"
echo "SENTRY_DSN=$(get_secret bayit-sentry-dsn)"
echo ""

echo "# APPLE"
echo "APPLE_KEY_ID=$(get_secret bayit-apple-key-id)"
echo "APPLE_TEAM_ID=$(get_secret bayit-apple-team-id)"
echo "APPLE_BUNDLE_ID_IOS=$(get_secret bayit-apple-bundle-id-ios)"
echo "APPLE_BUNDLE_ID_TVOS=$(get_secret bayit-apple-bundle-id-tvos)"
echo ""

echo "# OLORIN"
echo "PINECONE_API_KEY=$(get_secret olorin-pinecone-api-key)"
echo "PARTNER_API_KEY_SALT=$(get_secret olorin-partner-api-key-salt)"
echo ""

echo "# PODCAST TRANSLATION"
echo "PODCAST_TRANSLATION_ENABLED=true"
echo "ALLOWED_AUDIO_DOMAINS=$(get_secret bayit-allowed-audio-domains)"
echo "ELEVENLABS_HEBREW_VOICE_ID=$(get_secret elevenlabs-hebrew-voice-id)"
echo "ELEVENLABS_ENGLISH_VOICE_ID=$(get_secret elevenlabs-english-voice-id)"
echo ""

echo "# LIBRARIAN AUDIT RECOVERY"
echo "AUDIT_STUCK_TIMEOUT_MINUTES=$(get_secret bayit-audit-stuck-timeout-minutes || echo '30')"
echo "AUDIT_NO_ACTIVITY_TIMEOUT_MINUTES=$(get_secret bayit-audit-no-activity-timeout-minutes || echo '15')"
echo "AUDIT_HEALTH_CHECK_INTERVAL_SECONDS=$(get_secret bayit-audit-health-check-interval-seconds || echo '300')"
