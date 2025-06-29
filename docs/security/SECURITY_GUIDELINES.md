# OLORIN Web Plugin Security Guidelines

## Overview

This document outlines security best practices and requirements for the OLORIN Web Plugin frontend application. All developers must follow these guidelines to ensure the security and integrity of the fraud investigation platform.

## 1. Authentication & Authorization

### 1.1 Token Management

**Requirements:**
- Use secure token storage (sessionStorage with encryption)
- Implement token expiration (24-hour default)
- Clear tokens on logout and session timeout
- Never store tokens in localStorage for production

**Implementation:**
```typescript
// Use SecureTokenStorage class
import { SecureTokenStorage } from '../services/secureStorage';

// Set token with expiration
SecureTokenStorage.setToken(authToken, 24); // 24 hours

// Get token (returns null if expired)
const token = SecureTokenStorage.getToken();

// Clear token on logout
SecureTokenStorage.clearToken();
```

### 1.2 API Authentication

**Requirements:**
- Include Bearer token in all API requests
- Implement automatic token refresh
- Handle 401 responses with re-authentication
- Use consistent authorization headers

**Implementation:**
```typescript
const headers = {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json',
  'X-CSRF-Token': await CSRFProtection.getCSRFToken(),
};
```

## 2. Network Security

### 2.1 Protocol Requirements

**Non-Local Environments:**
- ✅ **REQUIRED**: HTTPS for all API calls (E2E testing, PRF/STG/PROD production)
- ✅ **REQUIRED**: WSS for WebSocket connections (E2E testing, PRF/STG/PROD production)
- ❌ **FORBIDDEN**: HTTP in non-local environments (E2E, PRF, STG, PROD)
- ❌ **FORBIDDEN**: WS in non-local environments (E2E, PRF, STG, PROD)

**Local Development:**
- ✅ **ALLOWED**: HTTP/WS for localhost only

### 2.2 Environment Configuration

```typescript
// Correct configuration for all non-local environments
const ENVIRONMENTS = {
  e2e: {  // Testing Environment
    olorin: { baseUrl: 'https://olorin-e2e.api.intuit.com/' },
    mcp: { 
      baseUrl: 'https://olorin-e2e.api.intuit.com:3000',
      wsUrl: 'wss://olorin-e2e.api.intuit.com:3000/ws'
    }
  },
  prf: {  // Production Environment
    olorin: { baseUrl: 'https://olorin-prf.api.intuit.com/' },
    mcp: { 
      baseUrl: 'https://olorin-prf.api.intuit.com:3000',
      wsUrl: 'wss://olorin-prf.api.intuit.com:3000/ws'
    }
  }
};
```

### 2.3 CORS & CSRF Protection

**Requirements:**
- Implement CSRF tokens for state-changing operations
- Validate CORS headers for cross-origin requests
- Use SameSite cookies when applicable

**Implementation:**
```typescript
// CSRF protection
import { CSRFProtection } from '../services/csrfProtection';

const headers = await CSRFProtection.getHeaders();
```

## 3. Data Handling & Validation

### 3.1 Input Validation

**Requirements:**
- Validate all user inputs client-side AND server-side
- Sanitize data before display
- Use schema validation for API responses
- Prevent XSS attacks through proper encoding

**Implementation:**
```typescript
// API response validation
import { validateToolResponse } from '../services/apiValidation';

const validatedResponse = validateToolResponse(apiResponse);
```

### 3.2 Sensitive Data Protection

**Requirements:**
- Never log sensitive data (tokens, passwords, PII)
- Encrypt sensitive data in storage
- Clear sensitive data from memory after use
- Use secure random number generation

**Implementation:**
```typescript
// Secure data handling
const sensitiveData = processData(input);
// Use data...
sensitiveData.clear(); // Clear from memory
```

## 4. WebSocket Security

### 4.1 Connection Security

**Requirements:**
- Use WSS (WebSocket Secure) in production
- Authenticate WebSocket connections
- Implement connection rate limiting
- Handle reconnection securely

**Implementation:**
```typescript
// Secure WebSocket client
import { SecureWebSocketClient } from '../services/secureWebSocket';

const wsClient = new SecureWebSocketClient(wsUrl, authToken);
await wsClient.connect();
```

### 4.2 Message Validation

**Requirements:**
- Validate all incoming WebSocket messages
- Sanitize message content before processing
- Implement message size limits
- Handle malformed messages gracefully

## 5. Error Handling & Logging

### 5.1 Secure Error Handling

**Requirements:**
- Never expose sensitive information in error messages
- Log security events for monitoring
- Implement proper error boundaries
- Provide user-friendly error messages

**Do's and Don'ts:**
```typescript
// ❌ DON'T: Expose sensitive data
throw new Error(`Authentication failed for token: ${token}`);

// ✅ DO: Generic error messages
throw new Error('Authentication failed. Please login again.');
```

### 5.2 Security Logging

**Requirements:**
- Log authentication failures
- Monitor for suspicious activity
- Track API endpoint usage
- Implement audit trails for sensitive operations

## 6. Content Security Policy (CSP)

### 6.1 CSP Headers

**Required CSP directives:**
```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data:;
  connect-src 'self' wss: https:;
  font-src 'self';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
">
```

## 7. Dependency Security

### 7.1 Package Management

**Requirements:**
- Regularly update dependencies
- Audit packages for vulnerabilities
- Use package-lock.json for reproducible builds
- Avoid packages with known security issues

**Commands:**
```bash
# Audit dependencies
npm audit

# Fix vulnerabilities
npm audit fix

# Check for outdated packages
npm outdated
```

### 7.2 Third-Party Libraries

**Requirements:**
- Vet all third-party libraries
- Use minimal necessary permissions
- Prefer well-maintained libraries
- Document security implications

## 8. Development Security Practices

### 8.1 Code Review Requirements

**Security checklist for code reviews:**
- [ ] No hardcoded secrets or credentials
- [ ] Proper input validation
- [ ] Secure API endpoint usage
- [ ] Appropriate error handling
- [ ] HTTPS/WSS usage in production
- [ ] Token storage security
- [ ] XSS prevention measures

### 8.2 Testing Security

**Requirements:**
- Include security tests in test suites
- Test authentication flows
- Validate input sanitization
- Test error handling scenarios

```