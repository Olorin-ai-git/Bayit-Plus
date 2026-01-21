# Security Headers Implementation

## Overview

The Olorin FastAPI backend now includes comprehensive security headers middleware that protects against common web vulnerabilities including XSS, clickjacking, MIME-sniffing, and more.

## Implemented Security Headers

### 1. Content-Security-Policy (CSP)
**Purpose**: Prevents Cross-Site Scripting (XSS) and other code injection attacks

**Default Value**:
```
default-src 'self';
script-src 'self';
style-src 'self' 'unsafe-inline';
img-src 'self' data: https:;
font-src 'self';
connect-src 'self';
frame-ancestors 'none';
base-uri 'self';
form-action 'self'
```

**Configuration**: `SECURITY_CSP` environment variable

**Benefits**:
- Prevents inline script execution (XSS protection)
- Controls which resources can be loaded
- Blocks unauthorized framing attempts
- Prevents form submission to external domains

### 2. HTTP Strict Transport Security (HSTS)
**Purpose**: Forces HTTPS connections and prevents downgrade attacks

**Default Value**: `max-age=31536000; includeSubDomains`

**Configuration**:
- `SECURITY_HSTS_MAX_AGE` (default: 31536000 seconds = 1 year)
- `SECURITY_HSTS_INCLUDE_SUBDOMAINS` (default: true)
- `SECURITY_HSTS_PRELOAD` (default: false)

**Benefits**:
- Prevents SSL stripping attacks
- Forces browser to use HTTPS for all requests
- Protects against protocol downgrade attacks
- Can be included in browser preload lists

### 3. X-Frame-Options
**Purpose**: Prevents clickjacking attacks

**Default Value**: `DENY`

**Configuration**: `SECURITY_X_FRAME_OPTIONS` (values: DENY or SAMEORIGIN)

**Benefits**:
- Prevents page from being embedded in iframe
- Protects against UI redress attacks
- Stops clickjacking attempts

### 4. X-Content-Type-Options
**Purpose**: Prevents MIME-sniffing vulnerabilities

**Default Value**: `nosniff`

**Configuration**: `SECURITY_X_CONTENT_TYPE_OPTIONS` (must be "nosniff")

**Benefits**:
- Prevents browser from MIME-sniffing responses
- Reduces risk of drive-by downloads
- Ensures content-type headers are respected

### 5. X-XSS-Protection
**Purpose**: Legacy XSS protection for older browsers

**Default Value**: `1; mode=block`

**Configuration**: `SECURITY_X_XSS_PROTECTION`

**Benefits**:
- Enables browser XSS filter
- Blocks page rendering when XSS detected
- Additional layer for older browsers

**Note**: Modern browsers rely on CSP instead, but this provides backward compatibility.

### 6. Referrer-Policy
**Purpose**: Controls referrer information sent to other sites

**Default Value**: `strict-origin-when-cross-origin`

**Configuration**: `SECURITY_REFERRER_POLICY`

**Available Options**:
- `no-referrer` - Never send referrer
- `no-referrer-when-downgrade` - Send on HTTPS to HTTPS
- `same-origin` - Only send to same origin
- `origin` - Only send origin (not full URL)
- `strict-origin` - Only send origin on HTTPS
- `origin-when-cross-origin` - Send full URL same-origin, origin cross-origin
- `strict-origin-when-cross-origin` - Recommended default
- `unsafe-url` - Always send full URL (not recommended)

**Benefits**:
- Protects user privacy
- Prevents information leakage
- Controls data sent to third parties

### 7. Permissions-Policy
**Purpose**: Controls browser features and APIs

**Default Value**: `camera=(), microphone=(), geolocation=(), interest-cohort=()`

**Configuration**: `SECURITY_PERMISSIONS_POLICY`

**Benefits**:
- Disables unnecessary browser APIs
- Prevents tracking via FLoC
- Reduces attack surface
- Improves privacy

## Configuration

### Environment Variables

All security headers are configurable via environment variables. Add to your `.env` file:

```bash
# Content Security Policy
SECURITY_CSP="default-src 'self'; script-src 'self'; ..."

# HSTS Configuration
SECURITY_HSTS_MAX_AGE=31536000
SECURITY_HSTS_INCLUDE_SUBDOMAINS=true
SECURITY_HSTS_PRELOAD=false

# Frame Options
SECURITY_X_FRAME_OPTIONS=DENY

# Content Type Options
SECURITY_X_CONTENT_TYPE_OPTIONS=nosniff

# XSS Protection
SECURITY_X_XSS_PROTECTION="1; mode=block"

# Referrer Policy
SECURITY_REFERRER_POLICY=strict-origin-when-cross-origin

# Permissions Policy
SECURITY_PERMISSIONS_POLICY="camera=(), microphone=(), geolocation=(), interest-cohort=()"
```

