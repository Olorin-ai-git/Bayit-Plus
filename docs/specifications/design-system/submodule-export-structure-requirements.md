# CVPlus Submodule Export Structure Requirements
**Author**: Gil Klainert  
**Date**: August 28, 2025  
**Status**: COMPREHENSIVE DOCUMENTATION  
**Version**: 1.0.0

## Executive Summary

This document defines comprehensive export structure requirements for all CVPlus submodules to ensure proper modular architecture, maintainable import/export patterns, and seamless integration across the platform ecosystem.

## TypeScript Module Structure Requirements

### 1. Standard Index.ts File Structure

All submodules MUST follow this standardized index.ts pattern:

```typescript
/**
 * [Module Name]
 * 
 * [Brief description of module purpose]
 * 
 * @author Gil Klainert
 * @version 1.0.0
 */

// ============================================================================
// TYPE EXPORTS
// ============================================================================
export * from './types';

// ============================================================================
// CORE SERVICES
// ============================================================================
export { ServiceClass } from './services/service-name';

// ============================================================================
// UTILITIES
// ============================================================================
export * from './utils';

// ============================================================================
// CONSTANTS
// ============================================================================
export * from './constants';

// ============================================================================
// REACT EXPORTS (Client-side only - if applicable)
// ============================================================================
export * from './hooks';
export * from './components';

// ============================================================================
// BACKEND EXPORTS (Server-side only - if applicable)
// ============================================================================
export * from './middleware';
export * from './functions';

// ============================================================================
// VERSION INFORMATION
// ============================================================================
export const VERSION = '1.0.0';
export const MODULE_NAME = '@cvplus/[module-name]';
```

### 2. Named vs Default Exports Convention

**MANDATORY RULES:**

- **Services**: Always use named exports
  ```typescript
  export { AuthService } from './services/auth.service';
  ```

- **Types**: Always use namespace exports
  ```typescript
  export * from './types';
  ```

- **Components**: Use named exports
  ```typescript
  export { AuthGuard, SignInDialog } from './components';
  ```

- **Utilities**: Use namespace exports
  ```typescript
  export * from './utils';
  ```

- **Default Exports**: PROHIBITED (except for React components when specifically needed)

### 3. Type Definition Exports

Each submodule MUST provide comprehensive type exports:

```typescript
// types/index.ts
export * from './auth.types';
export * from './config.types';
export * from './error.types';
export * from './session.types';
export * from './permissions.types';

// Branded types for type safety
export type UserId = Brand<string, 'UserId'>;
export type Email = Brand<string, 'Email'>;
```

### 4. Service Class Exports

All service classes MUST follow this pattern:

```typescript
// services/index.ts
export { AuthService } from './auth.service';
export { TokenService } from './token.service';
export { SessionService } from './session.service';

// Default service initialization
export { initializeAuth } from './auth.service';
```

## Package.json Configuration Requirements

### 1. Standard Package.json Template

```json
{
  "name": "@cvplus/[module-name]",
  "version": "1.0.0",
  "description": "[Module description]",
  "main": "dist/index.js",
  "module": "dist/index.esm.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.esm.js",
      "require": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./types": {
      "import": "./dist/types/index.esm.js",
      "require": "./dist/types/index.js",
      "types": "./dist/types/index.d.ts"
    },
    "./constants": {
      "import": "./dist/constants/index.esm.js",
      "require": "./dist/constants/index.js",
      "types": "./dist/constants/index.d.ts"
    },
    "./utils": {
      "import": "./dist/utils/index.esm.js",
      "require": "./dist/utils/index.js",
      "types": "./dist/utils/index.d.ts"
    },
    "./services": {
      "import": "./dist/services/index.esm.js",
      "require": "./dist/services/index.js",
      "types": "./dist/services/index.d.ts"
    }
  },
  "files": [
    "dist/**/*",
    "src/**/*",
    "README.md"
  ]
}
```

### 2. Entry Points Configuration

**MANDATORY ENTRY POINTS:**

- **Main**: `dist/index.js` (CommonJS)
- **Module**: `dist/index.esm.js` (ES Modules)
- **Types**: `dist/index.d.ts` (TypeScript declarations)

