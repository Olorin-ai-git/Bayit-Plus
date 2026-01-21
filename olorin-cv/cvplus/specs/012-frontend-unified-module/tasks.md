# Tasks: Frontend Unified Module with Microservices Architecture

**Input**: Design documents from `/specs/012-frontend-unified-module/`
**Prerequisites**: plan.md (available), research.md (available), data-model.md (available)

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → Frontend microservices architecture with 10 domain-specific microservices
   → Tech stack: TypeScript 5.8+, React 19, Vite, Tailwind CSS, Firebase SDK
   → Structure: Unified module with internal microservice separation
2. Load design documents:
   → research.md: Microservices patterns, domain mapping, technical implementation
   → data-model.md: State management, data boundaries, cross-microservice communication
3. Generate tasks by category:
   → Setup: Microservice infrastructure, shared tooling, configuration
   → Core Microservices: Create each domain microservice with proper structure
   → Migration: Move domain-specific code to appropriate microservices
   → Integration: Cross-microservice communication, shared state management
   → Polish: Testing, documentation, performance optimization
4. Apply task rules:
   → Different microservices = parallel [P] when independent
   → Same microservice structure = sequential for consistency
   → Tests before implementation (TDD)
5. SUCCESS: 65+ numbered, ordered tasks for microservices implementation
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different microservices, no dependencies)
- Include exact file paths for each microservice component

## Phase 3.1: Infrastructure & Shared Setup
- [ ] T001 Create microservices directory structure in packages/frontend/src/microservices/
- [ ] T002 [P] Setup shared TypeScript configuration for microservices in packages/frontend/tsconfig.json
- [ ] T003 [P] Configure Vite build system for microservice optimization in packages/frontend/vite.config.ts
- [ ] T004 [P] Setup shared ESLint configuration with microservice rules in packages/frontend/eslint.config.js
- [ ] T005 [P] Configure Vitest testing framework for microservice isolation in packages/frontend/vitest.config.ts
- [ ] T006 [P] Setup Tailwind CSS with design system tokens in packages/frontend/tailwind.config.js

## Phase 3.2: Core Infrastructure Microservice (Foundation)
- [ ] T007 Create core-ui microservice structure: packages/frontend/src/microservices/core-ui/
- [ ] T008 [P] Create core-ui components directory: packages/frontend/src/microservices/core-ui/components/
- [ ] T009 [P] Create core-ui hooks directory: packages/frontend/src/microservices/core-ui/hooks/
- [ ] T010 [P] Create core-ui contexts directory: packages/frontend/src/microservices/core-ui/contexts/
- [ ] T011 [P] Create core-ui types directory: packages/frontend/src/microservices/core-ui/types/
- [ ] T012 [P] Create core-ui utils directory: packages/frontend/src/microservices/core-ui/utils/
- [ ] T013 Implement core-ui barrel exports: packages/frontend/src/microservices/core-ui/index.ts

## Phase 3.3: Authentication Microservice (Critical Foundation)
- [ ] T014 Create auth-ui microservice structure: packages/frontend/src/microservices/auth-ui/
- [ ] T015 [P] Create auth-ui components directory: packages/frontend/src/microservices/auth-ui/components/
- [ ] T016 [P] Create auth-ui hooks directory: packages/frontend/src/microservices/auth-ui/hooks/
- [ ] T017 [P] Create auth-ui contexts directory: packages/frontend/src/microservices/auth-ui/contexts/
- [ ] T018 [P] Create auth-ui types directory: packages/frontend/src/microservices/auth-ui/types/
- [ ] T019 Implement auth-ui barrel exports: packages/frontend/src/microservices/auth-ui/index.ts
- [ ] T020 Migrate SignInDialog component to packages/frontend/src/microservices/auth-ui/components/SignInDialog.tsx
- [ ] T021 Migrate AuthGuard component to packages/frontend/src/microservices/auth-ui/components/AuthGuard.tsx
- [ ] T022 Migrate PermissionGate component to packages/frontend/src/microservices/auth-ui/components/PermissionGate.tsx

