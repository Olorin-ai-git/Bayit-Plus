# Component Mapping Analysis

**Document Version:** 1.0
**Date:** 2025-01-18
**Author:** Gil Klainert
**Status:** 🔄 IN PROGRESS

## Legacy Codebase Structure Analysis

### Directory Structure Overview
```
src/js/
├── components/          # 42+ React components
├── pages/              # 3 main pages (RAG, Investigation, Investigations)
├── services/           # 8 service files
├── hooks/              # Custom React hooks
├── types/              # TypeScript type definitions
├── contexts/           # React contexts
├── utils/              # Utility functions
├── constants/          # Constants and definitions
└── widgets/            # Specialized widgets
```

## Service Mapping Strategy

### 1. Investigation Service (Port 3001)
**Target Directory:** `src/microservices/investigation/`

#### Core Pages to Migrate:
- `pages/InvestigationPage.tsx` (1,913 lines) → **DECOMPOSE**
- `pages/Investigations.tsx` (734 lines) → **DECOMPOSE**

#### Components to Migrate:
- `AutonomousInvestigationPanel.tsx` (210 lines) → `components/autonomous/`
- `ManualInvestigationPanel.tsx` → `components/manual/`
- `EnhancedAutonomousInvestigationPanel.tsx` → `components/enhanced/`
- `InvestigationForm.tsx` → `components/forms/`
- `InvestigationHeader.tsx` (508 lines) → **DECOMPOSE** → `components/headers/`
- `InvestigationStep.tsx` (239 lines) → `components/steps/`
- `InvestigationSteps.tsx` → `components/steps/`
- `CrossEntityInsightsPanel.tsx` (703 lines) → **DECOMPOSE** → `components/insights/`
- `MultiEntityInvestigationPanel.tsx` (533 lines) → **DECOMPOSE** → `components/multiEntity/`
- `MultiEntityInvestigationStarter.tsx` (431 lines) → **DECOMPOSE** → `components/multiEntity/`
- `MultiEntityResults.tsx` (610 lines) → **DECOMPOSE** → `components/multiEntity/`
- `EntityRelationshipBuilder.tsx` (574 lines) → **DECOMPOSE** → `components/relationships/`
- `EnhancedInvestigationPanel.tsx` (220 lines) → `components/enhanced/`

#### Services to Migrate:
- `services/AutonomousInvestigationClient.ts` (690 lines) → **DECOMPOSE** → `services/`
- `services/MultiEntityInvestigationClient.ts` (480 lines) → **DECOMPOSE** → `services/`

#### Hooks to Migrate:
- `hooks/useAutonomousInvestigation.ts` (1,014 lines) → **DECOMPOSE** → `hooks/`
- `hooks/useMultiEntityInvestigation.ts` (248 lines) → `hooks/`

### 2. RAG Intelligence Service (Port 3003)
**Target Directory:** `src/microservices/ragIntelligence/`

#### Core Pages to Migrate:
- `pages/RAGPage.tsx` (2,273 lines) → **MAJOR DECOMPOSITION**

#### Component Categories:
1. **Analytics Components** → `components/analytics/`
   - `components/rag/analytics/RAGKnowledgeAnalytics.tsx` (333 lines)
   - `components/rag/analytics/RAGDomainCard.tsx`
   - `components/rag/analytics/RAGDomainChartView.tsx`
   - `components/rag/analytics/RAGDomainDetails.tsx`
   - `components/rag/analytics/RAGDomainUtilization.tsx`
   - `components/rag/analytics/RAGSourceEffectiveness.tsx`
   - `components/rag/analytics/SourceCard.tsx`
   - `components/rag/analytics/SourceDetails.tsx`

2. **Feature Components** → `components/features/`
   - `components/rag/features/RAGComparisonDetailed.tsx` (234 lines)
   - `components/rag/features/RAGComparisonOverview.tsx`
   - `components/rag/features/RAGComparisonView.tsx`
   - `components/rag/features/RAGExportControls.tsx`
   - `components/rag/features/RAGHealthAlerts.tsx`
   - `components/rag/features/RAGHealthMetrics.tsx`
   - `components/rag/features/RAGHealthMonitor.tsx`
   - `components/rag/features/RAGHealthSummary.tsx`

3. **Insight Components** → `components/insights/`
   - `components/rag/insights/RAGAnalyticsDashboard.tsx` (206 lines)
   - `components/rag/insights/RAGChartVisualization.tsx`
   - `components/rag/insights/RAGInsightsModal.tsx` (202 lines)
   - `components/rag/insights/RAGOperationalMetrics.tsx`
   - `components/rag/insights/RAGPerformanceCharts.tsx`

