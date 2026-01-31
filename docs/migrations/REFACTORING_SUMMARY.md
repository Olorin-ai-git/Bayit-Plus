# Codebase Refactoring Analysis - January 13, 2026

## Executive Summary

Scanned the entire codebase and identified **40+ files over 500 lines** that could benefit from refactoring. The top 5 critical files total **7,633 lines** and should be prioritized.

## Critical Files Requiring Refactoring

### 🔴 Top Priority (>1200 lines)

| File | Lines | Type | Complexity |
|------|-------|------|------------|
| `backend/app/services/ai_agent_service.py` | 2,297 | Service | Very High |
| `backend/app/api/routes/chat.py` | 1,448 | API Routes | High |
| `web/src/components/chat/Chatbot.tsx` | 1,326 | Component | High |
| `web/src/components/player/VideoPlayer.tsx` | 1,295 | Component | High |
| `web/src/pages/admin/LibrarianAgentPage.tsx` | 1,267 | Page | High |

**Total**: 7,633 lines across 5 files

### 🟡 High Priority (1000-1200 lines)

| File | Lines | Type |
|------|-------|------|
| `shared/screens/admin/UserDetailScreen.tsx` | 1,244 | Screen |
| `tv-app/src/screens/admin/UserDetailScreen.tsx` | 1,246 | Screen |
| `shared/data/demoData.ts` | 1,163 | Data |
| `tv-app/src/data/demoData.ts` | 1,124 | Data |
| `web/src/pages/ProfilePage.tsx` | 1,061 | Page |
| `shared/screens/ProfileScreen.tsx` | 1,049 | Screen |
| `tv-app/src/screens/ProfileScreen.tsx` | 1,051 | Screen |
| `shared/screens/FlowsScreen.tsx` | 1,051 | Screen |

**Total**: ~9,000 lines across 8 files

### 🟢 Medium Priority (700-1000 lines)

- `web/src/pages/WatchPage.tsx` (964 lines)
- `web/src/components/settings/VoiceSettings.tsx` (943 lines)
- `shared/screens/admin/TransactionsScreen.tsx` (853 lines)
- `shared/screens/admin/UsersListScreen.tsx` (851 lines)
- `web/src/pages/SeriesDetailPage.tsx` (831 lines)
- `shared/services/demoService.ts` (811 lines)
- `backend/app/api/routes/content.py` (783 lines)
- `web/src/components/layout/Footer.tsx` (787 lines)

## Detailed Refactoring Strategies

### 1. AI Agent Service (2,297 lines) → Modular Architecture

**Current Structure**:
- Single monolithic file
- 19+ tool executor functions
- Mixed concerns (tools, executors, orchestration)

**Proposed Structure**:
```
backend/app/services/ai_agent/
├── __init__.py                   # Public API
├── logger.py                     # Database logging (✓ Created)
├── tools.py                      # Tool definitions for Claude
├── executor.py                   # Main executor orchestrator
└── executors/
    ├── __init__.py
    ├── content.py                # list_content_items, get_content_details
    ├── metadata.py               # fix_missing_poster, fix_missing_metadata
    ├── stream.py                 # check_stream_url
    ├── storage.py                # check_storage_usage, list_large_files
    ├── subtitles.py              # scan_video_subtitles, extract_subtitles
    └── notifications.py          # send_email_notification
```

**Benefits**:
- Each module <300 lines
- Easy to test individual tools
- Clear separation of concerns
- Easy to add new tools

**Estimated Effort**: 8-12 hours

---

### 2. Chat Routes (1,448 lines) → Feature-Based Modules

**Current Structure**:
- Single route file
- Multiple endpoints mixed together

**Proposed Structure**:
```
backend/app/api/routes/chat/
├── __init__.py                   # Route registration
├── streaming.py                  # POST /chat/stream
├── history.py                    # GET /chat/history
├── contexts.py                   # Context management endpoints
└── handlers.py                   # Shared message handlers
```

**Benefits**:
- Logical grouping by feature
- Easier to maintain individual features
- Better code organization

**Estimated Effort**: 4-6 hours

---

### 3. Chatbot Component (1,326 lines) → Component Composition

**Current Structure**:
- Massive single component
- Complex state management
- All UI in one file

