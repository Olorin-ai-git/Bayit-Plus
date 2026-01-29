#!/bin/bash
set -euo pipefail

echo "Creating critical missing secrets..."

# 1. Admin credentials (CRITICAL)
if ! gcloud secrets describe bayit-admin-password >/dev/null 2>&1; then
    # Generate secure password (32 characters, URL-safe)
    python3 -c "import secrets; print(secrets.token_urlsafe(32))" | \
        gcloud secrets create bayit-admin-password --data-file=-
    echo "✓ Created: bayit-admin-password"
else
    echo "✓ Exists: bayit-admin-password"
fi

if ! gcloud secrets describe bayit-admin-email >/dev/null 2>&1; then
    echo -n "admin@olorin.ai" | gcloud secrets create bayit-admin-email --data-file=-
    echo "✓ Created: bayit-admin-email"
else
    echo "✓ Exists: bayit-admin-email"
fi

# 2. Location encryption key (CRITICAL)
if ! gcloud secrets describe bayit-location-encryption-key >/dev/null 2>&1; then
    # Generate new Fernet key for security
    python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())" | \
        gcloud secrets create bayit-location-encryption-key --data-file=-
    echo "✓ Created: bayit-location-encryption-key"
else
    echo "✓ Exists: bayit-location-encryption-key"
fi

# 3. ElevenLabs webhook secret (CRITICAL)
if ! gcloud secrets describe bayit-elevenlabs-webhook-secret >/dev/null 2>&1; then
    python3 -c "import secrets; print(secrets.token_urlsafe(32))" | \
        gcloud secrets create bayit-elevenlabs-webhook-secret --data-file=-
    echo "✓ Created: bayit-elevenlabs-webhook-secret"
else
    echo "✓ Exists: bayit-elevenlabs-webhook-secret"
fi

# 4. Olorin Fraud Detection MongoDB (CRITICAL)
if ! gcloud secrets describe olorin-fraud-mongodb-uri >/dev/null 2>&1; then
    echo ""
    echo "⚠️  MANUAL ACTION REQUIRED: olorin-fraud-mongodb-uri"
    echo "   This secret contains sensitive MongoDB credentials from backend/.env line 50"
    echo "   Run: echo -n 'mongodb+srv://...' | gcloud secrets create olorin-fraud-mongodb-uri --data-file=-"
    echo ""
fi

# 5. CVPlus MongoDB (CRITICAL)
if ! gcloud secrets describe cvplus-mongodb-uri >/dev/null 2>&1; then
    echo ""
    echo "⚠️  MANUAL ACTION REQUIRED: cvplus-mongodb-uri"
    echo "   This secret contains sensitive MongoDB credentials from backend/.env line 57"
    echo "   Run: echo -n 'mongodb+srv://...' | gcloud secrets create cvplus-mongodb-uri --data-file=-"
    echo ""
fi

# 6. GeoNames API username
if ! gcloud secrets describe bayit-geonames-username >/dev/null 2>&1; then
    echo -n "Olorin1973" | gcloud secrets create bayit-geonames-username --data-file=-
    echo "✓ Created: bayit-geonames-username"
else
    echo "✓ Exists: bayit-geonames-username"
fi

echo ""
echo "✅ Critical secrets created/verified"
echo ""
echo "NEXT STEPS:"
echo "1. Manually create olorin-fraud-mongodb-uri and cvplus-mongodb-uri using values from backend/.env"
echo "2. Run ./scripts/deployment/bayit-plus/validate_secrets.sh to verify all secrets"