## Phase 3.4: Domain Microservices Creation (Parallel Implementation)
- [ ] T023 [P] Create cv-processing-ui microservice: packages/frontend/src/microservices/cv-processing-ui/
- [ ] T024 [P] Create multimedia-ui microservice: packages/frontend/src/microservices/multimedia-ui/
- [ ] T025 [P] Create analytics-ui microservice: packages/frontend/src/microservices/analytics-ui/
- [ ] T026 [P] Create premium-ui microservice: packages/frontend/src/microservices/premium-ui/
- [ ] T027 [P] Create public-profiles-ui microservice: packages/frontend/src/microservices/public-profiles-ui/
- [ ] T028 [P] Create admin-ui microservice: packages/frontend/src/microservices/admin-ui/
- [ ] T029 [P] Create workflow-ui microservice: packages/frontend/src/microservices/workflow-ui/
- [ ] T030 [P] Create payments-ui microservice: packages/frontend/src/microservices/payments-ui/

## Phase 3.5: Microservice Internal Structure (Parallel Setup)
- [ ] T031 [P] Setup cv-processing-ui internal structure with components, hooks, contexts, types directories
- [ ] T032 [P] Setup multimedia-ui internal structure with components, hooks, contexts, types directories
- [ ] T033 [P] Setup analytics-ui internal structure with components, hooks, contexts, types directories
- [ ] T034 [P] Setup premium-ui internal structure with components, hooks, contexts, types directories
- [ ] T035 [P] Setup public-profiles-ui internal structure with components, hooks, contexts, types directories
- [ ] T036 [P] Setup admin-ui internal structure with components, hooks, contexts, types directories
- [ ] T037 [P] Setup workflow-ui internal structure with components, hooks, contexts, types directories
- [ ] T038 [P] Setup payments-ui internal structure with components, hooks, contexts, types directories

## Phase 3.6: Core Component Migration (Domain-Specific)
- [ ] T039 Migrate CV processing components to packages/frontend/src/microservices/cv-processing-ui/components/
- [ ] T040 Migrate CV analysis components to packages/frontend/src/microservices/cv-processing-ui/components/analysis/
- [ ] T041 Migrate multimedia components to packages/frontend/src/microservices/multimedia-ui/components/
- [ ] T042 Migrate analytics components to packages/frontend/src/microservices/analytics-ui/components/
- [ ] T043 Migrate premium feature components to packages/frontend/src/microservices/premium-ui/components/
- [ ] T044 Migrate public profile components to packages/frontend/src/microservices/public-profiles-ui/components/
- [ ] T045 Migrate admin components to packages/frontend/src/microservices/admin-ui/components/
- [ ] T046 Migrate workflow components to packages/frontend/src/microservices/workflow-ui/components/
- [ ] T047 Migrate payment components to packages/frontend/src/microservices/payments-ui/components/

## Phase 3.7: Hooks Migration (Parallel Domain Migration)
- [ ] T048 [P] Migrate auth hooks to packages/frontend/src/microservices/auth-ui/hooks/
- [ ] T049 [P] Migrate CV processing hooks to packages/frontend/src/microservices/cv-processing-ui/hooks/
- [ ] T050 [P] Migrate multimedia hooks to packages/frontend/src/microservices/multimedia-ui/hooks/
- [ ] T051 [P] Migrate analytics hooks to packages/frontend/src/microservices/analytics-ui/hooks/
- [ ] T052 [P] Migrate premium hooks to packages/frontend/src/microservices/premium-ui/hooks/
- [ ] T053 [P] Migrate public profile hooks to packages/frontend/src/microservices/public-profiles-ui/hooks/
- [ ] T054 [P] Migrate admin hooks to packages/frontend/src/microservices/admin-ui/hooks/
- [ ] T055 [P] Migrate workflow hooks to packages/frontend/src/microservices/workflow-ui/hooks/
- [ ] T056 [P] Migrate payment hooks to packages/frontend/src/microservices/payments-ui/hooks/

## Phase 3.8: Context and State Management (Sequential for Dependencies)
- [ ] T057 Implement core-ui contexts for shared state: packages/frontend/src/microservices/core-ui/contexts/
- [ ] T058 Implement auth-ui contexts: packages/frontend/src/microservices/auth-ui/contexts/AuthContext.tsx
- [ ] T059 Implement cv-processing-ui contexts: packages/frontend/src/microservices/cv-processing-ui/contexts/
- [ ] T060 Implement premium-ui contexts: packages/frontend/src/microservices/premium-ui/contexts/
- [ ] T061 [P] Implement remaining microservice contexts for analytics, multimedia, public-profiles
- [ ] T062 [P] Implement remaining microservice contexts for admin, workflow, payments

