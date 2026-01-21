# Async CV Generation Implementation

## Overview

This document describes the implementation of async CV generation support in the CVPlus frontend service layer. The implementation adds a new asynchronous approach to CV generation while maintaining full backward compatibility with the existing synchronous method.

## Features Implemented

### 1. New TypeScript Types

**File:** `frontend/src/types/cv.ts`

Added new interfaces for async CV generation:

```typescript
/**
 * Response format for async CV generation initiation
 */
export interface AsyncCVGenerationResponse {
  success: true;
  jobId: string;
  status: 'initiated';
  selectedFeatures: string[];
  estimatedTime: number; // seconds
  message: string;
}

/**
 * Parameters for initiating async CV generation
 */
export interface AsyncCVGenerationParams {
  jobId: string;
  templateId: string;
  features: string[];
}
```

### 2. Environment Variable Configuration

**File:** `frontend/.env.example`

Added new environment variable for feature flag:

```bash
# CV Generation Configuration
# Set to 'true' to enable async CV generation mode
# When enabled, generateCV will use initiateCVGeneration instead of synchronous generation
VITE_ENABLE_ASYNC_CV_GENERATION=false
```

### 3. Enhanced CVParser Service

**File:** `frontend/src/services/cv/CVParser.ts`

Added new methods and smart wrapper logic:

#### New Methods:

- `isAsyncCVGenerationEnabled()` - Checks environment variable
- `initiateCVGeneration()` - Calls new Firebase function for async generation
- `_generateCVSync()` - Original synchronous implementation (private)

#### Enhanced `generateCV()` Method:

Now acts as a smart wrapper that:
1. Checks `VITE_ENABLE_ASYNC_CV_GENERATION` environment variable
2. Routes to async or sync implementation based on flag
3. Logs which mode is being used for debugging

```typescript
static async generateCV(jobId: string, templateId: string, features: string[]) {
  const isAsyncEnabled = this.isAsyncCVGenerationEnabled();
  
  console.log(`🎯 CV Generation Mode: ${isAsyncEnabled ? 'ASYNC' : 'SYNC'}`, {
    envVar: import.meta.env.VITE_ENABLE_ASYNC_CV_GENERATION,
    isAsyncEnabled,
    jobId,
    templateId,
    features
  });

  if (isAsyncEnabled) {
    return this.initiateCVGeneration({ jobId, templateId, features });
  } else {
    return this._generateCVSync(jobId, templateId, features);
  }
}
```

### 4. CVServiceCore Integration

**File:** `frontend/src/services/cv/CVServiceCore.ts`

Added new methods and legacy compatibility exports:

```typescript
/**
 * Initiate async CV generation (returns immediately with job tracking info)
 */
static async initiateCVGeneration(params: AsyncCVGenerationParams): Promise<AsyncCVGenerationResponse> {
  return CVParser.initiateCVGeneration(params);
}

/**
 * Check if async CV generation mode is enabled
 */
static isAsyncCVGenerationEnabled(): boolean {
  return import.meta.env.VITE_ENABLE_ASYNC_CV_GENERATION === 'true';
}
```

### 5. Legacy Compatibility Exports

Added exports for backward compatibility:

```typescript
// Legacy compatibility exports for new async functionality
export const initiateCVGeneration = (jobId: string, templateId: string, features: string[]) =>
  CVServiceCore.initiateCVGeneration({ jobId, templateId, features });

export const isAsyncCVGenerationEnabled = CVServiceCore.isAsyncCVGenerationEnabled;
```

### 6. Vite Configuration Update

**File:** `frontend/vite.config.ts`

Ensured environment variables are properly exposed:

```typescript
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
  },
  preview: {
    port: 3000,
  },
  // Environment variable prefixes that should be exposed to the client
  envPrefix: ['VITE_']
})
```

## Usage

### Basic Usage (Automatic Mode Selection)

```typescript
import { generateCV } from '../services/cv/CVServiceCore';

// This will automatically choose async or sync based on environment variable
const result = await generateCV(jobId, templateId, features);

// Response will be either:
// - Sync: { success: true, pdfUrl: '...', docxUrl: '...', htmlUrl: '...' }
// - Async: { success: true, jobId: '...', status: 'initiated', estimatedTime: 120, ... }
```

### Explicit Async Usage