**SUBPATH EXPORTS:**

- `/types` - Type definitions only
- `/constants` - Constants and configuration
- `/utils` - Utility functions
- `/services` - Service classes (backend)
- `/components` - React components (frontend)
- `/hooks` - React hooks (frontend)

### 3. Dependencies Management

**DEPENDENCY HIERARCHY:**

```json
{
  "dependencies": {
    "@cvplus/core": "*",
    // External dependencies
    "firebase": "^10.12.0"
  },
  "peerDependencies": {
    "react": ">=18.0.0",
    "typescript": ">=5.0.0"
  },
  "devDependencies": {
    // Build and development tools
    "typescript": "^5.6.3",
    "tsup": "^8.0.0"
  }
}
```

## Import/Export Patterns

### 1. Root CVPlus Import Pattern

**Firebase Functions (backend)**:
```typescript
// functions/src/functions/example.ts
import { 
  AuthService, 
  TokenService,
  type UserSession 
} from '@cvplus/auth';

import { 
  CVAnalysisService,
  type CVData 
} from '@cvplus/cv-processing';
```

**React Frontend**:
```typescript
// frontend/src/components/Example.tsx
import { 
  AuthProvider, 
  useAuth,
  type AuthConfig 
} from '@cvplus/auth';

import { 
  CVUpload,
  useCVProcessing 
} from '@cvplus/cv-processing';
```

### 2. Cross-Submodule Imports

**ALLOWED PATTERN:**
```typescript
// packages/premium/src/services/billing.service.ts
import { AuthService, type UserSession } from '@cvplus/auth';
import { type CVData } from '@cvplus/core/types';
```

**PROHIBITED PATTERNS:**
```typescript
// ❌ Direct file imports
import { AuthService } from '@cvplus/auth/src/services/auth.service';

// ❌ Relative imports across modules
import { AuthService } from '../../../auth/src/services/auth.service';
```

### 3. TypeScript Path Mapping

**Root tsconfig.json**:
```json
{
  "compilerOptions": {
    "paths": {
      "@cvplus/*": ["./packages/*/src"],
      "@cvplus/*/types": ["./packages/*/src/types"],
      "@cvplus/*/constants": ["./packages/*/src/constants"],
      "@cvplus/*/utils": ["./packages/*/src/utils"]
    }
  }
}
```

**Firebase Functions tsconfig.json**:
```json
{
  "compilerOptions": {
    "paths": {
      "@cvplus/*": ["../packages/*/dist"]
    }
  }
}
```

**Frontend tsconfig.json**:
```json
{
  "compilerOptions": {
    "paths": {
      "@cvplus/*": ["../packages/*/src"]
    }
  }
}
```

## Build and Distribution Requirements

### 1. Build Output Structure

Each submodule MUST generate:

```
dist/
├── index.js              # CommonJS bundle
├── index.esm.js          # ES Module bundle  
├── index.d.ts            # Main type declarations
├── types/
│   ├── index.js
│   ├── index.esm.js
│   └── index.d.ts
├── constants/
│   ├── index.js
│   ├── index.esm.js
│   └── index.d.ts
├── utils/
│   ├── index.js
│   ├── index.esm.js
│   └── index.d.ts
└── services/
    ├── index.js
    ├── index.esm.js
    └── index.d.ts
```

### 2. Build Scripts Configuration

**Standard build scripts**:
```json
{
  "scripts": {
    "build": "npm run clean && npm run build:types && npm run build:bundle",
    "build:types": "tsc --project tsconfig.build.json",
    "build:bundle": "tsup",
    "build:watch": "tsup --watch",
    "clean": "rimraf dist",
    "dev": "npm run build:watch"
  }
}
```

### 3. Development vs Production Patterns

**Development (using source)**:
```typescript
// Uses src/ directly for faster builds
import { AuthService } from '@cvplus/auth';
// Resolves to: packages/auth/src/index.ts
```

**Production (using built)**:
```typescript
// Uses dist/ for optimized bundles
import { AuthService } from '@cvplus/auth';
// Resolves to: packages/auth/dist/index.js
```