4. **Tool Components** → `components/tools/`
   - `components/rag/tools/RAGAlternativeCard.tsx` (247 lines)
   - `components/rag/tools/RAGAlternativeComparison.tsx`
   - `components/rag/tools/RAGToolAlternatives.tsx`
   - `components/rag/tools/RAGToolInsights.tsx`
   - `components/rag/tools/RAGToolPerformance.tsx`

5. **View Components** → `components/views/`
   - `components/rag/views/TableView.tsx` (208 lines)
   - `components/rag/views/TableDataGrid.tsx`
   - `components/rag/views/TableHeader.tsx`
   - `components/rag/views/TablePagination.tsx`

#### Core Components:
- `RAGEnhancedAutonomousInvestigationPanel.tsx` (249 lines) → `components/core/`
- `RAGEnhancedAgentLogSidebar.tsx` → `components/core/`
- `components/rag/RAGKnowledgePanel.tsx` (227 lines) → `components/core/`
- `components/rag/RAGEnhancementSection.tsx` → `components/core/`
- `components/rag/RAGStatusIndicator.tsx` → `components/core/`

#### Services:
- `services/RAGApiService.ts` (451 lines) → **DECOMPOSE** → `services/`

#### Hooks:
- `hooks/useRAGWebSocket.ts` (224 lines) → `hooks/`

### 3. Agent Analytics Service (Port 3002)
**Target Directory:** `src/microservices/agentAnalytics/`

#### Components to Migrate:
- `AgentDetailsTable.tsx` (994 lines) → **MAJOR DECOMPOSITION** → `components/tables/`
- `AgentLogSidebar.tsx` (549 lines) → **DECOMPOSE** → `components/sidebars/`

### 4. Visualization Service (Port 3004)
**Target Directory:** `src/microservices/visualization/`

#### Components to Migrate:
- `LocationMap.tsx` (316 lines) → **DECOMPOSE** → `components/maps/`
- `RiskScoreDisplay.tsx` (359 lines) → **DECOMPOSE** → `components/risk/`
- `OverallRiskScore.tsx` → `components/risk/`

### 5. Core UI Service (Port 3006)
**Target Directory:** `src/microservices/coreUi/`

#### Components to Migrate:
- `Home.tsx` → `components/layouts/`
- `NavigationBar.tsx` → `components/navigation/`
- `AuthGuard.tsx` → `components/auth/`
- `ProgressBar.tsx` → `components/common/`
- `Stopwatch.tsx` → `components/common/`

#### Contexts:
- `contexts/AuthContext.tsx` → `contexts/`
- `contexts/DemoModeContext.tsx` → `contexts/`

### 6. Design System Service (Port 3007)
**Target Directory:** `src/microservices/designSystem/`

#### Components:
- Shared UI components extracted from other services
- Tailwind CSS component library
- Design tokens and theme definitions

### 7. Reporting Service (Port 3005)
**Target Directory:** `src/microservices/reporting/`

#### Components to Extract:
- Export components from RAG features
- PDF generation utilities
- Report formatting components

## Material-UI Dependencies Analysis

### Components Requiring Material-UI Conversion:

1. **High Priority (Core Functionality):**
   - `InvestigationPage.tsx` - Core investigation interface
   - `RAGPage.tsx` - Main RAG interface
   - `Investigations.tsx` - Investigation listing
   - `AgentDetailsTable.tsx` - Agent monitoring

2. **Medium Priority (Enhanced Features):**
   - `MultiEntityInvestigationPanel.tsx`
   - `CrossEntityInsightsPanel.tsx`
   - `EntityRelationshipBuilder.tsx`
   - `EditStepsModal.tsx` (596 lines)

3. **Low Priority (Settings & Tools):**
   - `Settings.tsx` (572 lines)
   - `VerificationSettings.tsx` (369 lines)
   - `ModelSelector.tsx` (336 lines)
   - `ToolsSidebar.tsx` (331 lines)

## Shared Utilities and Reusable Logic

### Utilities to Share Across Services:
- `utils/investigationDataUtils.ts` (640 lines) → **DECOMPOSE** → Shared utilities
- `utils/ragToolUtils.ts` → RAG Intelligence Service
- `utils/investigation.ts` → Investigation Service
- `utils/investigationStepsConfig.ts` → Investigation Service

