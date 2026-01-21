# Component Migration Checklists

**Document Version:** 1.0
**Date:** 2025-01-18
**Author:** Gil Klainert
**Status:** 🔄 IN PROGRESS

## Migration Checklist Template

### Pre-Migration Assessment
- [ ] **File Size Check**: Verify if file needs decomposition (>200 lines)
- [ ] **Material-UI Analysis**: Identify all MUI components used
- [ ] **Dependency Analysis**: Map component dependencies and imports
- [ ] **Test Coverage**: Document existing test coverage
- [ ] **State Management**: Identify state management patterns
- [ ] **External Dependencies**: List external service calls
- [ ] **Props Interface**: Document component props and types

### Migration Execution
- [ ] **Create Target Service Directory**: Set up microservice structure
- [ ] **Component Decomposition**: Break into smaller components if needed
- [ ] **Material-UI Conversion**: Convert to Tailwind CSS + Headless UI
- [ ] **Event Bus Integration**: Implement inter-service communication
- [ ] **State Migration**: Convert state management to new patterns
- [ ] **Type Safety**: Ensure TypeScript compliance
- [ ] **Import Cleanup**: Update all import statements

### Testing & Validation
- [ ] **Unit Tests**: Create/migrate component tests
- [ ] **Integration Tests**: Test service integration
- [ ] **Visual Regression**: Compare UI before/after
- [ ] **Functionality Test**: Verify all features work
- [ ] **Performance Test**: Ensure no performance regression
- [ ] **Accessibility Test**: Maintain accessibility standards

### Post-Migration
- [ ] **Documentation Update**: Update component documentation
- [ ] **Code Review**: Peer review completed migration
- [ ] **Performance Monitoring**: Set up performance tracking
- [ ] **Feature Flag**: Implement feature toggle for rollback

## Service-Specific Migration Checklists

## 1. Core UI Service Migration Checklist

### 1.1 AuthGuard.tsx
**Priority:** CRITICAL
**Current Location:** `src/js/components/AuthGuard.tsx`
**Target Location:** `src/microservices/coreUi/components/auth/AuthGuard.tsx`
**Material-UI Dependencies:** Yes

#### Pre-Migration Assessment
- [ ] **File Size**: 150 lines (under limit) ✅
- [ ] **Material-UI Components**: CircularProgress, Box, Typography
- [ ] **Dependencies**: AuthContext, react-router-dom
- [ ] **Test Coverage**: Check existing tests
- [ ] **Authentication Logic**: JWT token validation
- [ ] **Route Protection**: Protected route implementation

#### Migration Tasks
- [ ] Create `src/microservices/coreUi/components/auth/` directory
- [ ] Convert Material-UI components:
  - [ ] `CircularProgress` → Custom Tailwind spinner
  - [ ] `Box` → `<div>` with Tailwind classes
  - [ ] `Typography` → Tailwind typography classes
- [ ] Migrate AuthContext dependency
- [ ] Implement event bus for auth state changes
- [ ] Update TypeScript interfaces
- [ ] Create component tests

#### Success Criteria
- [ ] Authentication flows work correctly
- [ ] Route protection functional
- [ ] No Material-UI imports
- [ ] Event bus integration working
- [ ] Tests pass with 100% coverage

### 1.2 NavigationBar.tsx
**Priority:** HIGH
**Current Location:** `src/js/components/NavigationBar.tsx`
**Target Location:** `src/microservices/coreUi/components/navigation/NavigationBar.tsx`

#### Pre-Migration Assessment
- [ ] **File Size**: ~150 lines (estimated)
- [ ] **Material-UI Components**: AppBar, Toolbar, Button, Menu
- [ ] **Dependencies**: React Router, Authentication
- [ ] **Features**: Navigation links, user menu, logout

#### Migration Tasks
- [ ] Convert Material-UI navigation:
  - [ ] `AppBar` → Tailwind header with `bg-blue-600`
  - [ ] `Toolbar` → Flexbox container with Tailwind
  - [ ] `Button` → Headless UI Button component
  - [ ] `Menu` → Headless UI Menu component
- [ ] Implement responsive navigation
- [ ] Add microservice navigation links
- [ ] Integrate with authentication state

