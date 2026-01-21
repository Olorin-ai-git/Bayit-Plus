# CORS Configuration for CVPlus Firebase Functions

## Overview

This document describes the CORS (Cross-Origin Resource Sharing) configuration for CVPlus Firebase Functions and the fixes implemented to resolve CORS policy blocks.

## Issues Identified

1. **Inconsistent CORS configuration** between `onCall` and `onRequest` functions
2. **Firebase Functions v2 CORS differences** not properly handled
3. **Missing CORS for onCall functions** when accessed via HTTP endpoints
4. **Manual CORS handling conflicts** with Firebase Functions v2 automatic CORS

## Solutions Implemented

### 1. Updated CORS Configuration (`src/config/cors.ts`)

- **Expanded allowed origins** to include all development and production endpoints
- **Separate CORS options** for `onCall` vs `onRequest` functions
- **Added CORS middleware** for manual handling when needed
- **Enhanced validation functions** for origin checking

#### Key Changes:
- Added `127.0.0.1` variants for localhost
- Added Firebase emulator ports (5001, 8080, 9000)
- Separated `corsOptions` (for onCall) from `requestCorsOptions` (for onRequest)
- Added `corsMiddleware()` function for manual CORS handling

### 2. Function-Specific Fixes

#### onCall Functions (Firebase Callable)
- Use `corsOptions` configuration
- Examples: `generateCertificationBadges`, `testCorsCall`

#### onRequest Functions (HTTP Endpoints)
- Use `requestCorsOptions` configuration
- Apply `corsMiddleware()` for consistent handling
- Examples: `testCors`, `heygenWebhook`, `podcastStatusPublic`

### 3. Testing Infrastructure

#### CORS Test Functions
- `testCorsHTTP` - Tests HTTP endpoint CORS
- `testCorsCallable` - Tests Firebase Callable CORS
- `validateCorsConfiguration` - Comprehensive CORS validation

#### Frontend Testing Script
- `scripts/cors-test-frontend.js` - Tests CORS from frontend perspective
- Validates preflight requests, actual requests, and specific functions

## Usage

### Development
```bash
# Start Firebase emulators
firebase emulators:start

# Run CORS tests
node scripts/cors-test-frontend.js
```

### Production
The same CORS configuration applies to production with production origins automatically allowed.

## Allowed Origins

### Development
- `http://localhost:3000` (React dev server)
- `http://localhost:5173` (Vite dev server)
- `http://localhost:5000` (Firebase emulator)
- `http://localhost:5001` (Firebase Functions emulator)
- `http://127.0.0.1:*` (localhost variations)

### Production
- `https://cvplus.ai`
- `https://www.cvplus.ai`
- `https://cvplus.firebaseapp.com`
- `https://cvplus.web.app`
- `https://getmycv-ai.firebaseapp.com`
- `https://getmycv-ai.web.app`

### HuggingFace Integration
- `https://huggingface.co`
- `https://*.hf.space`
- `https://*.gradio.app`

## Best Practices

1. **Use appropriate CORS options** for function type:
   - `corsOptions` for onCall functions
   - `requestCorsOptions` for onRequest functions

2. **Don't mix manual and automatic CORS handling** - choose one approach per function

3. **Test both preflight and actual requests** during development

4. **Validate origins** to maintain security while allowing legitimate requests

## Troubleshooting

### Common Issues

1. **"CORS policy blocked"** - Check if origin is in allowed list
2. **Preflight failures** - Ensure OPTIONS method is handled
3. **Headers missing** - Verify CORS middleware is applied
4. **onCall vs onRequest confusion** - Use correct CORS options for function type

### Debugging Tools

1. Use browser DevTools Network tab to inspect CORS headers
2. Run `validateCorsConfiguration` function for detailed analysis
3. Check Firebase Functions logs for CORS warnings
4. Use the frontend testing script for automated validation

## Migration Notes

- Updated all existing onRequest functions to use new CORS configuration
- Removed manual CORS handling where it conflicted with Firebase Functions v2
- Maintained backward compatibility with existing function signatures