### Type Definitions to Share:
- `types/RAGTypes.ts` (423 lines) → **DECOMPOSE** → RAG Intelligence Service
- `types/ApiResponses.ts` (381 lines) → **DECOMPOSE** → Shared types
- `types/investigation.ts` → Investigation Service
- `types/multiEntityInvestigation.ts` → Investigation Service
- `types/RiskAssessment.ts` (259 lines) → Visualization Service

### Services to Decompose:
- `services/OlorinService.ts` (1,001 lines) → **MAJOR DECOMPOSITION** → Shared services
- `services/GAIAService.ts` (904 lines) → **MAJOR DECOMPOSITION** → Investigation Service
- `services/ResponseAnalyzer.ts` (351 lines) → Investigation Service
- `services/SettingsService.ts` (290 lines) → Core UI Service

## Component Decomposition Plans

### RAGPage.tsx (2,273 lines) → 25-30 Components

**Proposed Component Breakdown:**
1. `RAGDashboard.tsx` (190 lines) - Main dashboard layout
2. `RAGControlPanel.tsx` (180 lines) - Control interface
3. `RAGMetricsDisplay.tsx` (170 lines) - Metrics visualization
4. `RAGAnalyticsOverview.tsx` (160 lines) - Analytics overview
5. `RAGKnowledgeManagement.tsx` (150 lines) - Knowledge panel
6. `RAGPerformanceMonitor.tsx` (140 lines) - Performance tracking
7. `RAGToolsIntegration.tsx` (130 lines) - Tools integration
8. `RAGComparisonInterface.tsx` (120 lines) - Comparison features
9. `RAGExportManager.tsx` (110 lines) - Export functionality
10. `RAGHealthDashboard.tsx` (100 lines) - Health monitoring
11. **Plus 15-20 smaller specialized components**

### InvestigationPage.tsx (1,913 lines) → 15-20 Components

**Proposed Component Breakdown:**
1. `InvestigationDashboard.tsx` (190 lines) - Main dashboard
2. `InvestigationControls.tsx` (180 lines) - Control panel
3. `InvestigationProgress.tsx` (170 lines) - Progress tracking
4. `InvestigationResults.tsx` (160 lines) - Results display
5. `InvestigationTimeline.tsx` (150 lines) - Timeline view
6. `InvestigationSidebar.tsx` (140 lines) - Sidebar panel
7. `InvestigationDetails.tsx` (130 lines) - Detail view
8. `InvestigationActions.tsx` (120 lines) - Action buttons
9. `InvestigationFilters.tsx` (110 lines) - Filter interface
10. `InvestigationExport.tsx` (100 lines) - Export features
11. **Plus 5-10 smaller utility components**

### AgentDetailsTable.tsx (994 lines) → 8-10 Components

**Proposed Component Breakdown:**
1. `AgentTableContainer.tsx` (150 lines) - Main container
2. `AgentTableHeader.tsx` (120 lines) - Table header
3. `AgentTableBody.tsx` (130 lines) - Table body
4. `AgentTableRow.tsx` (110 lines) - Individual rows
5. `AgentTableActions.tsx` (100 lines) - Action buttons
6. `AgentTableFilters.tsx` (90 lines) - Filter controls
7. `AgentTablePagination.tsx` (80 lines) - Pagination
8. `AgentTableExport.tsx` (70 lines) - Export features
9. `AgentTableSearch.tsx` (60 lines) - Search functionality
10. `AgentTableUtils.tsx` (74 lines) - Utility functions

## Migration Dependencies

### Service Migration Order (Based on Dependencies):
1. **Core UI Service** (Foundation) - No dependencies
2. **Design System Service** - Depends on Core UI
3. **Investigation Service** - Depends on Core UI, Design System
4. **RAG Intelligence Service** - Depends on Core UI, Design System
5. **Agent Analytics Service** - Depends on Core UI, Investigation Service
6. **Visualization Service** - Depends on Core UI, Investigation Service
7. **Reporting Service** - Depends on all other services
8. **Shell Service** - Depends on all services (orchestration)

### Critical Shared Dependencies:
- **Authentication** (Core UI) → Required by all services
- **Event Bus** (Core UI) → Inter-service communication
- **Theme/Styling** (Design System) → Visual consistency
- **WebSocket Management** (Core UI) → Real-time features

## Next Steps

1. ✅ **Component Mapping** - COMPLETED
2. ⏳ **Create detailed migration checklists for each component**
3. ⏳ **Set up testing infrastructure for legacy/new coexistence**
4. ⏳ **Create backup and safety measures**
5. ⏳ **Begin Core UI Service migration**

---

**Status:** Phase 1.1 Complete - Component mapping and analysis documented
**Next:** Create migration checklists and testing infrastructure