**Proposed Structure**:
```
web/src/components/chat/
├── Chatbot.tsx                   # Main container (~200 lines)
├── ChatbotHeader.tsx             # Header with controls
├── ChatbotMessages.tsx           # Message list
├── ChatbotInput.tsx              # Input field
├── ChatbotSuggestions.tsx        # Suggested queries
├── ChatbotSettings.tsx           # Settings panel
├── hooks/
│   ├── useChatState.ts           # State management
│   ├── useChatMessages.ts        # Message handling
│   ├── useChatStreaming.ts       # Streaming logic
│   └── useVoiceChat.ts           # Voice integration
└── types.ts                      # Shared types
```

**Benefits**:
- Reusable sub-components
- Testable custom hooks
- Clear separation of UI and logic
- Better performance (smaller re-renders)

**Estimated Effort**: 6-8 hours

---

### 4. Video Player (1,295 lines) → Modular Player

**Current Structure**:
- All player logic in one component
- Complex controls embedded

**Proposed Structure**:
```
web/src/components/player/
├── VideoPlayer.tsx               # Main container (~300 lines)
├── VideoPlayerControls.tsx       # Control bar
├── VideoPlayerProgress.tsx       # Progress bar/scrubbing
├── VideoPlayerSettings.tsx       # Settings panel
├── VideoPlayerChapters.tsx       # Chapter navigation
├── SubtitleControls.tsx          # ✓ Already separate
├── LiveSubtitleControls.tsx      # ✓ Already separate
├── hooks/
│   ├── useVideoState.ts          # Video state
│   ├── useVideoControls.ts       # Playback controls
│   ├── useVideoProgress.ts       # Progress tracking
│   └── useVideoSettings.ts       # Settings state
└── types.ts                      # Player types
```

**Benefits**:
- Modular controls
- Easier to customize
- Better testability
- Cleaner code

**Estimated Effort**: 6-8 hours

---

### 5. Librarian Agent Page (1,267 lines) → Tab-Based Components

**Current Structure**:
- Single large admin page
- Multiple tabs in one file

**Proposed Structure**:
```
web/src/pages/admin/librarian/
├── LibrarianAgentPage.tsx        # Main container (~200 lines)
├── AuditHistoryTab.tsx           # Audit history view
├── AuditDetailView.tsx           # Individual audit details
├── AuditExecutionLogs.tsx        # Live log streaming
├── AuditActionsTable.tsx         # Actions taken table
├── AuditStatistics.tsx           # Stats and metrics
├── StartAuditDialog.tsx          # Start audit modal
└── hooks/
    ├── useAuditData.ts           # Audit data fetching
    ├── useAuditPolling.ts        # Live updates
    └── useAuditActions.ts        # Audit actions
```

**Benefits**:
- Each tab is independent
- Easier to maintain
- Better code reuse
- Cleaner imports

**Estimated Effort**: 5-7 hours

---

## Refactoring Guidelines

### 1. File Size Targets
- ✅ **Functions**: <50 lines
- ✅ **Components**: <300 lines
- ✅ **Modules**: <500 lines
- ❌ **Files >1000 lines**: Should be split

### 2. Component Composition
::: v-pre
```typescript
// ❌ BAD: Everything in one component
function MassiveComponent() {
  // 1000+ lines of code
}

// ✅ GOOD: Composed from smaller components
function MainComponent() {
  return (
    <>
      <Header />
      <Content />
      <Footer />
    </>
  )
}
```
:::

### 3. Custom Hooks for Logic
::: v-pre
```typescript
// ❌ BAD: Logic mixed with UI
function Component() {
  const [state, setState] = useState()
  // 100+ lines of logic
  return <div>...</div>
}

// ✅ GOOD: Logic extracted to hook
function Component() {
  const { state, actions } = useComponentLogic()
  return <div>...</div>
}
```
:::

### 4. Module Organization
```python
# ❌ BAD: Everything in one file
# my_service.py (2000+ lines)

# ✅ GOOD: Organized in modules
# my_service/
#   __init__.py
#   core.py
#   helpers.py
#   validators.py
```

## Implementation Roadmap