## Phase 3.9: Microservice Barrel Exports (Parallel Implementation)
- [ ] T063 [P] Create auth-ui barrel exports: packages/frontend/src/microservices/auth-ui/index.ts
- [ ] T064 [P] Create cv-processing-ui barrel exports: packages/frontend/src/microservices/cv-processing-ui/index.ts
- [ ] T065 [P] Create multimedia-ui barrel exports: packages/frontend/src/microservices/multimedia-ui/index.ts
- [ ] T066 [P] Create analytics-ui barrel exports: packages/frontend/src/microservices/analytics-ui/index.ts
- [ ] T067 [P] Create premium-ui barrel exports: packages/frontend/src/microservices/premium-ui/index.ts
- [ ] T068 [P] Create public-profiles-ui barrel exports: packages/frontend/src/microservices/public-profiles-ui/index.ts
- [ ] T069 [P] Create admin-ui barrel exports: packages/frontend/src/microservices/admin-ui/index.ts
- [ ] T070 [P] Create workflow-ui barrel exports: packages/frontend/src/microservices/workflow-ui/index.ts
- [ ] T071 [P] Create payments-ui barrel exports: packages/frontend/src/microservices/payments-ui/index.ts

## Phase 3.10: Application Shell Integration
- [ ] T072 Create application shell: packages/frontend/src/app/App.tsx with microservice imports
- [ ] T073 Create application entry point: packages/frontend/src/app/main.tsx
- [ ] T074 Create providers wrapper: packages/frontend/src/app/providers.tsx for microservice contexts
- [ ] T075 Update main module exports: packages/frontend/src/index.ts with microservice exports

## Phase 3.11: Import Path Updates (Critical Sequential)
- [ ] T076 Update workspace package.json to include @cvplus/frontend with microservice exports
- [ ] T077 Update import statements in core-ui microservice to use relative paths
- [ ] T078 Update import statements in auth-ui microservice to use microservice pattern
- [ ] T079 Update import statements across all microservices for cross-microservice dependencies
- [ ] T080 Update import statements in packages/auth to use @cvplus/frontend/auth-ui
- [ ] T081 Update import statements in packages/payments to use @cvplus/frontend/payments-ui
- [ ] T082 Update import statements in packages/processing to use @cvplus/frontend/cv-processing-ui
- [ ] T083 Update import statements in functions/src to use @cvplus/frontend types where needed

## Phase 3.12: Cross-Microservice Communication Setup
- [ ] T084 Implement event bus for cross-microservice communication: packages/frontend/src/shared/EventBus.ts
- [ ] T085 Create shared types for cross-microservice data: packages/frontend/src/shared/types/
- [ ] T086 Implement microservice registration system: packages/frontend/src/shared/MicroserviceRegistry.ts
- [ ] T087 Setup error boundaries per microservice: packages/frontend/src/shared/ErrorBoundary.tsx

## Phase 3.13: Testing Infrastructure (Parallel Test Setup)
- [ ] T088 [P] Create test utilities for core-ui microservice: packages/frontend/src/microservices/core-ui/__tests__/
- [ ] T089 [P] Create test utilities for auth-ui microservice: packages/frontend/src/microservices/auth-ui/__tests__/
- [ ] T090 [P] Create test utilities for cv-processing-ui microservice: packages/frontend/src/microservices/cv-processing-ui/__tests__/
- [ ] T091 [P] Create test utilities for premium-ui microservice: packages/frontend/src/microservices/premium-ui/__tests__/
- [ ] T092 [P] Create integration tests for cross-microservice communication: packages/frontend/tests/integration/
- [ ] T093 [P] Create end-to-end tests for complete user flows: packages/frontend/tests/e2e/

## Phase 3.14: Build System Integration and Optimization
- [ ] T094 Configure Vite for microservice-specific code splitting in packages/frontend/vite.config.ts
- [ ] T095 Setup microservice-specific build optimization and lazy loading
- [ ] T096 Configure TypeScript path mapping for microservice imports
- [ ] T097 Setup bundle analysis for microservice sizes and dependencies
- [ ] T098 Implement build validation for microservice boundaries

## Phase 3.15: Documentation and Polish
- [ ] T099 [P] Create documentation for each microservice: packages/frontend/docs/microservices/
- [ ] T100 [P] Create development guidelines for microservice patterns: packages/frontend/docs/development.md
- [ ] T101 [P] Create microservice architecture diagram: packages/frontend/docs/architecture.md
- [ ] T102 [P] Create migration guide for developers: packages/frontend/docs/migration.md
- [ ] T103 [P] Update README.md with microservices architecture overview