```typescript
import { initiateCVGeneration } from '../services/cv/CVServiceCore';

const response = await initiateCVGeneration({
  jobId: 'job-123',
  templateId: 'template-456',
  features: ['feature1', 'feature2']
});

console.log(response);
// {
//   success: true,
//   jobId: 'job-123',
//   status: 'initiated',
//   selectedFeatures: ['feature1', 'feature2'],
//   estimatedTime: 120,
//   message: 'CV generation initiated successfully'
// }
```

### Feature Flag Detection

```typescript
import { isAsyncCVGenerationEnabled } from '../services/cv/CVServiceCore';

if (isAsyncCVGenerationEnabled()) {
  console.log('Async mode is enabled');
  // Handle async flow (show progress indicators, etc.)
} else {
  console.log('Sync mode is enabled');
  // Handle synchronous flow
}
```

## Environment Configuration

### To Enable Async Mode

1. Create or update `.env` file in the frontend directory:

```bash
VITE_ENABLE_ASYNC_CV_GENERATION=true
```

2. Restart the development server:

```bash
npm run dev
```

### To Disable Async Mode (Default)

```bash
VITE_ENABLE_ASYNC_CV_GENERATION=false
# or simply omit the variable
```

## Backward Compatibility

✅ **Full backward compatibility maintained**

- All existing code continues to work without changes
- The `generateCV` method signature remains unchanged
- When async mode is disabled, behavior is identical to the original implementation
- All existing imports and exports continue to work

## Error Handling

### Async Mode Error Handling

```typescript
try {
  const result = await initiateCVGeneration(params);
  if (result.success) {
    // Handle successful initiation
    console.log(`Job ${result.jobId} initiated, estimated time: ${result.estimatedTime}s`);
  }
} catch (error) {
  // Handle Firebase function errors
  console.error('Failed to initiate CV generation:', error.message);
}
```

### Enhanced Error Messages

The implementation provides clear error messages for:
- Authentication failures
- Permission denied
- Service unavailability
- Invalid arguments
- Network errors

## Firebase Function Integration

The frontend now calls the new `initiateCVGeneration` Firebase function when in async mode:

```typescript
const initiateCVGenerationFunction = httpsCallable(functions, 'initiateCVGeneration');

const result = await initiateCVGenerationFunction({
  jobId,
  templateId,
  features: kebabCaseFeatures
});
```

## Logging and Debugging

The implementation includes comprehensive logging:

```typescript
console.log(`🎯 CV Generation Mode: ${isAsyncEnabled ? 'ASYNC' : 'SYNC'}`, {
  envVar: import.meta.env.VITE_ENABLE_ASYNC_CV_GENERATION,
  isAsyncEnabled,
  jobId,
  templateId,
  features
});
```

## Testing

A comprehensive test suite is provided in:
`frontend/src/services/cv/__tests__/CVServiceCore.async.test.ts`

The tests cover:
- Feature flag detection
- Mode routing (sync vs async)
- Response format validation
- Backward compatibility
- Type safety

## Files Modified

1. **`frontend/src/types/cv.ts`** - Added new TypeScript interfaces
2. **`frontend/src/services/cv/CVParser.ts`** - Added async methods and smart wrapper
3. **`frontend/src/services/cv/CVServiceCore.ts`** - Added service layer methods and exports
4. **`frontend/.env.example`** - Added environment variable documentation
5. **`frontend/vite.config.ts`** - Ensured environment variable exposure
6. **`frontend/src/services/cv/__tests__/CVServiceCore.async.test.ts`** - Added comprehensive test suite

## Future Considerations

1. **Job Status Polling**: When using async mode, consider implementing job status polling to track generation progress
2. **Progress Indicators**: Update UI components to show progress indicators in async mode
3. **Timeout Handling**: Implement appropriate timeout handling for long-running async jobs
4. **Error Recovery**: Consider implementing retry logic for failed async jobs
5. **Analytics**: Track usage of sync vs async modes for optimization insights

## Summary

The async CV generation implementation successfully:

✅ Adds support for async CV generation via feature flag  
✅ Maintains 100% backward compatibility  
✅ Provides clear, type-safe interfaces  
✅ Includes comprehensive error handling  
✅ Supports both explicit and automatic mode selection  
✅ Includes thorough documentation and testing  

The implementation is ready for production use and can be enabled by setting the `VITE_ENABLE_ASYNC_CV_GENERATION=true` environment variable.