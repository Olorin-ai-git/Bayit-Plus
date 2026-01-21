# Secure Environment Configuration System

## Overview

The CVPlus Firebase Functions now include a comprehensive security-hardened environment configuration system that addresses critical security vulnerabilities through multiple layers of protection:

## 🔒 Security Features Implemented

### 1. **Input Validation & Sanitization**
- **XSS Prevention**: Removes dangerous HTML/script injection characters (`<>'"&`)
- **Path Traversal Protection**: Prevents `../` directory traversal attacks
- **Length Limits**: Enforces maximum string lengths (500 chars default)
- **Format Validation**: Validates API keys, emails, URLs, and boolean values
- **Encoding Protection**: Handles newlines and special characters safely

### 2. **API Key Security**
- **Format Validation**: Validates known API key patterns (OpenAI, Pinecone, ElevenLabs, etc.)
- **Suspicious Pattern Detection**: Identifies potential injection attempts
- **Length Verification**: Ensures keys meet minimum/maximum length requirements
- **Character Validation**: Validates allowed character sets for each key type

### 3. **URL Security**
- **HTTPS Enforcement**: Requires HTTPS URLs in production environment
- **Host Allowlisting**: Restricts URLs to approved domains
- **Malformed URL Detection**: Validates URL structure and format

### 4. **Required Variable Enforcement**
- **Critical Variables**: `PROJECT_ID`, `STORAGE_BUCKET` (deployment fails without these)
- **Important Variables**: `OPENAI_API_KEY`, `WEB_API_KEY`, `AUTH_DOMAIN` (warnings generated)
- **Startup Validation**: Checks all required variables before initialization

### 5. **Security Event Monitoring**
- **Event Types**: `MISSING_REQUIRED_VAR`, `INVALID_FORMAT`, `SUSPICIOUS_VALUE`, etc.
- **Severity Classification**: CRITICAL, HIGH, MEDIUM, LOW levels
- **Alert System**: Automatic alerts when thresholds are exceeded
- **Audit Trail**: Comprehensive logging without exposing sensitive data

## 📁 File Structure

```
functions/src/config/
├── environment.ts              # Main secure configuration system
├── security-monitor.ts         # Security event monitoring and alerting
├── __tests__/
│   ├── environment.test.ts     # Comprehensive environment tests
│   └── security-monitor.test.ts # Security monitoring tests
└── README.md                   # This documentation

functions/src/api/
└── config-health.ts           # Health check and security reporting endpoints
```

## 🚀 Usage

### Basic Configuration Access

```typescript
import { config, environmentUtils } from '../config/environment';

// Safe configuration access
console.log(config.firebase.projectId);
console.log(config.openai.apiKey);

// Check service availability
if (environmentUtils.isServiceAvailable('openai')) {
  // Use OpenAI service
}
```

### Health Monitoring

```typescript
import { environmentUtils } from '../config/environment';

// Check system health
const health = environmentUtils.performHealthCheck();
console.log(`System status: ${health.status}`);
console.log(`Health: ${health.details.healthPercentage}%`);

// Validate configuration
const validation = environmentUtils.validateConfiguration();
if (!validation.isValid) {
  console.error('Configuration errors:', validation.errors);
}
```

### Security Monitoring

```typescript
import { securityMonitor, reportSecurityEvent } from '../config/security-monitor';
import { SecurityEventType } from '../config/environment';

// Report security event
const eventId = reportSecurityEvent(
  SecurityEventType.SUSPICIOUS_VALUE,
  'api-validator',
  'Suspicious API key detected',
  { keyName: 'CUSTOM_API_KEY' }
);

// Get security metrics
const metrics = securityMonitor.getSecurityMetrics();
console.log(`Security score: ${metrics.securityScore}/100`);

// Generate security report
const report = securityMonitor.generateSecurityReport();
console.log('Recommendations:', report.recommendations);
```

## 🏥 Health Check Endpoints

### 1. Configuration Health Check
```bash
GET /configHealthCheck
Authorization: Bearer {HEALTH_CHECK_TOKEN}
```

**Response:**
```json
{
  "status": "healthy|degraded|unhealthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "services": {
    "firebase": true,
    "openai": true,
    "email": false
  },
  "configuration": {
    "isValid": true,
    "errors": [],
    "warnings": ["Missing email configuration"]
  },
  "security": {
    "score": 95,
    "recentEvents": 2,
    "activeAlerts": 0
  }
}
```

### 2. Security Report
```bash
GET /securityReport?hours=24&severity=HIGH
Authorization: Bearer {SECURITY_REPORT_TOKEN}
```

**Response:**
```json
{
  "summary": {
    "totalEvents": 15,
    "securityScore": 87,
    "alertsTriggered": 1
  },
  "recentEvents": [...],
  "activeAlerts": [...],
  "recommendations": [
    "Review configuration warnings to ensure full functionality"
  ]
}
```

### 3. Configuration Validation
```bash
POST /validateConfiguration
Authorization: Bearer {CONFIG_ADMIN_TOKEN}
```

## 🔧 Environment Variables

### Required Variables (Deployment will fail without these)
- `PROJECT_ID`: Firebase project identifier
- `STORAGE_BUCKET`: Firebase storage bucket name

### Critical Variables (Warnings if missing)
- `OPENAI_API_KEY`: OpenAI service integration
- `WEB_API_KEY`: Firebase web API key
- `AUTH_DOMAIN`: Firebase authentication domain

