# Task 1.7: Refactor useReporting.ts - Implementation Plan

**Date**: 2025-11-03
**Author**: Gil Klainert
**Status**: Planning
**Estimated Effort**: 12 hours

## Executive Summary

Refactor the monolithic `useReporting.ts` file (914 lines, 11 exported hooks) into 5 focused modules (<200 lines each) following the successful pattern established in Task 1.6.

## Current State Analysis

### File Details
- **Location**: `/src/microservices/reporting/hooks/useReporting.ts`
- **Size**: 914 lines
- **Exported Hooks**: 11 hooks for report management
- **Dependencies**: React hooks, reporting types, reportingService

### Hooks Inventory
1. `useReport` (lines 29-169) - Single report management
2. `useReports` (lines 170-306) - Report list management
3. `useReportTemplates` (lines 307-364) - Template management
4. `useReportGeneration` (lines 365-462) - Report generation
5. `useReportAnalytics` (lines 463-498) - Analytics tracking
6. `useReportSharing` (lines 499-584) - Sharing functionality
7. `useReportComments` (lines 585-670) - Comments system
8. `useReportPreview` (lines 671-711) - Preview functionality
9. `useDataSources` (lines 712-789) - Data source management
10. `useReportNotifications` (lines 790-862) - Notification system
11. `useReportUpdates` (lines 863-914) - Real-time updates

## Proposed Module Structure

### Module 1: Core Report Hooks
**File**: `useReportCore.ts` (~180 lines)
**Hooks**:
- `useReport` - Single report CRUD operations
- `useReports` - Report list management with filtering

**Responsibilities**:
- Load, update, delete individual reports
- List reports with pagination and filters
- Report state management (loading, error)
- Basic report operations

### Module 2: Template & Generation Hooks
**File**: `useReportTemplates.ts` (~170 lines)
**Hooks**:
- `useReportTemplates` - Template management
- `useReportGeneration` - Report generation process

**Responsibilities**:
- Template CRUD operations
- Report generation workflow
- Generation status tracking
- Format handling (PDF, CSV, Excel)

### Module 3: Analytics & Sharing Hooks
**File**: `useReportAnalytics.ts` (~160 lines)
**Hooks**:
- `useReportAnalytics` - Analytics tracking
- `useReportSharing` - Sharing functionality

**Responsibilities**:
- Analytics data collection
- Sharing permissions management
- Access control
- Share link generation

### Module 4: Comments & Preview Hooks
**File**: `useReportComments.ts` (~170 lines)
**Hooks**:
- `useReportComments` - Comments system
- `useReportPreview` - Preview functionality

**Responsibilities**:
- Comment CRUD operations
- Preview generation
- Comment threading
- Preview caching

### Module 5: Data & Notifications Hooks
**File**: `useReportData.ts` (~190 lines)
**Hooks**:
- `useDataSources` - Data source management
- `useReportNotifications` - Notification system
- `useReportUpdates` - Real-time updates

**Responsibilities**:
- Data source connections
- Notification preferences
- Real-time report updates
- WebSocket integration

### Module 6: Barrel Export
**File**: `index.ts` (~20 lines)
**Purpose**: Single import point for all hooks

## Implementation Phases

### Phase 1: Module Structure (1 hour)
**Tasks**:
1. Create `/src/microservices/reporting/hooks/modules/` directory
2. Set up module file structure
3. Create placeholder files

**Deliverables**:
- Directory structure created
- 6 empty module files

### Phase 2: Extract Core Report Hooks (2 hours)
**Tasks**:
1. Extract `useReport` hook (lines 29-169)
2. Extract `useReports` hook (lines 170-306)
3. Create `useReportCore.ts` module
4. Add comprehensive JSDoc documentation
5. Validate TypeScript compilation

**Deliverables**:
- `useReportCore.ts` module (~180 lines)
- 2 hooks extracted
- TypeScript compiles successfully

### Phase 3: Extract Template & Generation Hooks (2 hours)
**Tasks**:
1. Extract `useReportTemplates` hook (lines 307-364)
2. Extract `useReportGeneration` hook (lines 365-462)
3. Create `useReportTemplates.ts` module
4. Add comprehensive JSDoc documentation
5. Validate TypeScript compilation

**Deliverables**:
- `useReportTemplates.ts` module (~170 lines)
- 2 hooks extracted
- TypeScript compiles successfully