### 1.3 Home.tsx
**Priority:** MEDIUM
**Current Location:** `src/js/components/Home.tsx`
**Target Location:** `src/microservices/coreUi/components/layouts/Home.tsx`

#### Pre-Migration Assessment
- [ ] **File Size**: ~200 lines (at limit)
- [ ] **Material-UI Components**: Container, Grid, Card, Typography
- [ ] **Features**: Dashboard layout, service cards

#### Migration Tasks
- [ ] Convert Material-UI layout:
  - [ ] `Container` → Tailwind container classes
  - [ ] `Grid` → Tailwind grid system
  - [ ] `Card` → Custom card component with Tailwind
  - [ ] `Typography` → Tailwind typography
- [ ] Create service navigation cards
- [ ] Implement responsive grid layout

## 2. Investigation Service Migration Checklist

### 2.1 InvestigationPage.tsx (MAJOR DECOMPOSITION)
**Priority:** CRITICAL
**Current Location:** `src/js/pages/InvestigationPage.tsx`
**File Size:** 1,913 lines → DECOMPOSE into 15-20 components
**Target Location:** `src/microservices/investigation/`

#### Decomposition Plan
1. **InvestigationDashboard.tsx** (190 lines)
   - [ ] Main layout and container
   - [ ] Dashboard state management
   - [ ] Service orchestration

2. **InvestigationControls.tsx** (180 lines)
   - [ ] Control panel interface
   - [ ] Action buttons and forms
   - [ ] Settings and configuration

3. **InvestigationProgress.tsx** (170 lines)
   - [ ] Progress tracking display
   - [ ] Status indicators
   - [ ] Timeline visualization

4. **InvestigationResults.tsx** (160 lines)
   - [ ] Results display and formatting
   - [ ] Data visualization components
   - [ ] Export functionality

5. **InvestigationSidebar.tsx** (140 lines)
   - [ ] Sidebar navigation
   - [ ] Quick actions panel
   - [ ] Information display

#### Pre-Migration Assessment
- [ ] **Material-UI Components**: Massive usage - Grid, Paper, Typography, Button, etc.
- [ ] **State Management**: Complex state with useReducer patterns
- [ ] **External Services**: Multiple API integrations
- [ ] **WebSocket Integration**: Real-time updates
- [ ] **Test Coverage**: Identify existing tests

#### Migration Strategy
- [ ] **Phase 1**: Extract main dashboard layout
- [ ] **Phase 2**: Decompose control components
- [ ] **Phase 3**: Migrate progress tracking
- [ ] **Phase 4**: Move results display
- [ ] **Phase 5**: Convert sidebar components

### 2.2 Investigations.tsx
**Priority:** HIGH
**Current Location:** `src/js/pages/Investigations.tsx`
**File Size:** 734 lines → DECOMPOSE into 8-10 components
**Target Location:** `src/microservices/investigation/components/listing/`

#### Decomposition Plan
1. **InvestigationsList.tsx** (150 lines) - Main listing
2. **InvestigationsFilters.tsx** (120 lines) - Filter controls
3. **InvestigationsSearch.tsx** (100 lines) - Search interface
4. **InvestigationCard.tsx** (90 lines) - Individual cards
5. **InvestigationsPagination.tsx** (80 lines) - Pagination
6. **InvestigationsActions.tsx** (70 lines) - Bulk actions
7. **InvestigationsHeader.tsx** (60 lines) - Page header
8. **InvestigationsEmpty.tsx** (64 lines) - Empty state

## 3. RAG Intelligence Service Migration Checklist

### 3.1 RAGPage.tsx (MAJOR DECOMPOSITION)
**Priority:** CRITICAL
**Current Location:** `src/js/pages/RAGPage.tsx`
**File Size:** 2,273 lines → DECOMPOSE into 25-30 components
**Target Location:** `src/microservices/ragIntelligence/`

#### Decomposition Strategy
**Phase 1: Core Dashboard (500 lines)**
1. **RAGDashboard.tsx** (190 lines) - Main layout
2. **RAGControlPanel.tsx** (180 lines) - Control interface
3. **RAGMetricsDisplay.tsx** (130 lines) - Metrics overview