## Specific Submodule Requirements

### 1. packages/core/ (Foundation Module)

**Primary Exports**:
```typescript
// Core types and utilities used by all modules
export * from './types';      // Base types, API types, utility types
export * from './constants';  // App constants, feature flags
export * from './utils';      // Type guards, formatters, validators

// Version info
export const VERSION = '1.0.0';
export const PACKAGE_NAME = '@cvplus/core';
```

**Usage Pattern**:
```typescript
import { type CVData, ValidationError, formatDate } from '@cvplus/core';
```

### 2. packages/auth/ (Authentication Services)

**Primary Exports**:
```typescript
// Services
export { AuthService } from './services/auth.service';
export { TokenService } from './services/token.service';
export { SessionService } from './services/session.service';

// React components and hooks
export { AuthProvider } from './context/AuthContext';
export { useAuth, useSession } from './hooks';
export { AuthGuard, SignInDialog } from './components';

// Types
export * from './types';
```

**Firebase Functions Integration**:
```typescript
// functions/src/middleware/auth.ts
import { AuthService, type UserSession } from '@cvplus/auth';

const verifyAuth = async (token: string): Promise<UserSession> => {
  return AuthService.verifyToken(token);
};
```

**React Integration**:
```typescript
// frontend/src/App.tsx
import { AuthProvider } from '@cvplus/auth';

function App() {
  return (
    <AuthProvider config={authConfig}>
      {/* App content */}
    </AuthProvider>
  );
}
```

### 3. packages/premium/ (Subscription Services)

**Primary Exports**:
```typescript
// Services
export { SubscriptionService } from './services/subscription.service';
export { BillingService } from './services/billing.service';
export { FeatureGateService } from './services/features.service';

// Components
export { FeatureGate, UpgradePrompt } from './components';
export { useSubscription, useBilling } from './hooks';

// Types
export * from './types';
```

### 4. packages/analytics/ (Tracking & Reporting)

**Primary Exports**:
```typescript
// Services
export { AnalyticsService } from './services/analytics.service';
export { RevenueAnalyticsService } from './services/revenue-analytics.service';
export { ABTestingService } from './services/ab-testing.service';

// Types
export * from './types';
```

### 5. packages/admin/ (Dashboard & Management)

**Primary Exports**:
```typescript
// Backend services
export { AdminService } from './services/admin.service';

// React components
export { AdminDashboard } from './components/AdminDashboard';
export { UserManagement } from './components/UserManagement';

// Middleware
export { adminAuthMiddleware } from './middleware';

// Types
export * from './types';
```

### 6. packages/multimedia/ (Media Processing)

**Primary Exports**:
```typescript
// Services
export { MediaProcessor } from './processors/MediaProcessor';
export { AudioProcessor } from './processors/AudioProcessor';
export { VideoProcessor } from './processors/VideoProcessor';

// Storage
export { StorageService } from './services/storage';

// Types
export * from './types';
```

### 7. packages/cv-processing/ (CV Analysis & Generation)

**Primary Exports**:
```typescript
// Backend functions
export { analyzeCV } from './functions/analyzeCV';
export { generateCV } from './functions/generateCV';

// Services
export { CVAnalysisService } from './services/cv-analysis.service';

// React components
export { CVUpload, CVPreview } from './components';
export { useCVProcessing } from './hooks';

// Types
export * from './types';
```

### 8. packages/public-profiles/ (Profile Management)

**Primary Exports**:
```typescript
// Services
export { ProfileService } from './services/profile.service';
export { SEOService } from './services/seo.service';

// Types
export * from './types';
```

### 9. packages/recommendations/ (AI Recommendations)

**Primary Exports**:
```typescript
// Services
export { RecommendationsService } from './services/recommendations.service';

// Backend functions
export { getRecommendations } from './functions/getRecommendations';

// React hooks
export { useRecommendations } from './hooks';

// Types
export * from './types';
```

### 10. packages/i18n/ (Internationalization)

**Primary Exports**:
```typescript
// Services
export { TranslationService } from './services/translation.service';

// React components
export { I18nProvider } from './providers/I18nProvider';
export { LanguageSelector, TranslatedText } from './components';
export { useTranslation } from './hooks';

// Types
export * from './types';
```