## Phase 3.16: Validation and Quality Assurance
- [ ] T104 Run comprehensive TypeScript compilation check across all microservices
- [ ] T105 Run lint validation with microservice-specific rules
- [ ] T106 Execute integration tests for cross-microservice communication
- [ ] T107 Validate microservice boundary isolation and no cross-contamination
- [ ] T108 Performance testing for selective microservice loading
- [ ] T109 Security validation for microservice access control

## Dependencies

### Critical Path Dependencies
```
Infrastructure (T001-T006) →
Core-UI Setup (T007-T013) →
Auth-UI Setup (T014-T022) →
Domain Microservices (T023-T038) →
Migration (T039-T062) →
Integration (T072-T087) →
Testing (T088-T093) →
Optimization (T094-T098) →
Validation (T104-T109)
```

### Key Dependency Rules
- **T007-T013 (core-ui) must complete before all other microservices**
- **T014-T022 (auth-ui) must complete before microservices needing authentication**
- **T023-T038 (microservice creation) can run in parallel**
- **T063-T071 (barrel exports) must complete before T076-T083 (import updates)**
- **T084-T087 (communication) must complete before T092 (integration tests)**

## Parallel Execution Examples

### Phase 3.4: Domain Microservices Creation (Parallel)
```bash
# Launch T023-T030 together - Creating microservice structures
Task(subagent_type="frontend-developer", description="Create cv-processing-ui microservice", prompt="Create packages/frontend/src/microservices/cv-processing-ui/ directory structure with components, hooks, contexts, types subdirectories")

Task(subagent_type="frontend-developer", description="Create multimedia-ui microservice", prompt="Create packages/frontend/src/microservices/multimedia-ui/ directory structure with components, hooks, contexts, types subdirectories")

Task(subagent_type="frontend-developer", description="Create analytics-ui microservice", prompt="Create packages/frontend/src/microservices/analytics-ui/ directory structure with components, hooks, contexts, types subdirectories")

Task(subagent_type="frontend-developer", description="Create premium-ui microservice", prompt="Create packages/frontend/src/microservices/premium-ui/ directory structure with components, hooks, contexts, types subdirectories")
```

### Phase 3.7: Hooks Migration (Parallel)
```bash
# Launch T048-T056 together - Migrating domain-specific hooks
Task(subagent_type="auth-module-specialist", description="Migrate auth hooks", prompt="Move all authentication-related hooks from packages/frontend/src/hooks/ to packages/frontend/src/microservices/auth-ui/hooks/ and update import paths")

Task(subagent_type="cv-processing-specialist", description="Migrate CV processing hooks", prompt="Move CV processing hooks from packages/frontend/src/hooks/ to packages/frontend/src/microservices/cv-processing-ui/hooks/ and update internal imports")

Task(subagent_type="multimedia-specialist", description="Migrate multimedia hooks", prompt="Move multimedia-related hooks from packages/frontend/src/hooks/ to packages/frontend/src/microservices/multimedia-ui/hooks/ and update internal imports")

Task(subagent_type="premium-specialist", description="Migrate premium hooks", prompt="Move premium feature hooks from packages/frontend/src/hooks/ to packages/frontend/src/microservices/premium-ui/hooks/ and update internal imports")
```

### Phase 3.9: Barrel Exports (Parallel)
```bash
# Launch T063-T071 together - Creating microservice exports
Task(subagent_type="typescript-pro", description="Create auth-ui exports", prompt="Create comprehensive barrel exports in packages/frontend/src/microservices/auth-ui/index.ts exporting all components, hooks, contexts, and types")

Task(subagent_type="typescript-pro", description="Create cv-processing-ui exports", prompt="Create comprehensive barrel exports in packages/frontend/src/microservices/cv-processing-ui/index.ts exporting all CV processing components and utilities")

Task(subagent_type="typescript-pro", description="Create premium-ui exports", prompt="Create comprehensive barrel exports in packages/frontend/src/microservices/premium-ui/index.ts exporting all premium feature components and subscription management")
```

## Microservice-Specific Implementation Guidelines

