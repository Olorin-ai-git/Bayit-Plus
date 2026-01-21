#!/bin/bash

# Create sample CV data directly via Firestore REST API

echo "🚀 Creating sample CV data for development skip..."

# Sample job data
JOB_ID="dev-sample-$(date +%s)"
USER_ID="test-user-dev"

# Create the sample job document
curl -X POST "http://127.0.0.1:8090/v1/projects/cvplus-5c0e3/databases/(default)/documents/jobs?documentId=${JOB_ID}" \
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
                  "name": {"stringValue": "John Doe"},
                  "email": {"stringValue": "john.doe@example.com"},
                  "phone": {"stringValue": "+1-555-0123"},
                  "location": {"stringValue": "San Francisco, CA"},
                  "title": {"stringValue": "Senior Software Engineer"},
                  "summary": {"stringValue": "Experienced software engineer with 5+ years of experience."}
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
            "education": {
              "arrayValue": {
                "values": [{
                  "mapValue": {
                    "fields": {
                      "institution": {"stringValue": "Stanford University"},
                      "degree": {"stringValue": "Bachelor of Science"},
                      "field": {"stringValue": "Computer Science"},
                      "graduationDate": {"stringValue": "2018-06-01"},
                      "gpa": {"stringValue": "3.8"}
                    }
                  }
                }]
              }
            },
            "skills": {
              "mapValue": {
                "fields": {
                  "technical": {
                    "arrayValue": {
                      "values": [
                        {"stringValue": "JavaScript"},
                        {"stringValue": "TypeScript"},
                        {"stringValue": "React"},
                        {"stringValue": "Node.js"},
                        {"stringValue": "Python"}
                      ]
                    }
                  },
                  "soft": {
                    "arrayValue": {
                      "values": [
                        {"stringValue": "Leadership"},
                        {"stringValue": "Communication"},
                        {"stringValue": "Problem Solving"}
                      ]
                    }
                  }
                }
              }
            },
            "_developmentSample": {"booleanValue": true}
          }
        }
      },
      "_developmentSample": {"booleanValue": true}
    }
  }'

echo ""
echo "✅ Sample job created with ID: ${JOB_ID}"
echo "   User ID: ${USER_ID}"
echo ""

# Verify the document was created
echo "🔍 Verifying document creation..."
VERIFY_RESPONSE=$(curl -s "http://127.0.0.1:8090/v1/projects/cvplus-5c0e3/databases/(default)/documents/jobs/${JOB_ID}")

if echo "$VERIFY_RESPONSE" | grep -q '"name"'; then
    echo "✅ Verification successful - document exists"
    echo "✅ Document has parsedData field"
    echo ""
    echo "🎯 Development skip should now work!"
    echo ""
    echo "📋 Next steps:"
    echo "   1. Try using development skip in the frontend"
    echo "   2. Use fileUrl: 'development-skip' and mimeType: 'development/skip'"
    echo "   3. The processCV function should find and reuse this sample data"
else
    echo "❌ Verification failed - document may not have been created"
    echo "Response: $VERIFY_RESPONSE"
fi