### Phase 4: Extract Analytics & Sharing Hooks (2 hours)
**Tasks**:
1. Extract `useReportAnalytics` hook (lines 463-498)
2. Extract `useReportSharing` hook (lines 499-584)
3. Create `useReportAnalytics.ts` module
4. Add comprehensive JSDoc documentation
5. Validate TypeScript compilation

**Deliverables**:
- `useReportAnalytics.ts` module (~160 lines)
- 2 hooks extracted
- TypeScript compiles successfully

### Phase 5: Extract Comments & Preview Hooks (2 hours)
**Tasks**:
1. Extract `useReportComments` hook (lines 585-670)
2. Extract `useReportPreview` hook (lines 671-711)
3. Create `useReportComments.ts` module
4. Add comprehensive JSDoc documentation
5. Validate TypeScript compilation

**Deliverables**:
- `useReportComments.ts` module (~170 lines)
- 2 hooks extracted
- TypeScript compiles successfully

### Phase 6: Extract Data & Notifications Hooks (2 hours)
**Tasks**:
1. Extract `useDataSources` hook (lines 712-789)
2. Extract `useReportNotifications` hook (lines 790-862)
3. Extract `useReportUpdates` hook (lines 863-914)
4. Create `useReportData.ts` module
5. Add comprehensive JSDoc documentation
6. Validate TypeScript compilation

**Deliverables**:
- `useReportData.ts` module (~190 lines)
- 3 hooks extracted
- TypeScript compiles successfully

### Phase 7: Create Barrel Export & Testing (1 hour)
**Tasks**:
1. Create `index.ts` barrel export
2. Export all 11 hooks
3. Run TypeScript compilation checks
4. Validate all imports/exports
5. Create integration tests
6. Verify SYSTEM MANDATE compliance

**Deliverables**:
- `index.ts` barrel export (~20 lines)
- All hooks properly exported
- Integration tests created
- Zero TypeScript errors
- Zero SYSTEM MANDATE violations

## Success Criteria

### File Size Compliance
- [ ] useReportCore.ts < 200 lines
- [ ] useReportTemplates.ts < 200 lines
- [ ] useReportAnalytics.ts < 200 lines
- [ ] useReportComments.ts < 200 lines
- [ ] useReportData.ts < 200 lines
- [ ] index.ts < 200 lines

### SYSTEM MANDATE Compliance
- [ ] Zero TODO/FIXME violations
- [ ] No hardcoded values
- [ ] Complete implementations
- [ ] Comprehensive documentation

### Quality Standards
- [ ] All modules compile without TypeScript errors
- [ ] All 11 hooks preserved and exported
- [ ] Integration tests pass
- [ ] Backward compatibility maintained

## Risk Assessment

### Low Risk Factors
- Clear hook boundaries (each hook is independent)
- No complex interdependencies
- React hooks are naturally modular
- Established pattern from Task 1.6

### Mitigation Strategies
- Extract one hook at a time
- Test after each extraction
- Maintain existing hook signatures
- Preserve all hook functionality

## Dependencies

### Required Imports
- React hooks (useState, useEffect, useCallback, etc.)
- Reporting types from `../types/reporting`
- reportingService from `../services/reportingService`

### Export Requirements
- All 11 hooks must be exported
- Barrel export for convenient importing
- Type exports if needed

## Timeline

| Phase | Duration | Cumulative |
|-------|----------|------------|
| 1. Module Structure | 1h | 1h |
| 2. Core Report Hooks | 2h | 3h |
| 3. Template & Generation | 2h | 5h |
| 4. Analytics & Sharing | 2h | 7h |
| 5. Comments & Preview | 2h | 9h |
| 6. Data & Notifications | 2h | 11h |
| 7. Export & Testing | 1h | 12h |
| **Total** | **12h** | **12h** |

## Expected Outcomes

### Before Refactoring
- 1 file: 914 lines
- 11 hooks in single file
- Difficult to maintain and test

### After Refactoring
- 6 files: ~890 lines total (avg 148 lines/module)
- 11 hooks across 5 focused modules
- Clean separation of concerns
- Easy to maintain and extend

## Conclusion

This refactoring follows the proven pattern from Task 1.6, applying modular architecture principles to React hooks. The natural boundaries between hooks make this refactoring straightforward with minimal risk.

**Status**: Ready to begin Phase 1
**Confidence**: High - clear structure and proven pattern
**Risk Level**: Low - independent hooks with no complex dependencies
