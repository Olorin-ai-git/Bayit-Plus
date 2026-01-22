# Security Policy

## Security Measures

This portal implements comprehensive security measures to protect users and prevent attacks:

### XSS Protection
- **i18next escapeValue enabled**: All translations are HTML-escaped by default
- **Input sanitization**: Forms use DOMPurify to strip dangerous HTML
- **Content Security Policy**: Strict CSP headers block inline scripts and unsafe content

### URL Validation
- **Protocol filtering**: Blocks `javascript:`, `data:`, `vbscript:`, `file:` protocols
- **Case-insensitive checks**: Prevents bypass via case manipulation
- **URL decoding**: Detects encoded attack vectors
- **Protocol-relative blocking**: Prevents `//evil.com` redirects
- **Domain whitelist**: Production enforces approved video domains only
- **Length limits**: Prevents DoS via extremely long URLs

### Security Headers
All pages served with comprehensive security headers:
- **X-Frame-Options**: DENY (prevents clickjacking)
- **X-Content-Type-Options**: nosniff (prevents MIME sniffing)
- **Referrer-Policy**: strict-origin-when-cross-origin
- **Permissions-Policy**: Blocks camera, microphone, geolocation
- **Strict-Transport-Security**: HSTS with preload
- **Content-Security-Policy**: Comprehensive CSP policy

### Rate Limiting
- **Form submissions**: Limited to 3 attempts per minute
- **Client-side enforcement**: Uses localStorage for persistence
- **Automatic reset**: Limits reset after time window expires

### HTTPS Enforcement
- **Production requirement**: All resources must use HTTPS
- **Video sources**: Validated for HTTPS protocol
- **API connections**: Encrypted connections only

### Input Validation
- **Text sanitization**: Removes dangerous characters, limits length
- **Email validation**: Format checks and suspicious pattern detection
- **HTML sanitization**: Comprehensive DOMPurify integration

### Error Handling
- **Production sanitization**: Error details logged but not exposed to users
- **Generic messages**: Users see safe, generic error messages
- **Debug logging**: Full error details available for debugging

## Reporting Vulnerabilities

If you discover a security vulnerability, please report it to:

**Email**: security@olorin.ai

Please include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if available)

We take all security reports seriously and will respond within 48 hours.

## Security Best Practices

When contributing to this codebase:

1. **Never hardcode secrets** - Use environment variables
2. **Validate all inputs** - Use provided validation utilities
3. **Sanitize outputs** - Escape HTML and user content
4. **Use HTTPS** - No HTTP in production
5. **Test security** - Run security test suite before commits
6. **Follow CSP** - Ensure changes comply with CSP policy
7. **Review dependencies** - Keep packages up-to-date

## Security Testing

Run security tests:
```bash
npm test -- security.test.ts
```

All security tests must pass before deployment.

## Compliance

This portal complies with:
- OWASP Top 10 security standards
- WCAG 2.1 AA accessibility requirements
- Modern browser security best practices