## Integration Guidelines

### 1. Firebase Functions Integration

**Standard Function Pattern**:
```typescript
// functions/src/functions/example.ts
import { onCall } from 'firebase-functions/v2/https';
import { AuthService, type UserSession } from '@cvplus/auth';
import { CVAnalysisService, type CVData } from '@cvplus/cv-processing';

export const analyzeUserCV = onCall(async (request) => {
  // Verify authentication
  const session = await AuthService.verifyToken(request.auth?.token);
  
  // Process CV
  const result = await CVAnalysisService.analyze(request.data.cvData);
  
  return { success: true, data: result };
});
```

**Functions Index Pattern**:
```typescript
// functions/src/index.ts
export { analyzeUserCV } from './functions/cv-analysis';
export { getRecommendations } from '@cvplus/recommendations/functions';
export { checkFeatureAccess } from '@cvplus/premium/functions';
```

### 2. React Frontend Integration

**App.tsx Integration Pattern**:
```typescript
// frontend/src/App.tsx
import React from 'react';
import { AuthProvider } from '@cvplus/auth';
import { I18nProvider } from '@cvplus/i18n';
import { AnalyticsProvider } from '@cvplus/analytics';

function App() {
  return (
    <AuthProvider>
      <I18nProvider>
        <AnalyticsProvider>
          {/* App content */}
        </AnalyticsProvider>
      </I18nProvider>
    </AuthProvider>
  );
}
```

**Component Usage Pattern**:
```typescript
// frontend/src/pages/CVAnalysis.tsx
import React from 'react';
import { useAuth } from '@cvplus/auth';
import { CVUpload, useCVProcessing } from '@cvplus/cv-processing';
import { FeatureGate } from '@cvplus/premium';

export function CVAnalysisPage() {
  const { user } = useAuth();
  const { uploadCV, processing } = useCVProcessing();
  
  return (
    <FeatureGate feature="cv-analysis" fallback={<UpgradePrompt />}>
      <CVUpload onUpload={uploadCV} loading={processing} />
    </FeatureGate>
  );
}
```

### 3. Testing Framework Integration

**Submodule Testing Pattern**:
```typescript
// packages/auth/src/__tests__/auth.service.test.ts
import { AuthService } from '../services/auth.service';
import { type UserSession } from '../types';

describe('AuthService', () => {
  test('should verify valid token', async () => {
    const session = await AuthService.verifyToken(validToken);
    expect(session.userId).toBeDefined();
  });
});
```

**Integration Testing Pattern**:
```typescript
// __tests__/integration/auth-cv-processing.test.ts
import { AuthService } from '@cvplus/auth';
import { CVAnalysisService } from '@cvplus/cv-processing';

describe('Auth + CV Processing Integration', () => {
  test('should require authentication for CV analysis', async () => {
    // Test authentication requirement
    expect(() => 
      CVAnalysisService.analyze(cvData, { skipAuth: false })
    ).toThrow('Authentication required');
  });
});
```

## CI/CD Considerations

### 1. Modular Build Pipeline

**Package-level builds**:
```yaml
# .github/workflows/build.yml
name: Build Packages
on: [push, pull_request]

jobs:
  build-core:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: cd packages/core && npm ci && npm run build
      
  build-auth:
    needs: build-core
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: cd packages/auth && npm ci && npm run build
      
  # Continue for all packages...
```

### 2. Dependency Order Management

**Build Order (CRITICAL)**:
1. `@cvplus/core` (no dependencies)
2. `@cvplus/auth` (depends on core)
3. `@cvplus/premium` (depends on core, auth)
4. `@cvplus/analytics` (depends on core, auth)
5. `@cvplus/cv-processing` (depends on core, auth)
6. All remaining modules in parallel

### 3. Firebase Functions Deployment

**Functions Build Pattern**:
```bash
#!/bin/bash
# scripts/build-functions.sh

# Build all required packages first
npm run build:core
npm run build:auth
npm run build:cv-processing
npm run build:premium
npm run build:recommendations

# Build functions
cd functions && npm run build

# Deploy
firebase deploy --only functions
```

