# CVPlus Core Firebase Functions Utilities

## Overview

This document describes the Firebase Functions utilities that have been consolidated into the CVPlus core package to eliminate code duplication across Firebase Functions.

## Phase 1 Implementation Complete

**Target Impact**: Eliminated 200+ lines of duplicated code across Firebase Functions
**Implementation Status**: ✅ Complete

## Available Utilities

### 1. Error Handler (`firebase-error-handler.ts`)

Standardized error handling for Firebase Functions.

```typescript
import { 
  throwFirebaseError, 
  handleFirebaseError, 
  requireAuthentication,
  validateUserAccess,
  withErrorHandling 
} from '@cvplus/core/utils';

// Before (duplicated across 15+ files):
try {
  // function logic
} catch (error) {
  logger.error(`Function error: ${error.message}`);
  throw new functions.https.HttpsError('internal', 'Internal server error');
}

// After (consolidated utility):
export const myFunction = onCall(async (request) => {
  return withErrorHandling(
    async () => {
      // function logic
      return result;
    },
    { functionName: 'myFunction', userId: request.auth?.uid }
  );
});
```

### 2. Response Formatter (`firebase-response-formatter.ts`)

Consistent API response formatting.

```typescript
import { 
  createSuccessResponse, 
  createErrorResponse,
  createFeatureAccessResponse,
  createPaginatedResponse 
} from '@cvplus/core/utils';

// Before (duplicated across 10+ files):
return {
  success: true,
  data: result,
  timestamp: new Date().toISOString()
};

// After (consolidated utility):
return createSuccessResponse(result, { duration: processingTime });
```

### 3. Auth Validator (`firebase-auth-validator.ts`)

Common authentication validation patterns.

```typescript
import { 
  validateBasicAuth, 
  validateUserIdMatch,
  validateAuthentication 
} from '@cvplus/core/utils';

// Before (duplicated across 8+ files):
if (!context.auth) {
  throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
}
if (auth.uid !== data.userId) {
  throw new functions.https.HttpsError('permission-denied', 'User ID mismatch');
}

// After (consolidated utility):
export const myFunction = onCall<{userId: string}>(async (request) => {
  const auth = validateBasicAuth(request, 'myFunction');
  validateUserIdMatch(auth, request.data.userId, 'myFunction');
  
  // function logic
});
```

### 4. Logger (`firebase-logger.ts`)

Centralized logging with structured data and sanitization.

```typescript
import { createLogger, CVPlusLogger, quickLog } from '@cvplus/core/utils';

// Create function-specific logger
const logger = createLogger('myFunction');

// Structured logging with automatic sanitization
logger.info('User action completed', { 
  userId: auth.uid,
  action: 'cv_generation',
  duration: 1500 
});

// Performance logging
await quickLog.withTiming('processCV', async () => {
  // processing logic
}, logger);

// Security event logging
quickLog.security('unauthorized_access_attempt', 'medium', {
  userId: auth.uid,
  endpoint: 'premium-feature'
});
```

### 5. Types (`firebase-functions.ts`)

Centralized type definitions for Firebase Functions.

```typescript
import type {
  FirebaseFunctionResponse,
  FirebaseAuthContext,
  CVData,
  PremiumFeature,
  FeatureAccessResponse
} from '@cvplus/core/types';

export const checkFeatureAccess = onCall<FeatureAccessData>(
  async (request): Promise<FeatureAccessResponse> => {
    // Type-safe implementation
  }
);
```

### 6. Constants (`firebase-functions.ts`)

Centralized configuration constants.

```typescript
import {
  FIREBASE_ERROR_MESSAGES,
  FIREBASE_RATE_LIMITS,
  PREMIUM_FEATURES,
  FUNCTION_TIMEOUTS
} from '@cvplus/core/constants';

// Use standardized error messages
throw new HttpsError('unauthenticated', FIREBASE_ERROR_MESSAGES.AUTHENTICATION.REQUIRED);

// Use standardized rate limits
const rateLimiter = createRateLimit(FIREBASE_RATE_LIMITS.PRO_TIER);

// Use standardized timeouts
export const heavyProcessing = onCall({
  timeoutSeconds: FUNCTION_TIMEOUTS.LONG
}, async (request) => {
  // implementation
});
```

## Migration Guide

### Step 1: Install Core Package

```bash
cd functions
npm install @cvplus/core
```

### Step 2: Update Function Implementation

```typescript
// OLD PATTERN
import { logger } from 'firebase-functions';
import { HttpsError } from 'firebase-functions/v2/https';

export const myFunction = onCall(async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be authenticated');
    }

    // function logic
    const result = await processData();

    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    logger.error('Function error', error);
    throw new HttpsError('internal', 'Internal server error');
  }
});
```

```typescript
// NEW PATTERN
import { 
  validateBasicAuth,
  createSuccessResponse,
  withErrorHandling,
  createLogger
} from '@cvplus/core/utils';

const logger = createLogger('myFunction');

export const myFunction = onCall(async (request) => {
  return withErrorHandling(
    async () => {
      const auth = validateBasicAuth(request, 'myFunction');
      
      // function logic
      const result = await processData();
      
      return createSuccessResponse(result);
    },
    { functionName: 'myFunction' }
  );
});
```

## Benefits

1. **Code Reduction**: 200+ lines of duplicated code eliminated
2. **Consistency**: Standardized patterns across all functions
3. **Type Safety**: Strong typing for all function interfaces
4. **Maintainability**: Single source of truth for common patterns
5. **Error Handling**: Comprehensive error handling with context preservation
6. **Security**: Automatic data sanitization and validation
7. **Monitoring**: Structured logging and performance tracking

## Usage in Firebase Functions

The utilities are designed to be drop-in replacements for common Firebase Functions patterns:

### Error Handling Pattern
**Before**: 15+ functions with identical error handling
**After**: Import `withErrorHandling` utility

### Response Formatting Pattern  
**Before**: 10+ functions with identical response format
**After**: Import `createSuccessResponse` utility

### Auth Validation Pattern
**Before**: 8+ functions with identical auth checks
**After**: Import `validateBasicAuth` utility

### Logging Pattern
**Before**: Inconsistent logging across functions
**After**: Import `createLogger` for structured logging

## Next Phase

Phase 2 will focus on:
- Premium feature validation utilities
- Database operation helpers
- External API integration utilities
- Advanced caching patterns

## Support

For questions about the Firebase utilities, refer to the CVPlus Core documentation or contact the development team.