### Microservice Boundaries
- **auth-ui**: Authentication flows, session management, permission gates, user profile UI
- **cv-processing-ui**: CV upload, analysis, generation, preview, ATS optimization UI
- **multimedia-ui**: Video generation, audio processing, media library, podcast creation UI
- **analytics-ui**: Charts, dashboards, reporting, metrics visualization, business intelligence
- **premium-ui**: Subscription management, billing, feature gates, upgrade flows
- **public-profiles-ui**: Profile sharing, social features, testimonials, portfolio display
- **admin-ui**: System administration, user management, monitoring dashboards, security tools
- **workflow-ui**: Job management, workflow automation, task tracking, certification badges
- **payments-ui**: Payment processing, transaction history, billing management, invoicing
- **core-ui**: Layout, navigation, theming, shared components, common utilities

### Cross-Microservice Communication Rules
1. **No Direct Imports**: Microservices communicate through events and shared contracts
2. **Shared State**: Only authentication and theme state shared across microservices
3. **Type Safety**: Shared types defined in packages/frontend/src/shared/types/
4. **Error Isolation**: Each microservice has error boundaries preventing cascade failures

### Import Pattern Standards
```typescript
// ✅ Correct - Microservice internal imports
import { ComponentName } from '../components/ComponentName';
import { useHook } from '../hooks/useHook';

// ✅ Correct - Cross-microservice imports
import { AuthGuard } from '@cvplus/frontend/auth-ui';
import { CVPreview } from '@cvplus/frontend/cv-processing-ui';

// ❌ Incorrect - Direct cross-microservice internal imports
import { ComponentName } from '../../../auth-ui/components/ComponentName';
```

## Success Criteria
1. **Domain Separation**: Clear boundaries between business domains with no cross-contamination
2. **Independent Development**: Each microservice can be developed and tested independently
3. **Performance Optimization**: Selective loading of microservices with optimized bundles
4. **Maintainability**: Clear ownership and focused testing per microservice
5. **Scalability**: Easy addition of new microservices following established patterns

## Risk Mitigation
- **Complexity Management**: Clear documentation and consistent patterns across microservices
- **Bundle Size Control**: Aggressive tree-shaking and shared core infrastructure
- **Development Experience**: IDE integration, automated validation, and clear error messages
- **Performance Monitoring**: Bundle analysis and lazy loading validation per microservice

## Root Frontend Migration (CRITICAL ADDITION)

### Phase 3.X: Root Frontend Migration - Massive Legacy Migration
**Source**: `/Users/gklainert/Documents/cvplus/frontend/` (554+ files)
**Target**: `packages/frontend/src/microservices/` (distributed by domain)

#### Critical Root Frontend Components Migration
- [ ] T200 [P] Migrate features components (91 files) from frontend/src/components/features/ to appropriate microservices
- [ ] T201 [P] Migrate CV-related components (23 files) from frontend/src/components/cv-* to processing-ui/components/
- [ ] T202 [P] Migrate analysis components (13 files) from frontend/src/components/analysis/ to processing-ui/components/
- [ ] T203 [P] Migrate pricing components (12 files) from frontend/src/components/pricing/ to premium-ui/components/
- [ ] T204 [P] Migrate common/layout components (15 files) from frontend/src/components/common to core-ui/components/
- [ ] T205 [P] Migrate pages components (10 files) from frontend/src/pages/ to shell-ui/pages/
- [ ] T206 [P] Migrate enhancement components from frontend/src/components/enhancement/ to processing-ui/components/
- [ ] T207 [P] Migrate admin-integration components from frontend/src/components/admin-integration/ to admin-ui/components/

#### Root Frontend Hooks Migration (46+ files)
- [ ] T208 [P] Migrate CV hooks from frontend/src/hooks/useCVGeneration.ts to processing-ui/hooks/
- [ ] T209 [P] Migrate feature hooks from frontend/src/hooks/useFeature*.ts to appropriate microservices
- [ ] T210 [P] Migrate premium hooks from frontend/src/hooks/usePremium.ts to premium-ui/hooks/
- [ ] T211 [P] Migrate session hooks from frontend/src/hooks/useEnhancedSession.ts to auth-ui/hooks/
- [ ] T212 [P] Migrate utility hooks from frontend/src/hooks/useAsync*.ts to core-ui/hooks/

#### Root Frontend Services Migration (83+ files)
- [ ] T213 [P] Migrate CV services from frontend/src/services/cv/ to processing-ui/services/
- [ ] T214 [P] Migrate enhancement services from frontend/src/services/enhancement/ to processing-ui/services/
- [ ] T215 [P] Migrate features services from frontend/src/services/features/ to appropriate microservices
- [ ] T216 [P] Migrate performance services from frontend/src/services/performance/ to core-ui/services/
- [ ] T217 [P] Migrate error-recovery services from frontend/src/services/error-recovery/ to core-ui/services/

