# Audible API - OpenAPI 3.0 Specification Guide

**Date**: 2026-01-27
**Purpose**: Developer guide for OpenAPI/Swagger usage with Audible API
**API Version**: v1
**OpenAPI Version**: 3.0.0

---

## ACCESSING THE OPENAPI SPECIFICATION

### Swagger UI (Interactive Documentation)

**URL**: `http://localhost:8090/docs`

**Features**:
- Interactive endpoint testing
- Request/response visualization
- Schema browser
- Authentication testing

**Access**:
```bash
# Local development
http://localhost:8090/docs

# Production (example)
https://api.bayit.plus/docs
```

### OpenAPI JSON Schema

**URL**: `http://localhost:8090/api/v1/openapi.json`

**Content**: Complete OpenAPI 3.0 specification in JSON format

**Use Cases**:
- Code generation tools
- Documentation generators
- API testing frameworks
- IDE integration

### ReDoc (Alternative Documentation)

**URL**: `http://localhost:8090/redoc`

**Features**:
- Single-page documentation
- Improved readability
- Mobile-friendly
- No interactive testing (view-only)

---

## OPENAPI SPECIFICATION STRUCTURE

### API Information

```json
{
  "openapi": "3.0.0",
  "info": {
    "title": "Bayit+ API",
    "version": "1.0.0",
    "description": "Bayit+ Backend API with Audible Integration"
  },
  "servers": [
    {
      "url": "http://localhost:8090",
      "description": "Local development"
    },
    {
      "url": "https://api.bayit.plus",
      "description": "Production"
    }
  ]
}
```

### Paths (Endpoints)

**Generated From**:
```python
@router.post("/oauth/authorize", response_model=AudibleOAuthUrlResponse)
async def get_audible_oauth_url(...):
    """
    Generate Audible OAuth authorization URL with PKCE support.

    **Premium Feature**: Requires Premium or Family subscription.
    ...
    """
```

**OpenAPI Output**:
```json
{
  "paths": {
    "/user/audible/oauth/authorize": {
      "post": {
        "summary": "Get Audible OAuth authorization URL with PKCE support",
        "operationId": "get_audible_oauth_url",
        "tags": ["audible_integration"],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/AudibleOAuthRequest"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Successful Response",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/AudibleOAuthUrlResponse"
                }
              }
            }
          },
          "403": {
            "description": "Forbidden (User not premium/family tier)"
          },
          "503": {
            "description": "Service Unavailable (Audible integration not configured)"
          }
        }
      }
    }
  }
}
```

### Components (Models)

**Generated From Pydantic Models**:

```python
class AudibleOAuthRequest(BaseModel):
    """Request for Audible OAuth authorization URL"""
    redirect_uri: str
```

**OpenAPI Output**:
```json
{
  "components": {
    "schemas": {
      "AudibleOAuthRequest": {
        "type": "object",
        "properties": {
          "redirect_uri": {
            "type": "string",
            "description": "Redirect URI for OAuth callback",
            "title": "Redirect Uri"
          }
        },
        "required": ["redirect_uri"],
        "title": "AudibleOAuthRequest",
        "description": "Request for Audible OAuth authorization URL"
      }
    }
  }
}
```

---

## ENDPOINT OPENAPI DOCUMENTATION

### Complete Endpoint Specifications

#### POST /user/audible/oauth/authorize

**OpenAPI Path**: `/user/audible/oauth/authorize`

**OpenAPI Method**: `post`

**Request Schema**:
```json
{
  "$ref": "#/components/schemas/AudibleOAuthRequest",
  "properties": {
    "redirect_uri": {
      "type": "string",
      "example": "https://yourdomain.com/audible/callback"
    }
  }
}
```

**Response Schema** (200 OK):
```json
{
  "$ref": "#/components/schemas/AudibleOAuthUrlResponse",
  "properties": {
    "auth_url": {
      "type": "string",
      "example": "https://www.audible.com/auth/oauth2/authorize?..."
    },
    "state": {
      "type": "string",
      "example": "8Zm9sTkVUqx6IwYw_sWvUf7XqzYo2ixqpXJwH3K-oqc"
    },
    "code_challenge": {
      "type": "string",
      "example": "E9Mrozoa2owUedPnxbYo0zIWXoSEAaoDhWE3jLMQkwo"
    },
    "code_challenge_method": {
      "type": "string",
      "enum": ["S256"],
      "example": "S256"
    }
  }
}
```

