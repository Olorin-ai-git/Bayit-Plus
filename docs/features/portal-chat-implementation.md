# Portal Chat Implementation

## Overview
The Portal Chat feature provides real-time AI-powered chat functionality for CVPlus web portals deployed on HuggingFace Spaces. This feature enables visitors to interact with an AI assistant that has comprehensive knowledge of the CV owner's professional background.

## Firebase Functions

### 1. `portalChat` (Callable Function)
**Purpose**: Authenticated chat interactions for logged-in users
**Endpoint**: `https://us-central1-[project-id].cloudfunctions.net/portalChat`

**Request Parameters:**
```typescript
{
  portalId: string;        // Portal identifier
  message: string;         // User message (max 1000 chars)
  userId?: string;         // Optional user ID
  sessionId?: string;      // Session ID for conversation tracking
  visitorMetadata?: {      // Optional visitor information
    userAgent?: string;
    referrer?: string;
    ipAddress?: string;
    location?: string;
  };
}
```

**Response:**
```typescript
{
  success: boolean;
  response: {
    content: string;       // AI response
    timestamp: Date;
    messageId: string;
    sources?: string[];    // CV sections that informed the response
    confidence?: number;   // Response confidence (0-1)
  };
  session: {
    sessionId: string;
    messageCount: number;
  };
  suggestedQuestions?: string[];  // Follow-up question suggestions
  rateLimiting: {
    remaining: number;     // Messages remaining in current window
    resetTime: Date;       // When rate limit resets
  };
}
```

### 2. `portalChatPublic` (HTTP Function)
**Purpose**: Public chat access for HuggingFace Spaces and external portals
**Endpoint**: `https://us-central1-[project-id].cloudfunctions.net/portalChatPublic`
**Method**: POST
**CORS**: Configured for HuggingFace domains

**Usage Example:**
```javascript
const response = await fetch('https://us-central1-[project-id].cloudfunctions.net/portalChatPublic', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    portalId: 'portal-123',
    message: 'What is your experience with React?',
    sessionId: 'session-456' // Optional
  })
});
```

### 3. `getPortalChatAnalytics` (Callable Function)
**Purpose**: Retrieve chat analytics for portal owners
**Authentication**: Required (portal owner only)

**Request Parameters:**
```typescript
{
  portalId: string;
  timeRange?: string;  // '24h', '7d', '30d' (default: '7d')
}
```

## Key Features

### RAG-Based Context Retrieval
- Uses vector embeddings to find relevant CV content
- Retrieves top-K most similar chunks for each query
- Provides source attribution for responses

### Rate Limiting
- 10 messages per minute per session
- 100 messages per hour per session
- 5 concurrent sessions per IP address
- 30-minute session timeout

### Security Features
- Input validation and sanitization
- Prompt injection detection
- CORS protection for HuggingFace origins
- Rate limiting per IP/session
- Content filtering for suspicious patterns

### Chat Personality
- Professional tone matching CV owner's background
- Contextual responses based on actual CV data
- Fallback responses for unrelated queries
- Source attribution for transparency

### Analytics & Tracking
- Session tracking and conversation history
- Response time and confidence monitoring
- User engagement metrics
- Quality scoring and feedback collection

## Integration Points

### With Existing CVPlus Systems
- **Embedding Service**: Uses existing RAG embeddings for context retrieval
- **Verified Claude Service**: Leverages verified AI responses with quality checks
- **Portal Generation**: Integrates with generated web portals
- **Analytics System**: Connects with existing portal analytics

### With HuggingFace Spaces
- **CORS Configuration**: Allows requests from HF Space domains
- **Public HTTP Endpoint**: Direct access without authentication
- **Error Handling**: Graceful degradation for API failures

## Database Collections

### `portalChatSessions`
```typescript
{
  sessionId: string;
  portalId: string;
  userId?: string;
  createdAt: Date;
  lastActivity: Date;
  messageCount: number;
  visitorMetadata: object;
  status: 'active' | 'ended';
}
```

### `portalChatMessages`
```typescript
{
  messageId: string;
  sessionId: string;
  portalId: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  responseTime?: number;
  quality?: {
    confidence: number;
    sourceRelevance: number;
  };
}
```

## Configuration

### Environment Variables
- `ANTHROPIC_API_KEY`: Required for Claude AI responses
- `OPENAI_API_KEY`: Required for embeddings (if using OpenAI)

### Rate Limiting Configuration
```typescript
const RATE_LIMIT_CONFIG = {
  messagesPerMinute: 10,
  messagesPerHour: 100,
  maxConcurrentSessions: 5,
  sessionTimeoutMinutes: 30
};
```

### Chat Configuration
```typescript
const CHAT_CONFIG = {
  maxMessageLength: 1000,
  maxResponseTokens: 800,
  temperature: 0.7,
  topK: 5, // Relevant chunks to retrieve
  confidenceThreshold: 0.3
};
```

## Error Handling

### Common Error Codes
- `invalid-argument`: Invalid input parameters
- `not-found`: Portal or session not found
- `permission-denied`: Chat disabled or access restricted
- `resource-exhausted`: Rate limit exceeded
- `failed-precondition`: RAG system not available
- `internal`: System error

### Fallback Mechanisms
- Graceful degradation when RAG system fails
- Default responses for system errors
- Retry logic for transient failures

## Performance Considerations

### Response Time Optimization
- Target response time: < 3 seconds
- Efficient vector search implementation
- Optimized embedding retrieval
- Claude API timeout handling

### Scalability Features
- Session-based rate limiting
- Memory optimization for concurrent users
- Efficient Firestore queries
- Background analytics processing

## Future Enhancements

### Planned Features
- Multi-language support
- Voice message support
- Enhanced personality customization
- Advanced analytics dashboard
- A/B testing for response quality

### Integration Opportunities
- Calendar booking integration
- Contact form pre-filling
- Social media link sharing
- Portfolio showcase integration

---

**Author**: Gil Klainert  
**Date**: 2025-08-19  
**Version**: 1.0