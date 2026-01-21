# Firebase Functions v2 CORS Configuration Research

## Issue Description
The `podcastStatus` function using `onCall` with corsOptions is returning 403 on preflight OPTIONS requests, while `processCV` function with identical configuration works fine.

## Key Findings

### 1. Function Types and CORS Handling

#### onCall Functions (Callable Functions)
- **Purpose**: Designed for direct client SDK calls
- **CORS Handling**: Firebase SDK handles CORS automatically for authenticated calls
- **Configuration**: Uses `cors` property in function options
- **Authentication**: Built-in authentication integration
- **Example Pattern**:
```typescript
export const functionName = onCall(
  {
    timeoutSeconds: 30,
    ...corsOptions  // Uses: { cors: [...origins] }
  },
  async (request) => {
    // request.auth is automatically available
    // No manual CORS handling needed
  }
);
```

#### onRequest Functions (HTTP Functions)
- **Purpose**: Designed for direct HTTP requests
- **CORS Handling**: Manual CORS handling required for preflight requests
- **Configuration**: Uses `cors` property + manual OPTIONS handling
- **Authentication**: Manual authentication verification required
- **Example Pattern**:
```typescript
export const functionName = onRequest(
  {
    cors: [...origins]
  },
  async (req, res) => {
    // Manual preflight handling
    if (req.method === 'OPTIONS') {
      res.set('Access-Control-Allow-Origin', '*');
      res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.set('Access-Control-Allow-Headers', 'Content-Type');
      res.status(200).send();
      return;
    }
    // Manual request handling
  }
);
```

### 2. Current Codebase Patterns

#### Working Functions (onCall)
- `processCV` - ✅ Works with corsOptions
- `processCVEnhanced` - ✅ Works with corsOptions  
- `generatePodcast` - Status unknown
- `analyzeCV` - Status unknown

#### Problematic Functions
- `podcastStatus` - ❌ 403 on preflight OPTIONS requests

#### Alternative Implementation (onRequest)
- `podcastStatusPublic` - ✅ Works with manual CORS handling

### 3. CORS Configuration Analysis

#### Current corsOptions (from /src/config/cors.ts)
```typescript
export const corsOptions = {
  cors: [
    'https://getmycv-ai.firebaseapp.com',
    'https://getmycv-ai.web.app',
    'https://cvplus.firebaseapp.com',
    'https://cvplus.web.app',
    'https://cvplus.ai',
    'https://www.cvplus.ai',
    'http://localhost:3000', // React dev server
    'http://localhost:5173', // Vite dev server
    'http://localhost:5000', // Firebase emulator
  ]
};
```

#### Firebase Functions v2 CORS Behavior
- **onCall functions**: Firebase automatically handles preflight OPTIONS requests
- **CORS origins**: Must match exactly (no wildcards allowed in v2)
- **Authentication**: onCall functions expect Firebase Auth tokens
- **SDK Integration**: Works seamlessly with Firebase client SDKs

### 4. Potential Root Causes

#### Theory 1: Authentication Requirements
- onCall functions require authentication by default
- Preflight OPTIONS requests don't include auth headers
- Firebase may be rejecting unauthenticated preflight requests

#### Theory 2: Function Configuration Differences
- Different timeout settings might affect CORS handling
- Memory allocation differences could impact function behavior
- Missing or incorrect function options

#### Theory 3: Firebase SDK vs Direct HTTP Calls
- onCall functions are designed for Firebase SDK usage
- Direct HTTP calls to onCall functions may not work as expected
- Client might need to use Firebase callable function syntax

## Recommended Solutions (Priority Order)

### Solution 1: Add Explicit Memory Configuration (HIGHEST PRIORITY)
The most likely cause is missing explicit memory configuration. All working functions specify memory explicitly:

```typescript
export const podcastStatus = onCall(
  {
    timeoutSeconds: 30,
    memory: '512MiB', // Add this line
    ...corsOptions
  },
  async (request) => {
    // existing implementation
  }
);
```

### Solution 2: Match Working Function Configuration Pattern
Copy the exact configuration pattern from working functions:

```typescript
export const podcastStatus = onCall(
  {
    timeoutSeconds: 120, // Increase from 30s
    memory: '512MiB',    // Add explicit memory
    ...corsOptions,
    // Consider adding: secrets: [] if needed
  },
  async (request) => {
    // existing implementation
  }
);
```

### Solution 3: Debug with Function Logs
Check Cloud Functions logs for specific error messages:
1. Go to Firebase Console → Functions
2. Click on `podcastStatus` function
3. View logs for 403 errors
4. Look for CORS-specific error messages

### Solution 4: Test with Minimal Function
Create a minimal test version to isolate the issue:

```typescript
export const testPodcastStatus = onCall(
  {
    timeoutSeconds: 120,
    memory: '512MiB',
    ...corsOptions
  },
  async (request) => {
    return { status: 'test', timestamp: Date.now() };
  }
);
```

### Solution 5: Convert to onRequest (LAST RESORT)
Only if onCall pattern continues to fail, convert to onRequest pattern like `podcastStatusPublic`

## Function Comparison Analysis

### Working Functions (onCall)
| Function | Memory | Timeout | Secrets | Notes |
|----------|--------|---------|---------|--------|
| `processCV` | 2GiB | 300s | Commented out | ✅ Working |
| `processCVEnhanced` | 2GiB | 540s | ANTHROPIC_API_KEY, OPENAI_API_KEY | ✅ Working |
| `generatePodcast` | 2GiB | 540s | ELEVENLABS_API_KEY, etc. | Status unknown |
| `analyzeCV` | 512MiB | 120s | Commented out | Status unknown |

### Problematic Functions (onCall)
| Function | Memory | Timeout | Secrets | Notes |
|----------|--------|---------|---------|--------|
| `podcastStatus` | default | 30s | none | ❌ 403 on preflight |

### Key Differences Observed
1. **Memory Allocation**: Working functions explicitly set memory (512MiB-2GiB), problematic function uses default
2. **Secrets Configuration**: Working functions have secrets defined, problematic function has none
3. **Timeout**: All functions have reasonable timeouts, podcastStatus has shortest (30s)

## Client Integration Analysis

### Frontend Implementation (Confirmed Correct)
```typescript
// From /frontend/src/services/cvService.ts
export const getPodcastStatus = async (jobId: string) => {
  const statusFunction = httpsCallable(functions, 'podcastStatus');
  const result = await statusFunction({ jobId });
  return result.data;
};
```

- ✅ Uses Firebase SDK correctly
- ✅ Same pattern as working functions
- ✅ Proper authentication handling

### Function Export (Confirmed Correct)
```typescript
// From /functions/src/index.ts
export { podcastStatus } from './functions/podcastStatus';
```

## Next Steps

1. **Test Memory Configuration**: Add explicit memory setting to `podcastStatus`
2. **Test Other onCall Functions**: Verify if `generatePodcast` and `analyzeCV` work
3. **Check Function Logs**: Review Cloud Functions logs for specific error details
4. **Test Authentication Flow**: Verify token validation
5. **Compare Network Requests**: Use browser dev tools to compare requests between working and non-working functions

## Environment Information

- **Firebase Functions Version**: v6.4.0
- **Functions Runtime**: v2
- **Project**: CVPlus
- **Node.js Version**: 20+