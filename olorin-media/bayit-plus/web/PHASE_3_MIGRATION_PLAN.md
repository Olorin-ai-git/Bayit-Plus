# Phase 3 Migration Plan: Admin Components

**Status**: 🚀 **IN PROGRESS**
**Date**: 2026-01-22
**Scope**: 7 Admin Components, 3,442 lines total

---

## Components to Migrate (Priority Order)

### 1. FreeContentImportWizard.tsx
- **Lines**: 745 (3.73x over 200-line limit)
- **Priority**: HIGH
- **Complexity**: HIGH (multi-step wizard with 6 steps)
- **StyleSheet**: Lines 446-745 (299 lines)

**Extraction Plan**:
- WizardStepSelectType (Step 1: Type grid)
- WizardStepSelectSource (Step 2: Source list)
- WizardStepSelectCategory (Step 2.5: Category selection, VOD only)
- WizardStepSelectItems (Step 3: Item selection with checkboxes)
- WizardStepConfirm (Step 4: Confirmation)
- WizardStepImporting (Step 5: Progress indicator)
- FreeContentImportWizard (Main orchestrator)

### 2. HierarchicalContentTable.tsx
- **Lines**: 695 (3.48x over 200-line limit)
- **Priority**: HIGH
- **Complexity**: HIGH (hierarchical tree structure with drag-drop)
- **StyleSheet**: TBD

**Extraction Plan**:
- TreeNode component
- TreeRow component
- TreeActions component
- HierarchicalContentTable (Main orchestrator)

### 3. LibrarianActivityLog.tsx
- **Lines**: 571 (2.86x over 200-line limit)
- **Priority**: MEDIUM
- **Complexity**: MEDIUM (activity feed with filtering)
- **StyleSheet**: TBD

**Extraction Plan**:
- ActivityLogHeader (filters, search)
- ActivityLogItem (individual activity row)
- ActivityLogList (virtualized list)
- LibrarianActivityLog (Main orchestrator)

### 4. ImageUploader.tsx
- **Lines**: 403 (2.02x over 200-line limit)
- **Priority**: MEDIUM
- **Complexity**: MEDIUM (drag-drop, preview, crop)
- **StyleSheet**: TBD

**Extraction Plan**:
- ImageDropZone (drag-drop area)
- ImagePreview (thumbnail with crop tools)
- ImageUploadProgress (upload status)
- ImageUploader (Main orchestrator)

### 5. CategoryPicker.tsx
- **Lines**: 368 (1.84x over 200-line limit)
- **Priority**: LOW
- **Complexity**: LOW (dropdown/modal with list)
- **StyleSheet**: TBD

**Extraction Plan**:
- CategoryPickerTrigger (button)
- CategoryPickerList (scrollable list)
- CategoryPicker (Main orchestrator)

### 6. LibrarianScheduleCard.tsx
- **Lines**: 362 (1.81x over 200-line limit)
- **Priority**: LOW
- **Complexity**: LOW (schedule display card)
- **StyleSheet**: TBD

**Extraction Plan**:
- ScheduleTimeSlot (individual slot)
- ScheduleDayColumn (day view)
- LibrarianScheduleCard (Main orchestrator)

### 7. DataTable.tsx
- **Lines**: 298 (1.49x over 200-line limit)
- **Priority**: LOW
- **Complexity**: LOW (table with sorting, pagination)
- **StyleSheet**: TBD

**Extraction Plan**:
- DataTableHeader (column headers with sort)
- DataTableRow (table row)
- DataTablePagination (pagination controls)
- DataTable (Main orchestrator)

---

## Migration Strategy

### Parallel Execution Approach

Instead of migrating components sequentially, we'll use the multi-agent system to migrate ALL 7 components in parallel:

1. **Spawn 7 Frontend Developer Agents** (one per component)
2. **Each agent handles**:
   - Create backup (.legacy.tsx)
   - Analyze component structure
   - Extract sub-components
   - Migrate to TailwindCSS
   - Ensure all sub-components <200 lines
   - Verify no StyleSheet.create