### Production Recommendations

For production environments:

1. **HSTS**: Set `max-age` to at least 6 months (10886400 seconds)
2. **CSP**: Customize to include only necessary domains for your application
3. **HSTS Preload**: Consider enabling after testing with `includeSubDomains=true`
4. **X-Frame-Options**: Use `DENY` unless you need iframe embedding
5. **Referrer-Policy**: Use `strict-origin-when-cross-origin` or stricter

### Development vs Production

The same configuration works for both environments, but you may want to:

**Development**:
- More permissive CSP for easier debugging
- Shorter HSTS max-age for testing

**Production**:
- Strict CSP with only required domains
- Long HSTS max-age (1 year recommended)
- Consider HSTS preload submission

## Implementation Details

### Architecture

The security headers are implemented as middleware in the FastAPI application:

1. **Configuration Class** (`SecurityHeadersConfig`):
   - Loads headers from environment variables
   - Validates configuration on startup (fail-fast)
   - Provides singleton instance

2. **Middleware Integration**:
   - Automatically applied to all HTTP responses
   - No code changes needed for endpoints
   - Works with error responses and redirects

3. **Compliance**:
   - No hardcoded values (all from environment)
   - Follows SYSTEM MANDATE requirements
   - Configuration-driven design

### Files

- **Middleware**: `app/middleware/security_headers.py`
- **Configuration**: `app/service/middleware/middleware_config.py`
- **Tests**: `app/test/unit/middleware/test_security_headers.py`
- **Integration Tests**: `app/test/integration/test_security_headers_integration.py`
- **Manual Test Script**: `scripts/test_security_headers.py`

## Testing

### Unit Tests

Run unit tests for security headers configuration:

```bash
poetry run pytest app/test/unit/middleware/test_security_headers.py -v
```

### Integration Tests

Run integration tests to verify headers are applied:

```bash
poetry run pytest app/test/integration/test_security_headers_integration.py -v
```

### Manual Testing

Use the manual test script:

```bash
poetry run python scripts/test_security_headers.py
```

### Browser Testing

1. Start the application
2. Open browser DevTools (Network tab)
3. Make a request to any endpoint
4. Check Response Headers section

All security headers should be present in every response.

## Validation

The security headers configuration includes automatic validation:

- **HSTS max-age**: Must be positive integer
- **X-Frame-Options**: Must be DENY or SAMEORIGIN
- **X-Content-Type-Options**: Must be "nosniff"

Invalid configuration will cause the application to fail at startup with a clear error message.

## Monitoring

Security headers are logged on application startup:

```
Security Headers Configuration:
  CSP: default-src 'self'; ...
  HSTS: max-age=31536000; includeSubDomains
  X-Frame-Options: DENY
  ...
```

Review these logs to ensure correct configuration in production.

## Security Benefits

This implementation provides protection against:

1. **Cross-Site Scripting (XSS)**: Via CSP and X-XSS-Protection
2. **Clickjacking**: Via X-Frame-Options
3. **MIME-sniffing attacks**: Via X-Content-Type-Options
4. **Protocol downgrade attacks**: Via HSTS
5. **Information leakage**: Via Referrer-Policy
6. **Unauthorized feature access**: Via Permissions-Policy

## Compliance

This implementation complies with:

- OWASP Secure Headers Project recommendations
- NIST Cybersecurity Framework guidelines
- Industry best practices for API security
- SYSTEM MANDATE requirements (no hardcoded values)

## Troubleshooting

### Headers not appearing

1. Check middleware is registered in `middleware_config.py`
2. Verify environment variables are set
3. Check application logs for validation errors

### CSP blocking resources

If legitimate resources are blocked:

1. Review CSP directives
2. Add necessary domains to appropriate directive
3. Avoid using `'unsafe-inline'` or `'unsafe-eval'` in production

### HSTS issues in development

If HSTS causes issues in development:

1. Reduce `max-age` to shorter value (e.g., 300 seconds)
2. Clear browser HSTS cache if needed
3. Use different domains for dev/prod

## Further Reading

- [OWASP Secure Headers Project](https://owasp.org/www-project-secure-headers/)
- [Mozilla Web Security Guidelines](https://infosec.mozilla.org/guidelines/web_security)
- [Content Security Policy Reference](https://content-security-policy.com/)
- [HSTS Preload Submission](https://hstspreload.org/)

## Maintenance

Review and update security headers:

1. **Quarterly**: Review CSP and ensure it's not too permissive
2. **After major changes**: Update CSP if new resources are added
3. **Annually**: Review all headers against latest security guidelines
4. **Before production**: Test with security scanning tools

## Support

For security concerns or questions:

1. Review the security documentation
2. Check application logs for configuration issues
3. Run manual test script to verify headers
4. Contact security team for guidance on production settings
