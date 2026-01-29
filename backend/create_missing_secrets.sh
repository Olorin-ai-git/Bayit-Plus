#!/bin/bash
# Create missing secrets in Google Cloud Secret Manager
# This script will prompt for each missing secret value

PROJECT_ID="bayit-plus"
REGION="us-central1"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}Bayit+ Secret Manager Setup${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo "This script will create missing secrets in Google Cloud Secret Manager."
echo "Project: $PROJECT_ID"
echo ""

# Function to create or update a secret
create_secret() {
    local secret_name=$1
    local secret_value=$2
    local description=$3

    # Check if secret already exists
    if gcloud secrets describe "$secret_name" --project="$PROJECT_ID" &>/dev/null; then
        echo -e "${YELLOW}Secret $secret_name already exists. Updating...${NC}"
        echo -n "$secret_value" | gcloud secrets versions add "$secret_name" \
            --project="$PROJECT_ID" \
            --data-file=-
    else
        echo -e "${GREEN}Creating secret: $secret_name${NC}"
        echo -n "$secret_value" | gcloud secrets create "$secret_name" \
            --project="$PROJECT_ID" \
            --replication-policy="automatic" \
            --data-file=- \
            --labels="environment=production,service=bayit-plus"

        if [ -n "$description" ]; then
            gcloud secrets update "$secret_name" \
                --project="$PROJECT_ID" \
                --update-labels="description=$description"
        fi
    fi

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Success${NC}"
    else
        echo -e "${RED}✗ Failed${NC}"
    fi
    echo ""
}

# Function to read secret value from user
read_secret() {
    local prompt=$1
    local secret_value

    echo -e "${YELLOW}$prompt${NC}"
    read -s secret_value
    echo "$secret_value"
}

echo -e "${YELLOW}====== CRITICAL SECRETS (Must be created) ======${NC}"
echo ""

# Admin Credentials
echo "1. Admin Email"
ADMIN_EMAIL=$(read_secret "Enter admin email:")
create_secret "bayit-admin-email" "$ADMIN_EMAIL" "Administrator email address"

echo "2. Admin Password"
ADMIN_PASSWORD=$(read_secret "Enter admin password:")
create_secret "bayit-admin-password" "$ADMIN_PASSWORD" "Administrator password"

# MongoDB URIs
echo "3. Bayit+ MongoDB URI"
echo "Current value from .env:"
grep "^MONGODB_URI=" /Users/olorin/Documents/olorin/olorin-media/bayit-plus/backend/.env | head -1
MONGODB_URI=$(read_secret "Enter Bayit+ MongoDB URI (or press Enter to use current):")
if [ -z "$MONGODB_URI" ]; then
    MONGODB_URI=$(grep "^MONGODB_URI=" /Users/olorin/Documents/olorin/olorin-media/bayit-plus/backend/.env | head -1 | cut -d= -f2)
fi
create_secret "bayit-mongodb-uri" "$MONGODB_URI" "Bayit+ MongoDB connection URI"

echo "4. Station AI MongoDB URI"
STATION_AI_URI=$(read_secret "Enter Station AI MongoDB URI:")
create_secret "station-ai-mongodb-uri" "$STATION_AI_URI" "Station AI MongoDB connection URI"

echo "5. Olorin Fraud MongoDB URI"
OLORIN_URI=$(read_secret "Enter Olorin Fraud MongoDB URI:")
create_secret "olorin-fraud-mongodb-uri" "$OLORIN_URI" "Olorin Fraud Detection MongoDB URI"

echo "6. Olorin Fraud MongoDB Source URI"
OLORIN_SOURCE_URI=$(read_secret "Enter Olorin Fraud MongoDB Source URI:")
create_secret "olorin-fraud-mongodb-source-uri" "$OLORIN_SOURCE_URI" "Olorin Fraud source database URI"

echo "7. CVPlus MongoDB URI"
CVPLUS_URI=$(read_secret "Enter CVPlus MongoDB URI:")
create_secret "cvplus-mongodb-uri" "$CVPLUS_URI" "CVPlus MongoDB connection URI"

echo "8. CVPlus MongoDB Source URI"
CVPLUS_SOURCE_URI=$(read_secret "Enter CVPlus MongoDB Source URI:")
create_secret "cvplus-mongodb-source-uri" "$CVPLUS_SOURCE_URI" "CVPlus source database URI"

# Google OAuth (update existing with current values)
echo "9. Google OAuth Client ID"
echo "Current value from .env: 624470113582-7j5ptjiq9dhdlmc709792c1do5v3cee6.apps.googleusercontent.com"
GOOGLE_CLIENT_ID=$(read_secret "Enter Google Client ID (or press Enter to use current):")
if [ -z "$GOOGLE_CLIENT_ID" ]; then
    GOOGLE_CLIENT_ID="624470113582-7j5ptjiq9dhdlmc709792c1do5v3cee6.apps.googleusercontent.com"
fi
create_secret "bayit-google-client-id" "$GOOGLE_CLIENT_ID" "Google OAuth Client ID"

echo "10. Google OAuth Client Secret"
echo "Current value from .env: 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"
GOOGLE_CLIENT_SECRET=$(read_secret "Enter Google Client Secret (or press Enter to use current):")
if [ -z "$GOOGLE_CLIENT_SECRET" ]; then
    GOOGLE_CLIENT_SECRET="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"
fi
create_secret "bayit-google-client-secret" "$GOOGLE_CLIENT_SECRET" "Google OAuth Client Secret"

# ElevenLabs Webhook
echo "11. ElevenLabs Webhook Secret"
ELEVENLABS_WEBHOOK=$(read_secret "Enter ElevenLabs Webhook Secret:")
create_secret "bayit-elevenlabs-webhook-secret" "$ELEVENLABS_WEBHOOK" "ElevenLabs webhook verification secret"

# GeoNames
echo "12. GeoNames Username"
echo "Current value: Olorin1973"
GEONAMES_USERNAME=$(read_secret "Enter GeoNames username (or press Enter to use 'Olorin1973'):")
if [ -z "$GEONAMES_USERNAME" ]; then
    GEONAMES_USERNAME="Olorin1973"
fi
create_secret "bayit-geonames-username" "$GEONAMES_USERNAME" "GeoNames API username"

# Location Encryption Key
echo "13. Location Encryption Key"
echo "Current value: 3n__gO10_RPLM8Kx3JAxV4_4RDgWNoqahNfykimTm-4="
LOCATION_KEY=$(read_secret "Enter Location Encryption Key (or press Enter to use current):")
if [ -z "$LOCATION_KEY" ]; then
    LOCATION_KEY="3n__gO10_RPLM8Kx3JAxV4_4RDgWNoqahNfykimTm-4="
fi
create_secret "bayit-location-encryption-key" "$LOCATION_KEY" "Fernet encryption key for location data"

# Turbo Token
echo "14. Turbo Token"
TURBO_TOKEN=$(read_secret "Enter Turbo Token (or press Enter to skip):")
if [ -n "$TURBO_TOKEN" ]; then
    create_secret "bayit-turbo-token" "$TURBO_TOKEN" "Turbo build acceleration token"
fi

echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}Secret creation complete!${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo "Next steps:"
echo "1. Replace retrieve_secrets.sh with retrieve_secrets.sh.new"
echo "2. Run: ./retrieve_secrets.sh > .env.new"
echo "3. Review .env.new and replace .env"
echo "4. Test the application"
