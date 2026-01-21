# Portal Original Types Decomposition Plan

**File**: portal-original.ts (1,419 lines) → MUST be under 200 lines
**Target**: 8-10 focused modules under 200 lines each

## Proposed Module Breakdown

### 1. `portal-core.ts` (~150 lines)
- PortalConfig (main interface)
- PortalTemplate
- PortalCustomization
- PortalStatus enum
- PortalGenerationResult

### 2. `portal-rag-config.ts` (~180 lines)
- RAGConfig
- VectorDatabaseConfig
- VectorDatabaseProvider enum
- EmbeddingConfig
- EmbeddingProvider enum
- RAGEmbedding
- EmbeddingMetadata
- ChatServiceConfig

### 3. `portal-generation.ts` (~120 lines)
- PortalGenerationStep enum
- PortalTemplateCategory enum
- PortalGenerationWorkflow
- GenerationProgress

### 4. `portal-styling.ts` (~180 lines)
- ColorScheme
- TypographyConfig
- PortalSection enum
- ComponentConfiguration
- Theme-related interfaces

### 5. `portal-content.ts` (~150 lines)
- CVSection enum
- ContentType enum
- ContentProcessing interfaces
- Asset-related types

### 6. `portal-integration.ts` (~140 lines)
- CVPlusIntegration
- JobIntegration
- DeploymentMetadata
- DeploymentResult

### 7. `portal-assets.ts` (~180 lines)
- QRCodeOptions
- QRCodeType enum
- QRCodeStyling
- AssetType enum
- AssetSource enum
- AssetProcessingResult
- AssetOptimizationConfig

### 8. `portal-build.ts` (~120 lines)
- BuildConfig
- DeploymentMetadata
- Component build configurations

### 9. `portal-utility-types.ts` (~100 lines)
- Utility types (Partial, Create, Update types)
- Type helpers
- Re-exports from other modules

## Migration Strategy

1. Create each module with focused responsibility
2. Update imports in portal-original.ts to use new modules
3. Gradually replace portal-original.ts usage across codebase
4. Remove portal-original.ts once all dependencies updated
5. Update index.ts exports

## Benefits

- ✅ Each module under 200 lines
- ✅ Clear separation of concerns
- ✅ Maintainable and focused modules
- ✅ Better tree-shaking potential
- ✅ Easier to test and modify individual aspects