# One Click Portal API Contracts

This directory contains the complete API contract specifications for CVPlus One Click Portal feature.

## Overview

The One Click Portal API enables premium users to generate fully functional web portals from their CVs with integrated RAG-powered chat functionality. The API is built on Firebase Functions and follows REST principles with OpenAPI 3.0.3 specifications.

## Files Structure

```
contracts/
├── openapi.yaml          # Main OpenAPI specification with global configuration
├── portal-api.yaml       # Portal generation and management endpoints
├── chat-api.yaml         # RAG chat functionality endpoints
├── analytics-api.yaml    # Portal analytics and tracking endpoints
├── schemas.yaml          # Shared data schemas and models
└── README.md            # This implementation guide
```

## API Categories

### 1. Portal Generation (`portal-api.yaml`)
- **POST** `/api/portal/generate` - One-click portal creation
- **GET** `/api/portal/status/{deploymentId}` - Generation progress tracking
- **POST** `/api/portal/regenerate/{portalId}` - Re-create portal with new settings
- **GET** `/api/portal/{portalId}` - Retrieve portal configuration
- **PUT** `/api/portal/{portalId}/settings` - Update portal customization
- **DELETE** `/api/portal/{portalId}` - Deactivate portal
- **GET** `/api/portals/user/{userId}` - List user's portals

### 2. RAG Chat (`chat-api.yaml`)
- **POST** `/api/portal/{portalId}/chat` - Send message to portal AI
- **GET** `/api/portal/{portalId}/chat/history` - Retrieve chat history
- **POST** `/api/portal/{portalId}/chat/session` - Initialize chat session
- **DELETE** `/api/portal/{portalId}/chat/session/{sessionId}` - End chat session
- **GET** `/api/portal/{portalId}/chat/session/{sessionId}` - Get session details

### 3. Analytics (`analytics-api.yaml`)
- **GET** `/api/portal/{portalId}/analytics` - Portal engagement metrics
- **POST** `/api/portal/{portalId}/visit` - Track visitor interaction
- **GET** `/api/portal/{portalId}/visitors` - Visitor analytics data

## Key Features

### Authentication & Authorization
- **Firebase Authentication**: All endpoints require Firebase ID tokens
- **Premium Access Control**: Portal generation requires active premium subscription
- **Public Access**: Chat and analytics tracking endpoints support anonymous access
- **Rate Limiting**: Comprehensive rate limiting per user/IP/session

### Performance SLAs
- **Portal Generation**: <60 seconds end-to-end
- **Chat Response**: <3 seconds with RAG context
- **API Response**: <500ms p95 latency
- **Concurrent Users**: 10,000 target capacity

### Error Handling
- **RFC 7807 Compliance**: Standardized error format
- **CVPlus-Specific Codes**: Detailed error categorization
- **Retry Logic**: Clear guidance on retryable operations
- **Support Integration**: Request IDs and support references

## Implementation Roadmap

### Phase 1: Core Portal APIs (Weeks 1-2)
1. **Portal Generation Endpoints**
   - Implement `POST /api/portal/generate` with basic functionality
   - Add `GET /api/portal/status/{deploymentId}` for progress tracking
   - Create portal configuration management endpoints

2. **Firebase Integration**
   - Set up Firebase Functions structure in `packages/public-profiles/backend`
   - Implement premium subscription validation middleware
   - Configure Firestore collections per data model

3. **Basic Error Handling**
   - Implement standardized error response format
   - Add request validation and sanitization
   - Set up logging and monitoring

### Phase 2: RAG Chat Implementation (Weeks 2-3)
1. **Vector Database Setup**
   - Integrate ChromaDB for CV embeddings storage
   - Implement embedding generation service
   - Create semantic search and retrieval functions

2. **Chat API Endpoints**
   - Implement `POST /api/portal/{portalId}/chat` with RAG functionality
   - Add session management endpoints
   - Create chat history and context tracking

3. **AI Integration**
   - Enhance existing Claude/OpenAI integration for chat responses
   - Implement confidence scoring and source citations
   - Add conversation context and follow-up suggestions

### Phase 3: Analytics & Monitoring (Weeks 3-4)
1. **Analytics Collection**
   - Implement visitor tracking endpoints
   - Create analytics data aggregation services
   - Add real-time analytics dashboard data

2. **Performance Optimization**
   - Implement caching layers for portal configurations
   - Optimize vector search performance
   - Add CDN integration for static assets

3. **Advanced Features**
   - Custom domain support
   - Portal theme customization
   - SEO optimization features

## Integration Points

### Existing CVPlus Services
The Portal API integrates with existing CVPlus infrastructure:

- **`@cvplus/core`**: Shared types and utilities
- **`@cvplus/auth`**: User authentication and session management
- **`@cvplus/premium`**: Subscription validation and feature gating
- **`@cvplus/analytics`**: Event tracking and metrics collection
- **`@cvplus/public-profiles`**: Enhanced with Portal functionality