**Phase 2: Analytics Components (600 lines)**
4. **RAGAnalyticsOverview.tsx** (160 lines) - Analytics dashboard
5. **RAGKnowledgeAnalytics.tsx** (150 lines) - Knowledge metrics
6. **RAGPerformanceAnalytics.tsx** (140 lines) - Performance data
7. **RAGSourceAnalytics.tsx** (150 lines) - Source analysis

**Phase 3: Tool Integration (500 lines)**
8. **RAGToolsManager.tsx** (130 lines) - Tools integration
9. **RAGAlternativeTools.tsx** (120 lines) - Alternative tools
10. **RAGToolInsights.tsx** (125 lines) - Tool insights
11. **RAGToolPerformance.tsx** (125 lines) - Tool performance

**Phase 4: Advanced Features (673 lines)**
12. **RAGComparisonInterface.tsx** (120 lines) - Comparison tools
13. **RAGExportManager.tsx** (110 lines) - Export functionality
14. **RAGHealthMonitor.tsx** (100 lines) - Health monitoring
15. **RAGJourneyViewer.tsx** (90 lines) - Journey visualization
16. **Plus 10-15 smaller components** (253 lines total)

#### Migration Priorities
1. **CRITICAL**: Core dashboard and control panel
2. **HIGH**: Analytics and metrics components
3. **MEDIUM**: Tool integration components
4. **LOW**: Advanced features and utilities

### 3.2 RAG Component Categories Migration

#### Analytics Components
- [ ] **RAGKnowledgeAnalytics.tsx** (333 lines) → DECOMPOSE
  - [ ] Split into: Knowledge metrics, domain analysis, utilization tracking
- [ ] **RAGDomainCard.tsx** → Direct migration
- [ ] **RAGSourceEffectiveness.tsx** → Direct migration

#### Feature Components
- [ ] **RAGComparisonDetailed.tsx** (234 lines) → Direct migration with MUI conversion
- [ ] **RAGExportControls.tsx** → Direct migration
- [ ] **RAGHealthMonitor.tsx** → Direct migration

## 4. Agent Analytics Service Migration Checklist

### 4.1 AgentDetailsTable.tsx (MAJOR DECOMPOSITION)
**Priority:** HIGH
**Current Location:** `src/js/components/AgentDetailsTable.tsx`
**File Size:** 994 lines → DECOMPOSE into 8-10 components
**Target Location:** `src/microservices/agentAnalytics/components/tables/`

#### Decomposition Plan
1. **AgentTableContainer.tsx** (150 lines)
   - [ ] Main table container and layout
   - [ ] State management for table data
   - [ ] Event handlers coordination

2. **AgentTableHeader.tsx** (120 lines)
   - [ ] Table header with sorting
   - [ ] Column configuration
   - [ ] Header actions

3. **AgentTableBody.tsx** (130 lines)
   - [ ] Table body rendering
   - [ ] Row rendering logic
   - [ ] Data formatting

4. **AgentTableRow.tsx** (110 lines)
   - [ ] Individual row component
   - [ ] Row actions and interactions
   - [ ] Cell rendering

5. **AgentTableActions.tsx** (100 lines)
   - [ ] Action buttons and menus
   - [ ] Bulk actions
   - [ ] Context menus

6. **AgentTableFilters.tsx** (90 lines)
   - [ ] Filter controls
   - [ ] Advanced filtering
   - [ ] Filter state management

7. **AgentTablePagination.tsx** (80 lines)
   - [ ] Pagination controls
   - [ ] Page size selection
   - [ ] Navigation

8. **AgentTableExport.tsx** (70 lines)
   - [ ] Export functionality
   - [ ] Format selection
   - [ ] Download handling

9. **AgentTableSearch.tsx** (60 lines)
   - [ ] Search interface
   - [ ] Real-time search
   - [ ] Search suggestions

10. **AgentTableUtils.tsx** (74 lines)
    - [ ] Utility functions
    - [ ] Data transformation
    - [ ] Helper methods

## 5. Visualization Service Migration Checklist

### 5.1 LocationMap.tsx
**Priority:** MEDIUM
**Current Location:** `src/js/components/LocationMap.tsx`
**File Size:** 316 lines → DECOMPOSE into 4-5 components
**Target Location:** `src/microservices/visualization/components/maps/`

