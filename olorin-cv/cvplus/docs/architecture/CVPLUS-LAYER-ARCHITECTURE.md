# CVPlus Layer Architecture

**Author**: Gil Klainert
**Date**: 2025-09-14
**Status**: Official Architecture Definition

## Overview

The CVPlus platform follows a strict layered architecture to ensure clean dependencies, maintainability, and scalability. Each layer can only depend on layers below it, never on same-layer or higher-layer modules.

## Architecture Layers

### Layer 0: Infrastructure
**Purpose**: Core infrastructure services that all other modules depend on.

```
Layer 0 (Infrastructure):
└── @cvplus/logging - Universal logging system for all modules
```

**Characteristics**:
- NO dependencies on other CVPlus modules
- Only external npm dependencies
- Must build first in the ecosystem
- Provides foundational services (logging, monitoring, metrics)

### Layer 1: Foundation Services
**Purpose**: Shared services and utilities used across the platform.

```
Layer 1 (Foundation Services):
├── @cvplus/core - Shared types, utilities, configuration
└── @cvplus/shell - Main orchestrator application
```

**Dependencies**:
- ✅ Can depend on Layer 0 (@cvplus/logging)
- ✅ Can depend on external npm packages
- ❌ Cannot depend on same layer or higher layers

**@cvplus/core** responsibilities:
- Type definitions for all domain objects
- Shared utilities (validation, formatting, etc.)
- Configuration management
- Firebase integration utilities
- Re-exports logging from @cvplus/logging for convenience

**@cvplus/shell** responsibilities:
- Main application orchestration
- Route management
- Module integration
- User interface shell

### Layer 2: Domain Services
**Purpose**: Business domain implementations and features.

```
Layer 2 (Domain Services):
├── @cvplus/auth - Authentication and session management
├── @cvplus/i18n - Internationalization framework
├── @cvplus/cv-processing - CV analysis and enhancement
├── @cvplus/multimedia - Media generation and processing
├── @cvplus/analytics - Business intelligence and tracking
├── @cvplus/premium - Subscription and billing features
├── @cvplus/public-profiles - Public profile functionality
├── @cvplus/recommendations - AI-powered recommendations
├── @cvplus/admin - Admin dashboard and management
├── @cvplus/workflow - Job management and workflows
└── @cvplus/payments - Payment processing
```

**Dependencies**:
- ✅ Can depend on Layer 0 (@cvplus/logging)
- ✅ Can depend on Layer 1 (@cvplus/core, @cvplus/shell)
- ✅ Can depend on external npm packages
- ❌ Cannot depend on other Layer 2 modules (peer dependencies)

## Dependency Rules

### Allowed Dependencies by Layer

| Layer | Can Import From | Cannot Import From |
|-------|----------------|-------------------|
| Layer 0 | External npm only | Any CVPlus module |
| Layer 1 | Layer 0, External npm | Layer 1, Layer 2 |
| Layer 2 | Layer 0, Layer 1, External npm | Other Layer 2 modules |

### Import Examples

```typescript
// ✅ CORRECT - Layer 2 importing from Layer 1
// In @cvplus/auth
import { User, ApiResponse } from '@cvplus/core';
import { logger } from '@cvplus/core/logging'; // Re-exported from @cvplus/logging

// ✅ CORRECT - Layer 1 importing from Layer 0
// In @cvplus/core
import { LoggerFactory } from '@cvplus/logging/backend';

// ❌ WRONG - Layer 2 importing from Layer 2
// In @cvplus/premium
import { AuthService } from '@cvplus/auth'; // NEVER - peer dependency

// ❌ WRONG - Layer 1 importing from Layer 2
// In @cvplus/core
import { CVProcessor } from '@cvplus/cv-processing'; // NEVER - higher layer
```

## Build Order

The build process must follow the layer hierarchy:

1. **Layer 0 First**: Build @cvplus/logging
2. **Layer 1 Second**: Build @cvplus/core, then @cvplus/shell
3. **Layer 2 Last**: Build all domain modules (can be parallel)

```bash
# Build sequence
npm run build --workspace=@cvplus/logging        # Layer 0
npm run build --workspace=@cvplus/core           # Layer 1
npm run build --workspace=@cvplus/shell          # Layer 1
npm run build --workspaces --if-present          # Layer 2 (all others)
```

## Module Communication

Since Layer 2 modules cannot directly depend on each other, they communicate through:

1. **Events**: Using event emitters or message buses
2. **Interfaces**: Defined in @cvplus/core and implemented by domain modules
3. **Orchestration**: Through @cvplus/shell which coordinates modules
4. **Firebase**: Shared data through Firestore collections

## Testing Strategy

Each layer has different testing requirements:

- **Layer 0**: Unit tests only, no integration dependencies
- **Layer 1**: Unit tests + Layer 0 integration tests
- **Layer 2**: Unit tests + Layer 0/1 integration tests + Firebase integration

## Migration Path

For modules currently violating layer architecture:

1. **Identify violations**: Find improper cross-layer dependencies
2. **Extract interfaces**: Move shared interfaces to @cvplus/core
3. **Remove direct imports**: Replace with events or orchestration
4. **Update build order**: Ensure proper layer sequence
5. **Validate**: Run build and tests to confirm

## Benefits

This architecture provides:

- **Clear Dependencies**: No circular dependencies possible
- **Parallel Development**: Layer 2 modules can be developed independently
- **Easy Testing**: Lower layers can be tested in isolation
- **Scalability**: New domain modules can be added without affecting others
- **Maintainability**: Changes in one module don't cascade unexpectedly

## Compliance Verification

Use these commands to verify architecture compliance:

```bash
# Check for Layer 2 peer dependencies (should return nothing)
grep -r "@cvplus/auth\|@cvplus/premium\|@cvplus/admin" packages/*/src --include="*.ts" --exclude-dir=node_modules

# Verify Layer 0 has no CVPlus dependencies
grep -r "@cvplus/" packages/logging/src --include="*.ts"

# Ensure build order in package.json scripts
cat package.json | jq '.scripts["build:ordered"]'
```

## Conclusion

This layered architecture ensures the CVPlus platform remains maintainable, scalable, and easy to understand. All new development must comply with these layer boundaries.