**Status Codes**:
- 200: Success
- 400: Invalid request
- 403: User not premium/family
- 503: Audible not configured

#### POST /user/audible/oauth/callback

**OpenAPI Path**: `/user/audible/oauth/callback`

**OpenAPI Method**: `post`

**Request Schema**:
```json
{
  "$ref": "#/components/schemas/AudibleOAuthCallback",
  "properties": {
    "code": {
      "type": "string",
      "description": "Authorization code from Audible",
      "example": "authorization_code_xyz"
    },
    "state": {
      "type": "string",
      "description": "CSRF state token from authorize request",
      "example": "8Zm9sTkVUqx6IwYw_sWvUf7XqzYo2ixqpXJwH3K-oqc"
    }
  }
}
```

**Response Schema** (200 OK):
```json
{
  "type": "object",
  "properties": {
    "status": {
      "type": "string",
      "enum": ["connected"],
      "example": "connected"
    },
    "audible_user_id": {
      "type": "string",
      "example": "amzn1.ask.account.EXAMPLE_USER_ID"
    },
    "synced_at": {
      "type": "string",
      "format": "date-time",
      "example": "2026-01-27T14:35:00Z"
    }
  }
}
```

#### GET /user/audible/connected

**OpenAPI Path**: `/user/audible/connected`

**OpenAPI Method**: `get`

**Request Parameters**: None

**Response Schema** (200 OK):
```json
{
  "$ref": "#/components/schemas/AudibleConnectionResponse",
  "properties": {
    "connected": {
      "type": "boolean",
      "example": true
    },
    "audible_user_id": {
      "type": "string",
      "nullable": true,
      "example": "amzn1.ask.account.EXAMPLE_USER_ID"
    },
    "synced_at": {
      "type": "string",
      "format": "date-time",
      "nullable": true,
      "example": "2026-01-27T14:35:00Z"
    },
    "last_sync_error": {
      "type": "string",
      "nullable": true,
      "example": null
    }
  }
}
```

#### GET /user/audible/library

**OpenAPI Path**: `/user/audible/library`

**OpenAPI Method**: `get`

**Query Parameters**:
```json
{
  "parameters": [
    {
      "name": "skip",
      "in": "query",
      "required": false,
      "schema": {
        "type": "integer",
        "default": 0,
        "minimum": 0
      },
      "description": "Number of results to skip (offset)"
    },
    {
      "name": "limit",
      "in": "query",
      "required": false,
      "schema": {
        "type": "integer",
        "default": 20,
        "minimum": 1,
        "maximum": 100
      },
      "description": "Number of results per page"
    }
  ]
}
```

**Response Schema** (200 OK):
```json
{
  "type": "array",
  "items": {
    "$ref": "#/components/schemas/AudibleAudiobookResponse"
  }
}
```

#### GET /user/audible/search

**OpenAPI Path**: `/user/audible/search`

**OpenAPI Method**: `get`

**Query Parameters**:
```json
{
  "parameters": [
    {
      "name": "q",
      "in": "query",
      "required": true,
      "schema": {
        "type": "string",
        "minLength": 2
      },
      "description": "Search query (title, author, narrator)"
    },
    {
      "name": "limit",
      "in": "query",
      "required": false,
      "schema": {
        "type": "integer",
        "default": 20,
        "minimum": 1,
        "maximum": 50
      },
      "description": "Number of results"
    }
  ]
}
```

**Response Schema** (200 OK):
```json
{
  "type": "array",
  "items": {
    "$ref": "#/components/schemas/AudibleAudiobookResponse"
  }
}
```

---

## SECURITY SCHEMES

### Authentication: Bearer Token

**Type**: HTTP Bearer

**Scheme**: `Bearer`

**Format**: JWT Token

**OpenAPI Definition**:
```json
{
  "components": {
    "securitySchemes": {
      "HTTPBearer": {
        "type": "http",
        "scheme": "bearer",
        "bearerFormat": "JWT"
      }
    }
  }
}
```

**Usage in Endpoints**:
```json
{
  "security": [
    {
      "HTTPBearer": []
    }
  ]
}
```

**Example Header**:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## SCHEMA DEFINITIONS

### AudibleOAuthRequest