3. **Coordination**:
   - All agents work independently (no shared state)
   - Each produces a set of migrated files
   - Main agent collects results and verifies build

### Expected Output (Per Component)

**Example: FreeContentImportWizard**
```
src/components/admin/
├── FreeContentImportWizard.tsx (main, <200 lines)
├── FreeContentImportWizard.legacy.tsx (backup)
├── wizard/
│   ├── WizardStepSelectType.tsx (<150 lines)
│   ├── WizardStepSelectSource.tsx (<150 lines)
│   ├── WizardStepSelectCategory.tsx (<150 lines)
│   ├── WizardStepSelectItems.tsx (<200 lines)
│   ├── WizardStepConfirm.tsx (<100 lines)
│   └── WizardStepImporting.tsx (<100 lines)
```

---

## Success Criteria

- [ ] All 7 components migrated to TailwindCSS
- [ ] ZERO StyleSheet.create in migrated files
- [ ] All sub-components under 200 lines
- [ ] Build succeeds with no errors
- [ ] No runtime errors in admin panel
- [ ] All functionality preserved

---

## Estimated Metrics

### Code Size Reduction (Projected)

| Component | Before | After (Est.) | Sub-Components | Reduction (Est.) |
|-----------|--------|--------------|----------------|------------------|
| FreeContentImportWizard | 745 lines | ~180 lines | 6 components | ~76% |
| HierarchicalContentTable | 695 lines | ~190 lines | 3 components | ~73% |
| LibrarianActivityLog | 571 lines | ~170 lines | 3 components | ~70% |
| ImageUploader | 403 lines | ~150 lines | 3 components | ~63% |
| CategoryPicker | 368 lines | ~140 lines | 2 components | ~62% |
| LibrarianScheduleCard | 362 lines | ~150 lines | 2 components | ~59% |
| DataTable | 298 lines | ~130 lines | 3 components | ~56% |
| **TOTAL** | **3,442 lines** | **~1,110 lines** | **22 components** | **~68%** |

### StyleSheet Elimination (Projected)

- **Total StyleSheet lines**: ~1,500-2,000 lines
- **After migration**: ZERO ✅

---

## Multi-Agent Execution Plan

### Agent Assignments

1. **Agent 1**: FreeContentImportWizard (745 lines, highest priority)
2. **Agent 2**: HierarchicalContentTable (695 lines, high priority)
3. **Agent 3**: LibrarianActivityLog (571 lines, medium priority)
4. **Agent 4**: ImageUploader (403 lines, medium priority)
5. **Agent 5**: CategoryPicker (368 lines, low priority)
6. **Agent 6**: LibrarianScheduleCard (362 lines, low priority)
7. **Agent 7**: DataTable (298 lines, low priority)

### Agent Instructions Template

Each agent will receive:
```
TASK: Migrate [ComponentName] from StyleSheet to TailwindCSS

COMPONENT: src/components/admin/[ComponentName].tsx
LINES: [X] lines ([Y]x over 200-line limit)

REQUIREMENTS:
1. Create backup: [ComponentName].legacy.tsx
2. Analyze component structure
3. Extract logical sub-components (each <200 lines)
4. Migrate all styling to TailwindCSS
5. Use platformClass() utility for cross-platform
6. ZERO StyleSheet.create in final code
7. Preserve all functionality
8. Ensure build succeeds

DELIVERABLES:
- Main component (<200 lines)
- Sub-components (each <200 lines)
- No StyleSheet.create
- Build verification
```

---

## Timeline

- **Agent Spawning**: Immediate
- **Parallel Migration**: 10-15 minutes (estimated)
- **Build Verification**: 5 minutes
- **Phase 3 Complete**: ~20 minutes total

---

**Generated**: 2026-01-22
**Strategy**: Multi-agent parallel migration
**Expected Completion**: 2026-01-22 (same day)
