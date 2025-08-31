#!/bin/bash

# Create Production Secrets in Firebase Secret Manager
# This script creates the essential secrets required for Olorin production deployment
# Author: Gil Klainert
# Date: 2025-08-31

set -e

PROJECT_ID="olorin-ai"
echo "🔐 Creating production secrets for Firebase project: $PROJECT_ID"

# Ensure we're in the correct project
gcloud config set project "$PROJECT_ID"

# Function to create secret securely
create_secret() {
    local secret_name="$1"
    local description="$2"
    local prompt="$3"
    
    echo
    echo "📝 Creating secret: $secret_name"
    echo "Description: $description"
    
    # Check if secret already exists
    if gcloud secrets describe "$secret_name" --project="$PROJECT_ID" >/dev/null 2>&1; then
        echo "⚠️  Secret $secret_name already exists. Skipping..."
        return 0
    fi
    
    # Prompt for secret value
    echo "$prompt"
    read -s secret_value
    echo
    
    if [ -z "$secret_value" ]; then
        echo "❌ Empty secret value provided. Skipping $secret_name..."
        return 1
    fi
    
    # Create the secret
    echo "$secret_value" | gcloud secrets create "$secret_name" \
        --project="$PROJECT_ID" \
        --data-file=- \
        --labels="environment=production,service=olorin,managed-by=script"
    
    echo "✅ Successfully created secret: $secret_name"
}

# Function to generate secure random secret
generate_secure_secret() {
    openssl rand -base64 32
}

echo "🚀 Starting secret creation process..."
echo "Note: For security, your input will not be displayed on screen."

# Core API Keys
create_secret "OPENAI_API_KEY" \
    "OpenAI API key for GPT models" \
    "Enter your OpenAI API key:"

create_secret "GAIA_API_KEY" \
    "GAIA service API key for integrations" \
    "Enter your GAIA API key (or press Enter to skip):"

create_secret "OLORIN_API_KEY" \
    "Internal Olorin API authentication key" \
    "Enter your Olorin API key (or press Enter to generate one):"

# Database & Infrastructure  
create_secret "DATABASE_PASSWORD" \
    "Production database password" \
    "Enter your production database password:"

create_secret "REDIS_PASSWORD" \
    "Redis cache authentication password" \
    "Enter your Redis password:"

# Generate JWT secret automatically
echo
echo "📝 Creating secret: JWT_SECRET_KEY"
echo "Description: JWT token signing secret key"
jwt_secret=$(generate_secure_secret)
echo "$jwt_secret" | gcloud secrets create "JWT_SECRET_KEY" \
    --project="$PROJECT_ID" \
    --data-file=- \
    --labels="environment=production,service=olorin,managed-by=script,generated=true"
echo "✅ Successfully created JWT_SECRET_KEY (auto-generated)"

# External Services
create_secret "SPLUNK_USERNAME" \
    "Splunk service username for log analysis" \
    "Enter your Splunk username:"

create_secret "SPLUNK_PASSWORD" \
    "Splunk service password for log analysis" \
    "Enter your Splunk password:"

# Generate App secret automatically
echo
echo "📝 Creating secret: APP_SECRET"
echo "Description: Application-wide secret for internal operations"
app_secret=$(generate_secure_secret)
echo "$app_secret" | gcloud secrets create "APP_SECRET" \
    --project="$PROJECT_ID" \
    --data-file=- \
    --labels="environment=production,service=olorin,managed-by=script,generated=true"
echo "✅ Successfully created APP_SECRET (auto-generated)"

echo
echo "🎉 Secret creation process completed!"
echo

# Display current secrets
echo "📋 Current secrets in Firebase Secret Manager:"
gcloud secrets list --project="$PROJECT_ID" --format="table(name,createTime,labels)"

echo
echo "🔍 Running validation to verify all secrets are accessible..."
echo

# Run validation
cd "$(dirname "$0")/../../olorin-server"
if poetry run python ../scripts/security/firebase-secrets-validator.py --project "$PROJECT_ID"; then
    echo
    echo "✅ Secret validation PASSED! All critical secrets are accessible."
    echo "🚀 Your Olorin production environment is ready for deployment!"
else
    echo
    echo "⚠️  Secret validation found some issues. Please review the report above."
    echo "💡 You can create additional secrets later using the gcloud commands provided."
fi

echo
echo "📖 Next steps:"
echo "1. Review the validation report above"
echo "2. Create any additional optional secrets if needed"
echo "3. Deploy using: firebase apphosting:deploy"
echo "4. Monitor the deployment logs for any issues"
echo
echo "🔒 Security reminders:"
echo "- Never share or commit these secret values"
echo "- Regularly rotate API keys and passwords"  
echo "- Monitor secret access logs in Firebase Console"
echo "- Use IAM roles to limit secret access"