### External Services
- **Firebase**: Functions, Firestore, Storage, Authentication
- **ChromaDB**: Vector database for RAG embeddings
- **OpenAI/Claude**: AI services for chat responses
- **CDN**: Static asset delivery for generated portals

## Security Considerations

### Data Protection
- **CV Content Encryption**: All CV data encrypted at rest
- **Anonymous Chat**: Chat sessions use anonymous tokens
- **GDPR Compliance**: User data handling follows GDPR requirements
- **Rate Limiting**: Comprehensive protection against abuse

### Access Control
- **Portal Ownership**: Strict validation of portal ownership for modifications
- **Public Portal Access**: Safe anonymous access to public portals
- **Premium Feature Gating**: Server-side validation of subscription status
- **API Key Security**: Secure handling of external service API keys

## Testing Strategy

### API Testing
```bash
# Run API integration tests
npm run test:api

# Test specific endpoint categories
npm run test:portal-generation
npm run test:chat-functionality
npm run test:analytics-tracking
```

### Load Testing
```bash
# Portal generation load test
npm run test:load:generation

# Chat system performance test
npm run test:load:chat

# Analytics ingestion test
npm run test:load:analytics
```

### End-to-End Testing
```bash
# Full portal lifecycle test
npm run test:e2e:portal-lifecycle

# Multi-user chat test
npm run test:e2e:chat-sessions

# Analytics accuracy test
npm run test:e2e:analytics-flow
```

## Deployment Configuration

### Firebase Functions
```typescript
// functions/src/index.ts - Main entry point
export * from './portal/generate-portal';
export * from './portal/portal-management';
export * from './chat/portal-chat';
export * from './chat/session-management';
export * from './analytics/visitor-tracking';
export * from './analytics/portal-metrics';
```

### Environment Variables
```bash
# Premium feature validation
PREMIUM_TIER_REQUIRED=premium

# Rate limiting configuration
PORTAL_GENERATION_LIMIT=10
CHAT_MESSAGE_LIMIT=100

# External service configuration
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=...
CHROMADB_URL=http://...

# Performance monitoring
ENABLE_DETAILED_LOGGING=true
SENTRY_DSN=https://...
```

### Firestore Security Rules
```javascript
// Portal access control
match /portalConfigurations/{portalId} {
  allow read: if isOwnerOrPublic(portalId);
  allow write: if isOwner(portalId) && isPremiumUser();
}

// Chat session management
match /chatSessions/{sessionId} {
  allow read, write: if validSessionAccess(sessionId);
}

// Analytics data protection
match /portalAnalytics/{analyticsId} {
  allow read: if isPortalOwner(analyticsId);
  allow write: if false; // Server-only writes
}
```

## Monitoring & Observability

### Key Metrics
- Portal generation success rate and latency
- Chat response times and accuracy scores
- API error rates and response times
- User engagement and conversion metrics

### Alerts Configuration
```yaml
# Critical alerts
portal_generation_failure_rate:
  threshold: ">5%"
  severity: critical

chat_service_downtime:
  threshold: ">30s"
  severity: critical

# Performance alerts
portal_generation_latency:
  threshold: ">45s"
  severity: warning

chat_response_latency:
  threshold: ">3s"
  severity: warning
```

### Logging Standards
```typescript
// Structured logging format
logger.info('[PORTAL-GENERATION] Portal created successfully', {
  portalId: 'portal_abc123',
  userId: 'user_456',
  generationTime: 42.3,
  features: ['aiChat', 'analytics']
});

logger.error('[CHAT-SERVICE] RAG query failed', {
  portalId: 'portal_abc123',
  sessionId: 'session_789',
  error: error.message,
  retryable: true
});
```

## Support & Troubleshooting

### Common Issues
1. **Portal Generation Timeout**: Check CV processing status and retry
2. **Chat Response Errors**: Verify RAG embeddings are generated
3. **Permission Denied**: Validate premium subscription status
4. **Rate Limit Exceeded**: Implement exponential backoff

### Debug Endpoints
```typescript
// Debug portal generation status
GET /api/debug/portal/{portalId}/generation-logs

// Debug chat RAG performance
GET /api/debug/chat/{sessionId}/rag-metrics

// Debug subscription validation
GET /api/debug/user/{userId}/premium-status
```

### Support Integration
- **Request IDs**: Every API response includes unique request ID
- **Error Codes**: Machine-readable error codes for automated handling
- **Support References**: Links to relevant documentation and support

---

## Quick Start

1. **Review API Specifications**: Start with `openapi.yaml` for overview
2. **Understand Data Model**: Review `schemas.yaml` for all data structures
3. **Implement Core Features**: Begin with portal generation endpoints
4. **Add RAG Functionality**: Implement chat system with vector search
5. **Enable Analytics**: Add visitor tracking and metrics collection
6. **Test & Deploy**: Use comprehensive testing strategy before production

For detailed implementation guidance, refer to the individual API specification files and the main project documentation at `/docs/`.