#### Decomposition Plan
1. **MapContainer.tsx** (80 lines) - Main map container
2. **MapControls.tsx** (70 lines) - Map controls and layers
3. **MapMarkers.tsx** (60 lines) - Marker management
4. **MapUtils.tsx** (50 lines) - Utility functions
5. **MapLegend.tsx** (56 lines) - Map legend and info

### 5.2 RiskScoreDisplay.tsx
**Priority:** MEDIUM
**Current Location:** `src/js/components/RiskScoreDisplay.tsx`
**File Size:** 359 lines → DECOMPOSE into 5-6 components
**Target Location:** `src/microservices/visualization/components/risk/`

#### Decomposition Plan
1. **RiskScoreContainer.tsx** (80 lines) - Main container
2. **RiskScoreGauge.tsx** (70 lines) - Gauge visualization
3. **RiskScoreBreakdown.tsx** (60 lines) - Score breakdown
4. **RiskScoreHistory.tsx** (60 lines) - Historical data
5. **RiskScoreActions.tsx** (50 lines) - Actions and controls
6. **RiskScoreUtils.tsx** (39 lines) - Utility functions

## Common Migration Patterns

### Material-UI to Tailwind Conversion Guide

#### Layout Components
```tsx
// Before (Material-UI)
<Container maxWidth="lg">
  <Grid container spacing={3}>
    <Grid item xs={12} md={6}>
      <Paper elevation={2}>
        <Typography variant="h4">Title</Typography>
      </Paper>
    </Grid>
  </Grid>
</Container>

// After (Tailwind CSS)
<div className="container mx-auto max-w-7xl">
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
    <div className="bg-white rounded-lg shadow-md p-6">
      <h1 className="text-2xl font-bold text-gray-900">Title</h1>
    </div>
  </div>
</div>
```

#### Form Components
```tsx
// Before (Material-UI)
<TextField
  variant="outlined"
  fullWidth
  label="Search"
  value={searchTerm}
  onChange={handleChange}
/>

// After (Headless UI + Tailwind)
<div className="w-full">
  <label className="block text-sm font-medium text-gray-700 mb-2">
    Search
  </label>
  <input
    type="text"
    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
    value={searchTerm}
    onChange={handleChange}
  />
</div>
```

#### Button Components
```tsx
// Before (Material-UI)
<Button
  variant="contained"
  color="primary"
  size="large"
  onClick={handleClick}
>
  Submit
</Button>

// After (Headless UI + Tailwind)
<button
  className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
  onClick={handleClick}
>
  Submit
</button>
```

## Testing Strategy for Each Migration

### Unit Testing Checklist
- [ ] **Component Rendering**: Test component renders without errors
- [ ] **Props Validation**: Test all prop combinations
- [ ] **Event Handling**: Test user interactions
- [ ] **State Management**: Test state changes
- [ ] **Error Boundaries**: Test error handling
- [ ] **Accessibility**: Test keyboard navigation and screen readers

### Integration Testing Checklist
- [ ] **Service Communication**: Test event bus integration
- [ ] **API Integration**: Test external service calls
- [ ] **WebSocket Connection**: Test real-time features
- [ ] **Navigation**: Test routing between services
- [ ] **State Persistence**: Test data persistence

### Visual Regression Testing Checklist
- [ ] **Screenshot Comparison**: Before/after visual comparison
- [ ] **Responsive Design**: Test multiple screen sizes
- [ ] **Theme Consistency**: Verify design system compliance
- [ ] **Animation Testing**: Test transitions and animations
- [ ] **Print Styles**: Test print layouts

## Migration Quality Gates

### Code Quality Checklist
- [ ] **TypeScript Compliance**: No TypeScript errors
- [ ] **ESLint Compliance**: All linting rules pass
- [ ] **File Size Compliance**: All files under 200 lines
- [ ] **Import Optimization**: Clean import statements
- [ ] **Performance Optimization**: No performance regressions

### Documentation Checklist
- [ ] **Component Documentation**: JSDoc comments
- [ ] **Props Documentation**: Interface documentation
- [ ] **Usage Examples**: Code examples provided
- [ ] **Migration Notes**: Document any breaking changes
- [ ] **Performance Notes**: Document performance considerations

---

**Status:** Phase 1.4 Complete - Component migration checklists created
**Next:** Set up testing infrastructure and automated dependency detection