## Performance Considerations

### 1. Bundle Optimization

**Tree Shaking Support**:
```typescript
// Enable tree shaking with named exports
export { AuthService } from './auth.service';      // ✅ Tree-shakable
export * as AuthModule from './auth.service';      // ❌ Not tree-shakable
```

**Subpath Imports**:
```typescript
// Optimized imports
import { ValidationError } from '@cvplus/core/types';       // ✅ Specific import
import { formatDate } from '@cvplus/core/utils';            // ✅ Specific import

// Less optimal
import { ValidationError, formatDate } from '@cvplus/core'; // ❌ Full bundle
```

### 2. Development Performance

**Watch Mode Optimization**:
```json
{
  "scripts": {
    "dev": "npm run build:watch",
    "build:watch": "tsup --watch --no-clean"
  }
}
```

### 3. Production Optimization

**Bundle Analysis**:
```bash
# Analyze bundle sizes
npm run build:analyze

# Check for duplicate dependencies
npm run dependencies:analyze
```

## Version Management & Compatibility

### 1. Semantic Versioning

**Version Strategy**:
- **Major**: Breaking changes to public API
- **Minor**: New features, backward compatible
- **Patch**: Bug fixes, backward compatible

### 2. Compatibility Matrix

**Package Dependencies**:
```json
{
  "dependencies": {
    "@cvplus/core": "^1.0.0",      // Always use core v1.x
    "@cvplus/auth": "~1.0.0"       // Pin to exact minor version
  }
}
```

### 3. Migration Guide Template

**Breaking Change Communication**:
```markdown
## Migration Guide: @cvplus/auth v1.0.0 → v2.0.0

### Breaking Changes
1. `AuthService.login()` → `AuthService.signIn()`
2. `UserSession` interface updated

### Migration Steps
1. Update imports: `import { signIn } from '@cvplus/auth'`
2. Update function calls: `authService.signIn(credentials)`
```

## Security Considerations

### 1. Secure Export Patterns

**Server-only Exports**:
```typescript
// packages/auth/src/server.ts - Server-side only
export { AdminTokenService } from './services/admin-token.service';
export { DatabaseService } from './services/database.service';
```

**Client-safe Exports**:
```typescript
// packages/auth/src/client.ts - Client-side safe
export { AuthProvider } from './context/AuthContext';
export { useAuth } from './hooks/useAuth';
```

### 2. Environment-specific Builds

**Conditional Exports**:
```json
{
  "exports": {
    "./server": {
      "node": "./dist/server.js",
      "default": "./dist/server.js"
    },
    "./client": {
      "browser": "./dist/client.js",
      "default": "./dist/client.js"
    }
  }
}
```

## Quality Assurance

### 1. Export Validation

**Automated Testing**:
```typescript
// __tests__/exports.test.ts
import * as CoreModule from '@cvplus/core';
import * as AuthModule from '@cvplus/auth';

describe('Module Exports', () => {
  test('should export required services', () => {
    expect(CoreModule.ValidationError).toBeDefined();
    expect(AuthModule.AuthService).toBeDefined();
  });
  
  test('should not export internal utilities', () => {
    expect(AuthModule.InternalUtility).toBeUndefined();
  });
});
```

### 2. Documentation Standards

**README.md Template**:
```markdown
# @cvplus/[module-name]

## Installation
```bash
npm install @cvplus/[module-name]
```

## Usage
```typescript
import { ServiceClass } from '@cvplus/[module-name]';
```

## API Reference
[Detailed API documentation]
```

## Conclusion

This comprehensive documentation establishes the foundation for maintainable, scalable, and secure submodule architecture in the CVPlus platform. All development teams MUST follow these standards to ensure consistent integration patterns across the entire ecosystem.

**Next Steps:**
1. Review and approve this documentation
2. Update existing submodules to match these patterns
3. Implement automated validation for export compliance
4. Create migration guides for any breaking changes

---
**Document Status**: Ready for implementation  
**Review Required**: Yes  
**Implementation Priority**: Critical