```json
{
  "type": "object",
  "title": "AudibleOAuthRequest",
  "description": "Request for Audible OAuth authorization URL",
  "properties": {
    "redirect_uri": {
      "type": "string",
      "title": "Redirect Uri",
      "description": "Redirect URI for OAuth callback",
      "example": "https://yourdomain.com/audible/callback"
    }
  },
  "required": ["redirect_uri"]
}
```

### AudibleOAuthCallback

```json
{
  "type": "object",
  "title": "AudibleOAuthCallback",
  "description": "Audible OAuth callback with authorization code",
  "properties": {
    "code": {
      "type": "string",
      "title": "Code",
      "description": "Authorization code from Audible"
    },
    "state": {
      "type": "string",
      "title": "State",
      "description": "CSRF state token"
    }
  },
  "required": ["code", "state"]
}
```

### AudibleOAuthUrlResponse

```json
{
  "type": "object",
  "title": "AudibleOAuthUrlResponse",
  "description": "Response containing OAuth authorization URL and PKCE/state details",
  "properties": {
    "auth_url": {
      "type": "string",
      "title": "Auth Url",
      "description": "OAuth authorization URL"
    },
    "state": {
      "type": "string",
      "title": "State",
      "description": "CSRF protection state token"
    },
    "code_challenge": {
      "type": "string",
      "title": "Code Challenge",
      "description": "PKCE code challenge (S256)"
    },
    "code_challenge_method": {
      "type": "string",
      "title": "Code Challenge Method",
      "default": "S256",
      "enum": ["S256"]
    }
  },
  "required": ["auth_url", "state", "code_challenge", "code_challenge_method"]
}
```

### AudibleConnectionResponse

```json
{
  "type": "object",
  "title": "AudibleConnectionResponse",
  "description": "Response for Audible account connection status",
  "properties": {
    "connected": {
      "type": "boolean",
      "title": "Connected",
      "description": "Whether user has connected Audible account"
    },
    "audible_user_id": {
      "type": "string",
      "nullable": true,
      "title": "Audible User Id",
      "description": "Audible user ID if connected"
    },
    "synced_at": {
      "type": "string",
      "format": "date-time",
      "nullable": true,
      "title": "Synced At",
      "description": "When library was last synced"
    },
    "last_sync_error": {
      "type": "string",
      "nullable": true,
      "title": "Last Sync Error",
      "description": "Error message from last sync attempt"
    }
  },
  "required": ["connected"]
}
```

### AudibleAudiobookResponse

```json
{
  "type": "object",
  "title": "AudibleAudiobookResponse",
  "description": "Response model for Audible audiobook",
  "properties": {
    "asin": {
      "type": "string",
      "title": "Asin",
      "description": "Audible's unique identifier (B + 9 chars)",
      "example": "B0ABCDEF1234"
    },
    "title": {
      "type": "string",
      "title": "Title",
      "description": "Book title",
      "example": "The Midnight Library"
    },
    "author": {
      "type": "string",
      "title": "Author",
      "description": "Author name",
      "example": "Matt Haig"
    },
    "narrator": {
      "type": "string",
      "nullable": true,
      "title": "Narrator",
      "description": "Narrator name",
      "example": "Davina Porter"
    },
    "image": {
      "type": "string",
      "nullable": true,
      "title": "Image",
      "description": "Cover image URL",
      "example": "https://images.audible.com/images/w/..."
    },
    "description": {
      "type": "string",
      "nullable": true,
      "title": "Description",
      "description": "Book description",
      "example": "A dazzling novel about all the choices..."
    },
    "duration_minutes": {
      "type": "integer",
      "nullable": true,
      "title": "Duration Minutes",
      "description": "Duration in minutes",
      "example": 504
    },
    "rating": {
      "type": "number",
      "nullable": true,
      "title": "Rating",
      "description": "Rating (0-5 stars)",
      "example": 4.5
    },
    "is_owned": {
      "type": "boolean",
      "title": "Is Owned",
      "description": "Whether user owns this audiobook",
      "default": false
    },
    "source": {
      "type": "string",
      "title": "Source",
      "description": "Content source",
      "default": "audible",
      "enum": ["audible"]
    }
  },
  "required": ["asin", "title", "author", "is_owned", "source"]
}
```

---

## USING OPENAPI WITH TOOLS

### Code Generation

**OpenAPI Generator** (openapi-generator-cli):

```bash
# Generate Python client
openapi-generator-cli generate \
  -i http://localhost:8090/api/v1/openapi.json \
  -g python \
  -o ./audible-python-client

# Generate TypeScript client
openapi-generator-cli generate \
  -i http://localhost:8090/api/v1/openapi.json \
  -g typescript-axios \
  -o ./audible-typescript-client
```