#### Root Frontend Pages Migration (36+ files)
- [ ] T218 Migrate CVAnalysisPage.tsx from frontend/src/pages/ to processing-ui/pages/
- [ ] T219 Migrate CVFeaturesPage.tsx from frontend/src/pages/ to processing-ui/pages/
- [ ] T220 Migrate CVPreviewPage*.tsx from frontend/src/pages/ to processing-ui/pages/
- [ ] T221 Migrate FeatureSelectionPage.tsx from frontend/src/pages/ to shell-ui/pages/
- [ ] T222 Migrate EnhancedTemplatesPage.tsx from frontend/src/pages/ to processing-ui/pages/
- [ ] T223 Migrate FinalResultsPage*.tsx from frontend/src/pages/ to shell-ui/pages/

#### Root Frontend Utils and Types Migration (94+ files)
- [ ] T224 [P] Migrate utility functions (67 files) from frontend/src/utils/ to appropriate microservices
- [ ] T225 [P] Migrate type definitions (27 files) from frontend/src/types/ to shared/types/ and microservice types/
- [ ] T226 [P] Migrate test utilities from frontend/src/__tests__/ to appropriate microservice test directories

#### Root Frontend Configuration Migration
- [ ] T227 Migrate frontend/package.json dependencies to packages/frontend/package.json
- [ ] T228 Migrate frontend/vite.config.ts to packages/frontend/vite.config.ts
- [ ] T229 Migrate frontend/tsconfig.json to packages/frontend/tsconfig.json
- [ ] T230 Migrate frontend/tailwind.config.js to packages/frontend/tailwind.config.js
- [ ] T231 Migrate frontend/.env* files to packages/frontend/
- [ ] T232 Migrate frontend/index.html to packages/frontend/index.html

#### Root Frontend Asset Migration
- [ ] T233 [P] Migrate static assets from frontend/public/ to packages/frontend/public/
- [ ] T234 [P] Migrate CSS files from frontend/src/styles/ to packages/frontend/src/styles/
- [ ] T235 [P] Migrate image assets from frontend/src/assets/ to packages/frontend/src/assets/

#### Root Frontend Import Path Updates (CRITICAL)
- [ ] T236 Update all internal imports within migrated root frontend components
- [ ] T237 Update all cross-references from backend modules to use @cvplus/frontend paths
- [ ] T238 Fix circular dependencies created by root frontend migration
- [ ] T239 Validate all migrated components still function correctly

#### Root Frontend Cleanup
- [ ] T240 Verify all 554+ files successfully migrated from root frontend
- [ ] T241 Remove original root frontend directory: /Users/gklainert/Documents/cvplus/frontend/
- [ ] T242 Update workspace configurations to remove root frontend references
- [ ] T243 Final verification that no frontend code remains outside packages/frontend

## File Count Summary
- **Root Frontend Files**: 554+ files requiring migration from `/frontend/` directory
  - **Components**: 295+ React components → distributed across microservices
  - **Hooks**: 46+ React hooks → migrated to appropriate domains
  - **Services**: 83+ service files → domain-specific microservices
  - **Pages**: 36+ page components → shell-ui and domain pages
  - **Utils**: 67+ utility functions → shared and domain-specific
  - **Types**: 27+ TypeScript definitions → shared and microservice types
- **Package Frontend Files**: Additional files from existing package frontend structure
- **Total Migration Scope**: 554+ files from root + package reorganization
- **Microservices Created**: 10 domain-specific microservices
- **Shared Infrastructure**: Core-UI microservice + application shell
- **Result**: Complete consolidation of ALL frontend code in packages/frontend with domain separation

## Notes
- [P] tasks = different microservices/domains, no dependencies
- Sequential tasks modify shared infrastructure or have cross-microservice dependencies
- Verify microservice boundaries after each phase
- Commit after completing each microservice setup
- Test cross-microservice communication after integration phase

## Validation Checklist
*GATE: Checked during execution*

- [ ] All microservices follow consistent directory structure
- [ ] No cross-domain contamination between microservices
- [ ] All imports use proper microservice patterns
- [ ] Build system optimizes for microservice boundaries
- [ ] Cross-microservice communication works correctly
- [ ] Performance goals met with selective loading