### Service-Specific Variables
- `ELEVENLABS_API_KEY`: Voice generation service
- `DID_API_KEY`: Video avatar generation
- `PINECONE_API_KEY`: Vector database service
- `SERPER_API_KEY`: Web search service
- `EMAIL_USER`, `EMAIL_PASSWORD`: Email service

### Feature Flags
- `ENABLE_VIDEO_GENERATION`: Enable/disable video features
- `ENABLE_PODCAST_GENERATION`: Enable/disable podcast features
- `ENABLE_PUBLIC_PROFILES`: Enable/disable public profiles
- `ENABLE_RAG_CHAT`: Enable/disable RAG chat functionality

### Security Tokens (for health endpoints)
- `HEALTH_CHECK_TOKEN`: Token for health check endpoint access
- `SECURITY_REPORT_TOKEN`: Token for security report access
- `CONFIG_ADMIN_TOKEN`: Admin token for configuration validation

## 📊 Security Metrics

### Health Status Calculation
- **Healthy**: ≥80% of services configured correctly
- **Degraded**: 50-79% of services configured correctly  
- **Unhealthy**: <50% of services configured correctly

### Security Score Calculation
- **100**: No security events
- **90-99**: Minor validation issues
- **70-89**: Some security concerns
- **<70**: Critical security issues requiring immediate attention

### Alert Thresholds
- **Missing Required Var**: 1 event in 5 minutes
- **Invalid Format**: 5 events in 10 minutes
- **Suspicious Value**: 3 events in 5 minutes
- **Validation Error**: 10 events in 15 minutes

## 🧪 Testing

### Run Tests
```bash
# Environment configuration tests
npm test -- --testPathPattern=environment.test.ts

# Security monitoring tests  
npm test -- --testPathPattern=security-monitor.test.ts

# All configuration tests
npm test -- --testPathPattern=config/
```

### Test Coverage
- ✅ Input validation and sanitization
- ✅ API key format validation
- ✅ URL security validation
- ✅ Required variable enforcement
- ✅ Security event recording and alerting
- ✅ Metrics calculation
- ✅ Error handling and edge cases
- ✅ Singleton pattern verification
- ✅ Event cleanup and memory management

## 🔧 Configuration Migration

### From Old System
```typescript
// Old (insecure)
const apiKey = process.env.OPENAI_API_KEY;

// New (secure)
import { config } from './config/environment';
const apiKey = config.openai.apiKey; // Validated and sanitized
```

### Health Check Integration
```typescript
// Add to your function startup
import { environmentUtils } from './config/environment';

export const myFunction = functions.https.onRequest(async (req, res) => {
  // Optional: Check health before processing
  const health = environmentUtils.performHealthCheck();
  if (health.status === 'unhealthy') {
    res.status(503).json({ error: 'Service configuration issues' });
    return;
  }
  
  // Your function logic
});
```

## 🚨 Security Best Practices

### 1. **Never Log Sensitive Values**
```typescript
// ❌ Don't do this
console.log('API Key:', config.openai.apiKey);

// ✅ Do this
console.log('OpenAI service available:', !!config.openai.apiKey);
```

### 2. **Use Validation Results**
```typescript
// Check if service is properly configured before using
if (environmentUtils.isServiceAvailable('openai')) {
  // Use OpenAI service
} else {
  // Handle missing configuration gracefully
}
```

### 3. **Monitor Security Events**
```typescript
// Set up periodic security reports
const report = securityMonitor.generateSecurityReport();
if (report.summary.securityScore < 80) {
  // Alert administrators
}
```

### 4. **Environment-Specific Security**
- Production: HTTPS required, strict validation
- Development: More permissive for localhost
- Use different tokens for different environments

## 📈 Monitoring & Alerting

### Firebase Functions Logs
- Security events are logged with appropriate severity levels
- Sensitive values are automatically redacted
- Structured logging for easy parsing

### Health Check Automation
```bash
# Automated health monitoring
curl -H "Authorization: Bearer $HEALTH_CHECK_TOKEN" \
  https://your-project.cloudfunctions.net/configHealthCheck

# Security report automation
curl -H "Authorization: Bearer $SECURITY_REPORT_TOKEN" \
  https://your-project.cloudfunctions.net/securityReport
```

### Integration with Monitoring Services
- **Firebase Error Reporting**: Automatic error capture
- **Cloud Logging**: Structured log analysis
- **Custom Dashboards**: Health and security metrics
- **Alert Policies**: Automatic notifications for critical events

## 🔄 Maintenance

### Regular Tasks
1. **Weekly**: Review security reports and metrics
2. **Monthly**: Rotate security tokens and API keys  
3. **Quarterly**: Review and update validation rules
4. **Annually**: Security audit and penetration testing

### Updating Configuration
1. Add new environment variables to validation schema
2. Update tests with new validation rules
3. Deploy and verify health checks pass
4. Monitor security events for any issues

## 🆘 Troubleshooting

### Common Issues

**Issue**: "Missing required environment variable"
**Solution**: Set `PROJECT_ID` and `STORAGE_BUCKET` in environment

**Issue**: "Invalid API key format"  
**Solution**: Verify API key format matches expected pattern

**Issue**: "Security score below threshold"
**Solution**: Review recent security events and resolve configuration issues

**Issue**: Health check endpoint returns 401
**Solution**: Verify `HEALTH_CHECK_TOKEN` is set correctly

### Debug Mode
```typescript
// Enable detailed logging
const validation = environmentUtils.getValidationResult();
console.log('Validation details:', validation);

const health = environmentUtils.performHealthCheck();  
console.log('Health details:', health);
```

This secure environment configuration system provides enterprise-grade security for the CVPlus Firebase Functions while maintaining backward compatibility and ease of use.