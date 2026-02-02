# MongoDB Atlas SSL Connection Fix

**Date**: 2026-02-02
**Issue**: MongoDB connection SSL errors on macOS with Python 3.13+
**Status**: ✅ RESOLVED

## Problem

MongoDB Atlas connections were failing with SSL socket wrapping errors:

```python
File "/opt/homebrew/Cellar/python@3.13/3.13.11/Frameworks/Python.framework/Versions/3.13/lib/python3.13/ssl.py", line 455, in wrap_socket
    return self.sslsocket_class._create(...)
```

## Root Cause

Python 3.13+ has stricter SSL certificate validation requirements. The Motor/pymongo MongoDB client needed explicit TLS/SSL configuration for MongoDB Atlas connections on macOS.

## Solution

Updated `olorin-shared` MongoDB connection manager to explicitly configure TLS/SSL settings:

### Code Changes

**File**: `packages/olorin-shared/olorin_shared/database/mongodb.py`

**Changes**:
1. Added explicit `tls=True` parameter to AsyncIOMotorClient
2. Added `tlsAllowInvalidCertificates=False` for security
3. Added environment variable configuration for TLS settings

### Environment Variables (Optional)

```bash
# Enable/disable TLS (default: true)
MONGODB_TLS_ENABLED=true

# Allow invalid certificates - ONLY for development/testing (default: false)
# NEVER set to true in production!
MONGODB_TLS_ALLOW_INVALID_CERTIFICATES=false
```

## Testing

### Quick Test

Run the diagnostic script to verify the fix:

```bash
cd backend
poetry run python scripts/fix_mongodb_ssl.py
```

Expected output:
```
✅ SSL Certificates: OK
✅ MongoDB URI: OK
✅ MongoDB Connection: OK
```

### Manual Verification

Start the backend server:

```bash
cd backend
poetry run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Expected log output:
```
INFO: Connected to MongoDB Atlas: bayit_plus
INFO:    Max pool size: 100
INFO:    Min pool size: 20
```

## Diagnostic Tool

Use the diagnostic script for troubleshooting:

```bash
cd backend
poetry run python scripts/fix_mongodb_ssl.py
```

**The script checks**:
- Python SSL certificate installation
- MongoDB URI format validation
- Network connectivity to MongoDB Atlas
- SSL/TLS configuration

## Common Issues & Solutions

### 1. SSL Certificates Not Installed

**Symptom**: `SSL: CERTIFICATE_VERIFY_FAILED`

**Solution**:
```bash
# macOS with Homebrew Python 3.13
/opt/homebrew/opt/python@3.13/Frameworks/Python.framework/Versions/3.13/bin/Install\ Certificates.command
```

### 2. MongoDB Atlas IP Whitelist

**Symptom**: `ServerSelectionTimeoutError`

**Solution**:
- Log into MongoDB Atlas console
- Navigate to **Network Access**
- Add your IP address or allow `0.0.0.0/0` (development only)

### 3. Invalid Credentials

**Symptom**: `Authentication failed`

**Solution**:
- Verify `MONGODB_URI` in `.env` has correct username/password
- Check credentials in MongoDB Atlas **Database Access**

### 4. Firewall/Proxy Blocking

**Symptom**: Connection timeout

**Solution**:
- Check corporate firewall/proxy settings
- Ensure outbound connections to MongoDB Atlas are allowed (port 27017)

## Dependencies

Updated versions (pyproject.toml):

```toml
motor = ">=3.7.1,<4.0.0"
pymongo = ">=4.15.5,<5.0.0"
beanie = ">=2.0.1,<3.0.0"
```

## Security Notes

### ✅ Production Settings (Secure)

```bash
MONGODB_TLS_ENABLED=true  # Force TLS encryption
MONGODB_TLS_ALLOW_INVALID_CERTIFICATES=false  # Verify certificates
```

### ⚠️ Development-Only Settings (Insecure)

```bash
# ONLY for local testing with self-signed certificates
MONGODB_TLS_ALLOW_INVALID_CERTIFICATES=true  # NEVER use in production!
```

## Related Documentation

- [Secrets Management Guide](SECRETS_MANAGEMENT.md)
- [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com/)
- [Motor Documentation](https://motor.readthedocs.io/)

## Verification Checklist

After applying the fix, verify:

- [ ] Backend server starts without SSL errors
- [ ] MongoDB connection log shows "Connected to MongoDB Atlas"
- [ ] Diagnostic script passes all checks
- [ ] API endpoints respond correctly
- [ ] No SSL-related errors in logs

## Change Log

- **2026-02-02**: Initial fix for Python 3.13+ SSL compatibility
  - Added explicit TLS configuration to MongoDB connection
  - Created diagnostic tool for troubleshooting
  - Documented environment variable options
