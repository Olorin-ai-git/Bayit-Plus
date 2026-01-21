#!/bin/bash

# Quick Development Fix for Firebase Emulator Issues
# This provides the fastest path to a working development environment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'  
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_header() {
    echo -e "\n${BLUE}=== $1 ===${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_header "Firebase Emulator Development Fix"

print_info "🎯 This script provides the FASTEST path to working development skip"
print_info "📋 What this does:"
print_info "   1. Creates temporary permissive Firestore rules (emulator only)"
print_info "   2. Creates sample CV data for development skip"
print_info "   3. Tests the setup"
print_info "   4. Provides instructions for frontend usage"

echo ""
read -p "Continue? (y/N): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_info "Operation cancelled"
    exit 0
fi

# Step 1: Backup current rules
print_header "Step 1: Backup Current Rules"

cd ../..
BACKUP_FILE="firestore.rules.backup.$(date +%s)"
cp firestore.rules "$BACKUP_FILE"
print_success "Backed up rules to: $BACKUP_FILE"

# Step 2: Apply temporary development rules  
print_header "Step 2: Apply Temporary Development Rules"

cat > firestore.rules << 'EOF'
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // TEMPORARY DEVELOPMENT RULES - ALLOWS ALL ACCESS
    // ⚠️  FOR EMULATOR ONLY - NEVER USE IN PRODUCTION ⚠️
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
EOF

print_success "Applied temporary development rules"
print_warning "These rules allow ALL access - FOR EMULATOR ONLY!"

# Step 3: Create sample data
print_header "Step 3: Creating Sample CV Data"

cd scripts/firebase

# Create sample data via REST API
JOB_ID="dev-sample-$(date +%s)"
USER_ID="test-user-dev"

print_info "Creating job: $JOB_ID for user: $USER_ID"

# Create the document
RESPONSE=$(curl -s -X POST "http://127.0.0.1:8090/v1/projects/cvplus-5c0e3/databases/(default)/documents/jobs?documentId=${JOB_ID}" \
  -H "Content-Type: application/json" \
  -d '{
    "fields": {
      "userId": {"stringValue": "'${USER_ID}'"},
      "status": {"stringValue": "completed"},
      "progress": {"integerValue": "100"},
      "fileName": {"stringValue": "sample-cv.pdf"}, 
      "fileSize": {"integerValue": "245760"},
      "mimeType": {"stringValue": "application/pdf"},
      "isPublic": {"booleanValue": false},
      "createdAt": {"timestampValue": "'$(date -u +%Y-%m-%dT%H:%M:%S.000Z)'"},
      "updatedAt": {"timestampValue": "'$(date -u +%Y-%m-%dT%H:%M:%S.000Z)'"},
      "completedAt": {"timestampValue": "'$(date -u +%Y-%m-%dT%H:%M:%S.000Z)'"},
      "parsedData": {
        "mapValue": {
          "fields": {
            "personalInfo": {
              "mapValue": {
                "fields": {
                  "name": {"stringValue": "John Doe (Sample)"},
                  "email": {"stringValue": "john.doe@example.com"},
                  "phone": {"stringValue": "+1-555-0123"},
                  "location": {"stringValue": "San Francisco, CA"},
                  "title": {"stringValue": "Senior Software Engineer"},
                  "summary": {"stringValue": "Sample CV data for development skip testing."}
                }
              }
            },
            "experience": {
              "arrayValue": {
                "values": [{
                  "mapValue": {
                    "fields": {
                      "title": {"stringValue": "Senior Software Engineer"},
                      "company": {"stringValue": "Tech Corp"},
                      "location": {"stringValue": "San Francisco, CA"},
                      "startDate": {"stringValue": "2020-01-01"},
                      "endDate": {"stringValue": "present"},
                      "description": {"stringValue": "Leading development of cutting-edge technology solutions."}
                    }
                  }
                }]
              }
            },
            "_developmentSample": {"booleanValue": true}
          }
        }
      },
      "_developmentSample": {"booleanValue": true}
    }
  }')

if echo "$RESPONSE" | grep -q "name"; then
    print_success "Sample data created successfully!"
else
    print_error "Failed to create sample data"
    print_info "Response: $RESPONSE"
    exit 1
fi

# Step 4: Verify data exists  
print_header "Step 4: Verification"

VERIFY_RESPONSE=$(curl -s "http://127.0.0.1:8090/v1/projects/cvplus-5c0e3/databases/(default)/documents/jobs/${JOB_ID}")

if echo "$VERIFY_RESPONSE" | grep -q "parsedData"; then
    print_success "✅ Sample CV data verified in Firestore emulator"
    print_success "✅ Job ID: $JOB_ID"
    print_success "✅ Contains parsedData field for development skip"
else
    print_error "Verification failed"
    exit 1
fi

# Step 5: Test development skip
print_header "Step 5: Testing Development Skip"

print_info "Testing processCV function with development skip..."

# Create a test payload
TEST_PAYLOAD='{
  "data": {
    "jobId": "test-'$(date +%s)'",
    "fileUrl": "development-skip",
    "mimeType": "development/skip"
  }
}'

# Test the function (this will likely fail due to auth, but we can see the response)
TEST_RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:3000" \
  -d "$TEST_PAYLOAD" \
  "http://127.0.0.1:5001/cvplus-5c0e3/us-central1/processCV" || true)

if echo "$TEST_RESPONSE" | grep -q "authentication" || echo "$TEST_RESPONSE" | grep -q "auth"; then
    print_warning "Function requires authentication (expected)"
    print_info "This is normal - the frontend will provide auth tokens"
else
    print_info "Function response: $TEST_RESPONSE"
fi

# Final instructions
print_header "🎉 Setup Complete!"

print_success "Development environment is now ready!"
print_info ""
print_info "📋 To use development skip in your frontend:"
print_info "   1. Make sure user is authenticated (Google Auth)"
print_info "   2. Use these parameters in your CV upload:"
print_info "      fileUrl: 'development-skip'"
print_info "      mimeType: 'development/skip'"
print_info "   3. The processCV function will find and reuse the sample data"
print_info ""
print_info "🔍 Sample data created:"
print_info "   Job ID: $JOB_ID"
print_info "   User: $USER_ID (John Doe - Sample)"
print_info "   Status: completed with parsedData"
print_info ""
print_warning "⚠️  IMPORTANT: Before deploying to production:"
print_info "   1. Restore original Firestore rules:"
print_info "      cp $BACKUP_FILE firestore.rules"
print_info "   2. The current rules allow ALL access (emulator only)"
print_info ""
print_success "Development skip should now work! 🚀"

# Save restore command for easy access
echo "#!/bin/bash" > restore-production-rules.sh
echo "cp ../../$BACKUP_FILE ../../firestore.rules" >> restore-production-rules.sh
echo "echo '✅ Production rules restored'" >> restore-production-rules.sh
chmod +x restore-production-rules.sh

print_info "💡 To restore production rules later: ./restore-production-rules.sh"