### Phase 1: Backend Services (Week 1)
- [ ] Refactor `ai_agent_service.py` → `ai_agent/` module
- [ ] Refactor `chat.py` → `chat/` routes module
- [ ] Test all endpoints
- [ ] Update imports across codebase

### Phase 2: Frontend Components (Week 2)
- [ ] Refactor `Chatbot.tsx` → modular components
- [ ] Refactor `VideoPlayer.tsx` → modular player
- [ ] Test UI functionality
- [ ] Update component imports

### Phase 3: Admin Pages (Week 3)
- [ ] Refactor `LibrarianAgentPage.tsx`
- [ ] Refactor `UserDetailScreen.tsx`
- [ ] Refactor `ProfilePage.tsx`
- [ ] Test admin workflows

### Phase 4: Shared Code (Week 4)
- [ ] Refactor `demoData.ts` → split by content type
- [ ] Refactor shared screens
- [ ] Clean up duplicated code
- [ ] Update documentation

## Testing Strategy

### For Each Refactoring:

1. **Before Refactoring**:
   ```bash
   # Run existing tests
   poetry run pytest  # Backend
   npm test          # Frontend
   ```

2. **During Refactoring**:
   - Keep same public API
   - No functional changes
   - Only reorganize code

3. **After Refactoring**:
   ```bash
   # Verify tests still pass
   poetry run pytest
   npm test
   
   # Manual testing
   # - Test affected features
   # - Check for regressions
   ```

## Estimated Total Effort

| Phase | Files | Estimated Hours |
|-------|-------|-----------------|
| Phase 1 | 2 backend files | 12-18 hours |
| Phase 2 | 2 frontend components | 12-16 hours |
| Phase 3 | 3 admin pages | 15-20 hours |
| Phase 4 | Shared code | 8-12 hours |
| **Total** | **10+ files** | **47-66 hours** |

**Recommendation**: Spread over 4 weeks, ~12-16 hours per week

## Quick Wins (Can Do Now)

### 1. Extract Custom Hooks (2-3 hours each)
```typescript
// From Chatbot.tsx
export function useChatMessages() { /* ... */ }
export function useChatStreaming() { /* ... */ }
export function useVoiceChat() { /* ... */ }
```

### 2. Split Tool Executors (1-2 hours each)
```python
# From ai_agent_service.py
# ai_agent/executors/content.py
async def execute_list_content_items(...) { /* ... */ }
async def execute_get_content_details(...) { /* ... */ }
```

### 3. Extract Sub-Components (1-2 hours each)
```typescript
// From VideoPlayer.tsx
export function VideoPlayerControls() { /* ... */ }
export function VideoPlayerProgress() { /* ... */ }
```

## Benefits of Refactoring

### Maintainability
- ✅ Easier to understand code
- ✅ Faster to locate issues
- ✅ Simpler to make changes

### Testability
- ✅ Test individual components
- ✅ Mock dependencies easily
- ✅ Better test coverage

### Performance
- ✅ Smaller components re-render less
- ✅ Better code splitting
- ✅ Faster build times

### Developer Experience
- ✅ Better IDE navigation
- ✅ Clearer code structure
- ✅ Easier onboarding

## Next Steps

1. **Review this document** with the team
2. **Prioritize** which files to refactor first
3. **Create tickets** for each refactoring task
4. **Start with quick wins** (custom hooks, small extractions)
5. **Tackle large refactorings** one at a time
6. **Test thoroughly** after each change
7. **Document** the new structure

## Files Created

- ✅ `/backend/REFACTORING_PLAN.md` - Detailed refactoring plan
- ✅ `/REFACTORING_SUMMARY.md` - This summary document
- ✅ `/backend/app/services/ai_agent/__init__.py` - Started AI agent module
- ✅ `/backend/app/services/ai_agent/logger.py` - Extracted logger module

## Conclusion

The codebase has grown significantly and now requires systematic refactoring to maintain code quality. The identified files are functional but have become difficult to maintain due to their size.

**Recommendation**: Start with Phase 1 (backend services) as they are the most critical and have the highest impact. The refactoring can be done incrementally without breaking existing functionality.

**Total Impact**: Refactoring these files will improve maintainability of **16,000+ lines of code** across the codebase.
