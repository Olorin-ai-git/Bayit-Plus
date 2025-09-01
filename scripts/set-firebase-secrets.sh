#!/bin/bash

# Firebase Secrets Setup Helper Script
# This script helps you set all required secrets for the Olorin platform

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "🔐 Firebase Secrets Setup Helper"
echo "=================================="
echo ""
echo "This script will help you set up all required secrets in Firebase Secret Manager."
echo "Secrets must be in UPPER_SNAKE_CASE format."
echo ""

# Function to set a secret
set_secret() {
    local secret_name=$1
    local description=$2
    local required=$3
    
    echo ""
    echo -e "${BLUE}Setting: ${secret_name}${NC}"
    echo "  Description: $description"
    
    # Check if secret already exists
    if firebase functions:secrets:list 2>/dev/null | grep -q "^${secret_name}$"; then
        echo -e "${YELLOW}  ⚠️  Secret already exists. Skipping...${NC}"
        return
    fi
    
    if [ "$required" = "required" ]; then
        echo -e "${RED}  ⚠️  This is a REQUIRED secret for production${NC}"
    fi
    
    read -p "  Enter value (or press Enter to skip): " secret_value
    
    if [ -n "$secret_value" ]; then
        echo "$secret_value" | firebase functions:secrets:set "$secret_name" 2>/dev/null && \
            echo -e "${GREEN}  ✅ Secret set successfully${NC}" || \
            echo -e "${RED}  ❌ Failed to set secret${NC}"
    else
        echo "  Skipped"
    fi
}

# Function to set a secret from file
set_secret_from_file() {
    local secret_name=$1
    local description=$2
    local file_path=$3
    
    echo ""
    echo -e "${BLUE}Setting: ${secret_name}${NC}"
    echo "  Description: $description"
    
    # Check if secret already exists
    if firebase functions:secrets:list 2>/dev/null | grep -q "^${secret_name}$"; then
        echo -e "${YELLOW}  ⚠️  Secret already exists. Skipping...${NC}"
        return
    fi
    
    read -p "  Enter file path (or press Enter to skip): " file_input
    file_path=${file_input:-$file_path}
    
    if [ -n "$file_path" ] && [ -f "$file_path" ]; then
        firebase functions:secrets:set "$secret_name" < "$file_path" 2>/dev/null && \
            echo -e "${GREEN}  ✅ Secret set from file successfully${NC}" || \
            echo -e "${RED}  ❌ Failed to set secret${NC}"
    else
        echo "  Skipped"
    fi
}

# Check if user wants to set environment-specific secrets
echo "Which environment do you want to configure?"
echo "1) Production"
echo "2) Staging"
echo "3) Development"
echo "4) Shared secrets only"
read -p "Enter choice (1-4): " env_choice

case $env_choice in
    1)
        ENV_PREFIX="PRODUCTION_"
        echo -e "${RED}Configuring PRODUCTION secrets${NC}"
        ;;
    2)
        ENV_PREFIX="STAGING_"
        echo -e "${YELLOW}Configuring STAGING secrets${NC}"
        ;;
    3)
        ENV_PREFIX="DEVELOPMENT_"
        echo -e "${GREEN}Configuring DEVELOPMENT secrets${NC}"
        ;;
    4)
        ENV_PREFIX=""
        echo "Configuring shared secrets only"
        ;;
    *)
        echo "Invalid choice. Exiting."
        exit 1
        ;;
esac

echo ""
echo "==================== CRITICAL SECRETS ===================="
echo "These secrets are REQUIRED for the application to start in production"

if [ -n "$ENV_PREFIX" ]; then
    set_secret "${ENV_PREFIX}DATABASE_PASSWORD" "MySQL/PostgreSQL database password" "required"
    set_secret "${ENV_PREFIX}JWT_SECRET_KEY" "JWT signing key (min 32 characters)" "required"
fi

echo ""
echo "==================== API KEYS ===================="
echo "These are shared across all environments"

set_secret "ANTHROPIC_API_KEY" "Claude API key (sk-ant-...)" ""
set_secret "OPENAI_API_KEY" "OpenAI GPT API key (sk-...)" ""
set_secret "OLORIN_API_KEY" "Internal Olorin API key" ""
set_secret "DATABRICKS_TOKEN" "Databricks workspace token" ""

echo ""
echo "==================== SERVICE CREDENTIALS ===================="

if [ -n "$ENV_PREFIX" ]; then
    set_secret "${ENV_PREFIX}REDIS_PASSWORD" "Redis cache password" ""
fi

set_secret "SPLUNK_USERNAME" "Splunk integration username" ""
set_secret "SPLUNK_PASSWORD" "Splunk integration password" ""
set_secret "SUMO_LOGIC_ACCESS_ID" "SumoLogic access ID" ""
set_secret "SUMO_LOGIC_ACCESS_KEY" "SumoLogic access key" ""
set_secret "SNOWFLAKE_ACCOUNT" "Snowflake account identifier" ""
set_secret "SNOWFLAKE_USER" "Snowflake username" ""
set_secret "SNOWFLAKE_PASSWORD" "Snowflake password" ""
set_secret_from_file "SNOWFLAKE_PRIVATE_KEY" "Snowflake private key (PEM format)" ""

echo ""
echo "==================== FRONTEND SECRETS ===================="

if [ -n "$ENV_PREFIX" ]; then
    set_secret "${ENV_PREFIX}OLORIN_FRONT_API_BASE_URL" "Backend API URL for olorin-front" ""
    set_secret "${ENV_PREFIX}OLORIN_FRONT_WEBSOCKET_URL" "WebSocket URL for olorin-front" ""
    set_secret "${ENV_PREFIX}OLORIN_FRONT_GOOGLE_MAPS_API_KEY" "Google Maps API key" ""
    set_secret "${ENV_PREFIX}WEB_PORTAL_EMAILJS_PUBLIC_KEY" "EmailJS public key for web portal" ""
    set_secret "${ENV_PREFIX}WEB_PORTAL_GOOGLE_ANALYTICS_ID" "Google Analytics ID" ""
fi

echo ""
echo "==================== SUMMARY ===================="
echo ""
echo "Listing all secrets:"
firebase functions:secrets:list

echo ""
echo -e "${GREEN}✅ Secret setup complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Verify secrets are set: firebase functions:secrets:list"
echo "2. Test secret access: ./scripts/test-secret-access.sh"
echo "3. Run security validation: ./scripts/security-validation.sh"
echo ""
echo "To use these secrets:"
echo "- Backend will automatically load them via SecretManagerClient"
echo "- Frontend: node scripts/load-secrets.js [project] [environment]"
echo "- Docker: ./scripts/docker-secrets-loader.sh [environment]"