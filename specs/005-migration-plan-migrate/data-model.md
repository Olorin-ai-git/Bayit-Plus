# Data Model: CVPlus Code Migration to Submodules

**Date**: 2025-09-13
**Status**: Phase 1 Complete

## Core Entities

### 1. Migration Unit
**Purpose**: Represents a single code artifact to be migrated
**Fields**:
- `id`: Unique identifier (file path)
- `sourceLocation`: Current location in root repository
- `targetSubmodule`: Destination submodule name
- `fileType`: Classification (service, model, component, test, utility)
- `dependencies`: Array of other files this depends on
- `dependents`: Array of files that depend on this
- `migrationStatus`: Enum (pending, in_progress, completed, failed)
- `domainClassification`: Business domain assignment

**State Transitions**:
```
pending → in_progress → completed
pending → in_progress → failed → pending (retry)
```

**Validation Rules**:
- `sourceLocation` must exist in current repository
- `targetSubmodule` must be valid submodule name
- Cannot migrate if dependencies are not resolved

### 2. Submodule Registry
**Purpose**: Tracks existing submodules and their capabilities
**Fields**:
- `name`: Submodule identifier (e.g., "core", "cv-processing")
- `gitRepository`: Git repository URL
- `localPath`: Path under /packages/
- `domain`: Functional domain classification
- `existingStructure`: Directory layout within submodule
- `apiExports`: Functions/services exported by this submodule
- `dependencies`: Other submodules this depends on

**Relationships**:
- `MigrationUnit.targetSubmodule` → `SubmoduleRegistry.name`

### 3. API Contract
**Purpose**: Tracks external API endpoints that must be preserved
**Fields**:
- `functionName`: Export name in functions/src/index.ts
- `sourceSubmodule`: Which submodule implements this function
- `importPath`: @cvplus/* import path
- `parameters`: Function signature parameters
- `returnType`: Function return type
- `isExported`: Whether currently exported from root

**Validation Rules**:
- All existing exports must remain after migration
- Import paths must resolve to valid submodule exports

### 4. Migration Batch
**Purpose**: Groups related migration units for atomic execution
**Fields**:
- `batchId`: Unique batch identifier
- `name`: Human-readable batch name
- `migrationUnits`: Array of MigrationUnit IDs
- `executionOrder`: Priority ordering for execution
- `prerequisites`: Other batches that must complete first
- `validationCriteria`: Success criteria for batch completion

**State Transitions**:
```
planned → executing → validating → completed
planned → executing → validating → failed
```

### 5. Build Validation
**Purpose**: Tracks build/deployment validation at each migration step
**Fields**:
- `validationId`: Unique identifier
- `triggeringBatch`: Which migration batch triggered this validation
- `validationType`: Enum (typescript, build, test, deploy)
- `status`: Enum (running, passed, failed)
- `errorDetails`: Detailed error information if failed
- `timestamp`: When validation was executed
- `metrics`: Performance metrics (build time, test count, etc.)

## Domain Classifications

### Primary Domains
1. **CV Processing**: CV analysis, ATS optimization, personality insights, skills visualization
2. **Multimedia**: Video generation, podcast creation, media processing, portfolio galleries
3. **Analytics**: Metrics collection, reporting, business intelligence, performance monitoring
4. **Public Profiles**: Web portals, social integration, testimonials, QR codes
5. **Authentication**: User authentication, session management, permissions
6. **Premium**: Subscription features, enterprise functionality, pricing optimization
7. **Workflow**: Job monitoring, template management, feature orchestration
8. **Admin**: System administration, user management, monitoring tools
9. **Internationalization**: Translation services, multi-language support
10. **Recommendations**: AI-powered suggestions and improvements
11. **Core**: Shared utilities, types, constants used across domains

### Cross-Cutting Concerns
- **Logging**: Structured logging and observability (logging submodule)
- **Portal Generation**: One-click portal functionality (portal-generator submodule)
- **RAG Chat**: Chat interface and AI interactions (rag-chat submodule)

## Migration Mapping Rules

### File Type Classification
```typescript
interface MigrationRules {
  services: {
    pattern: "*.service.ts",
    targetLocation: "src/services/",
    requiresApiExport: true
  },
  models: {
    pattern: "*.(model|entity).ts",
    targetLocation: "src/models/",
    requiresTypeExport: true
  },
  functions: {
    pattern: "functions/*/*.ts",
    targetLocation: "src/backend/functions/",
    requiresIndexExport: true
  },
  components: {
    pattern: "components/**/*.tsx",
    targetLocation: "src/frontend/components/",
    requiresReactExport: true
  },
  tests: {
    pattern: "**/*.test.ts",
    targetLocation: "src/tests/",
    followsSourceLocation: true
  },
  utilities: {
    pattern: "utils/*.ts",
    targetLocation: "src/utils/",
    domainSpecific: false
  }
}
```

### Domain Assignment Logic
```typescript
const domainMappingRules = {
  // CV Processing Domain
  "cv-processing": [
    /cv.*analysis/i,
    /ats.*optimization/i,
    /personality.*insights/i,
    /skills.*visualization/i,
    /role.*profile/i,
    /achievement.*highlighting/i,
    /language.*proficiency/i
  ],

  // Multimedia Domain
  "multimedia": [
    /video.*generation/i,
    /podcast.*creation/i,
    /media.*processing/i,
    /portfolio.*gallery/i,
    /audio.*generation/i
  ],

  // Analytics Domain
  "analytics": [
    /analytics/i,
    /metrics/i,
    /business.*intelligence/i,
    /tracking/i,
    /reporting/i
  ],

  // Public Profiles Domain
  "public-profiles": [
    /public.*profile/i,
    /web.*portal/i,
    /social.*integration/i,
    /testimonials/i,
    /qr.*code/i,
    /contact.*form/i
  ]
};
```

## Integration Points

### Import/Export Chain Updates
```typescript
// Before Migration
import { processCV } from './functions/cv/processCV';

// After Migration
export { processCV } from '@cvplus/cv-processing/backend';
```

### Submodule Dependencies
```typescript
interface SubmoduleDependency {
  from: string;        // Dependent submodule
  to: string;          // Dependency submodule
  importType: 'types' | 'services' | 'utilities';
  isCircular: boolean; // Flag for circular dependency detection
}
```

### API Export Preservation
```typescript
// Root functions/src/index.ts maintains all exports
export {
  // CV Processing Functions
  processCV,
  generateCV,
  analyzeCV,
  // ... all existing exports
} from '@cvplus/cv-processing/backend';

export {
  // Multimedia Functions
  generateVideo,
  generatePodcast,
  // ... all existing exports
} from '@cvplus/multimedia/backend';
```

## Validation Schema

### Migration Completeness Check
- All MigrationUnits have status 'completed'
- All APIContracts have valid import paths
- No circular dependencies between submodules
- TypeScript compilation succeeds
- All tests pass in new structure

### Build Validation Criteria
- TypeScript: Zero compilation errors
- Tests: 100% of existing tests pass
- Deployment: Firebase Functions deploy successfully
- Performance: API response times within existing thresholds

This data model provides the foundation for systematic migration execution with full traceability and validation.