### API Testing

**Postman** (import OpenAPI spec):

```bash
# Import into Postman
1. Open Postman
2. Click "Import"
3. Select "Link"
4. Paste: http://localhost:8090/api/v1/openapi.json
5. Create new environment
6. Set variables:
   - base_url: http://localhost:8090
   - token: YOUR_JWT_TOKEN
```

**Insomnia** (similar process):

```bash
# Import into Insomnia
1. File → Import → From URL
2. Paste: http://localhost:8090/api/v1/openapi.json
3. Create environment with token variable
```

### IDE Integration

**Visual Studio Code** (REST Client Extension):

```http
### Set environment variables
@baseUrl = http://localhost:8090
@token = your_jwt_token_here

### Get authorization URL
POST {{baseUrl}}/user/audible/oauth/authorize
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "redirect_uri": "https://yourdomain.com/callback"
}

### Check connection
GET {{baseUrl}}/user/audible/connected
Authorization: Bearer {{token}}
```

---

## ERROR RESPONSES IN OPENAPI

### Error Response Schema

```json
{
  "type": "object",
  "properties": {
    "detail": {
      "type": "string",
      "description": "Error code or message",
      "example": "audible_requires_premium"
    }
  }
}
```

### Common Error Codes Documented

| Status | Error Code | Meaning |
|--------|-----------|---------|
| 400 | `invalid_state_parameter` | CSRF state mismatch |
| 400 | `audible_callback_failed` | Token exchange failed |
| 403 | `audible_requires_premium` | User not premium/family |
| 404 | `audiobook_not_found` | ASIN not found |
| 503 | `audible_integration_not_configured` | OAuth credentials missing |
| 503 | `audible_service_unavailable` | Audible API error |

---

## SWAGGER UI FEATURES

### Interactive Testing

In Swagger UI (`/docs`):

1. **Authorize** button - Set JWT token
2. **Try it out** button - Test endpoint with custom parameters
3. **Execute** button - Send request and view response
4. **Response** section - See status, body, headers

### Schema Browser

- Click on model names to expand/collapse
- See all properties and types
- View example data
- Check required fields

### Curl Command

Copy auto-generated curl command:
```bash
curl -X POST "http://localhost:8090/user/audible/oauth/authorize" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"redirect_uri":"..."}'
```

---

## BEST PRACTICES

### When Using OpenAPI Specification

1. **Always Keep Generated Code In Sync**
   - Regenerate clients when API changes
   - Use CI/CD to detect OpenAPI spec changes

2. **Document API Changes**
   - Update docstrings when changing endpoints
   - Bump version in OpenAPI metadata

3. **Use Type-Safe Generated Clients**
   - Prefer generated clients over manual HTTP calls
   - Reduces errors and improves maintainability

4. **Test Against Live Spec**
   - Include OpenAPI JSON in API responses
   - Tools can validate against spec automatically

5. **Version Your API**
   - Use `/api/v1` for current version
   - Plan `/api/v2` for breaking changes

---

## TROUBLESHOOTING OPENAPI

### Endpoints Not Showing in Swagger

**Cause**: Missing `response_model` in endpoint

**Fix**:
```python
# Wrong
@router.get("/endpoint")
async def get_data():
    return {}

# Correct
@router.get("/endpoint", response_model=MyResponse)
async def get_data() -> MyResponse:
    return MyResponse()
```

### Schema Not Generating

**Cause**: Pydantic model not properly defined

**Fix**:
```python
# Wrong
class MyModel:
    field: str

# Correct
from pydantic import BaseModel

class MyModel(BaseModel):
    field: str
```

### Type Information Missing

**Cause**: No type hints in code

**Fix**:
```python
# Wrong
async def get_data(limit):
    return []

# Correct
async def get_data(limit: int) -> List[MyModel]:
    return []
```

---

## DOCUMENTATION RESOURCES

**Official OpenAPI Specification**:
https://spec.openapis.org/oas/v3.0.0

**FastAPI OpenAPI Support**:
https://fastapi.tiangolo.com/how-to/extending-openapi/

**Swagger Tools**:
https://swagger.io/tools/

---

**Last Updated**: 2026-01-27
**API Version**: v1
**OpenAPI Version**: 3.0.0
**Status**: Production Ready
