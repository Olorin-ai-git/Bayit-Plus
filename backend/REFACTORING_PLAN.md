# Code Refactoring Plan - January 13, 2026

## Overview
Large files identified for refactoring to improve maintainability, testability, and code organization.

## Target Files

### 1. Backend - AI Agent Service (2297 lines) ⚠️ CRITICAL
**Current**: `backend/app/services/ai_agent_service.py`

**Issues**:
- Single file with 2297 lines
- 19+ tool executor functions
- Mixed concerns (tools, executors, orchestration, logging)
- Hard to test individual components
- Difficult to navigate and maintain

**Refactoring Strategy**:
```
backend/app/services/
├── ai_agent_service.py          # Main orchestration (keep ~300 lines)
└── ai_agent/
    ├── __init__.py
    ├── logger.py                 # Database logging utilities
    ├── tools.py                  # Tool definitions for Claude
    ├── executor.py               # Main executor orchestrator
    └── executors/
        ├── __init__.py
        ├── content.py            # Content listing/details
        ├── metadata.py           # Metadata fixing tools
        ├── stream.py             # Stream validation
        ├── storage.py            # Storage management
        ├── subtitles.py          # Subtitle operations
        └── notifications.py      # Email/notification tools
```

**Benefits**:
- Each module <300 lines
- Clear separation of concerns
- Easy to test individual tools
- Better code navigation
- Easier to add new tools

---

### 2. Backend - Chat Routes (1448 lines) ⚠️ HIGH
**Current**: `backend/app/api/routes/chat.py`

**Issues**:
- Single route file with 1448 lines
- Multiple concerns (streaming, history, contexts)
- Hard to maintain

**Refactoring Strategy**:
```
backend/app/api/routes/
└── chat/
    ├── __init__.py
    ├── streaming.py              # Streaming chat endpoints
    ├── history.py                # Chat history management
    ├── contexts.py               # Context management
    └── handlers.py               # Message handlers
```

---

### 3. Frontend - Chatbot Component (1326 lines) ⚠️ HIGH
**Current**: `web/src/components/chat/Chatbot.tsx`

**Issues**:
- Massive component with 1326 lines
- Complex state management
- Multiple UI concerns in one file

**Refactoring Strategy**:
```
web/src/components/chat/
├── Chatbot.tsx                   # Main container (~200 lines)
├── ChatbotHeader.tsx             # Header with minimize/close
├── ChatbotMessages.tsx           # Message list renderer
├── ChatbotInput.tsx              # Input field and controls
├── ChatbotSuggestions.tsx        # Suggested queries
├── ChatbotSettings.tsx           # Voice/model settings
├── hooks/
│   ├── useChatState.ts           # State management
│   ├── useChatMessages.ts        # Message handling
│   ├── useChatStreaming.ts       # Streaming logic
│   └── useVoiceChat.ts           # Voice integration
└── types.ts                      # Shared types
```

---

### 4. Frontend - Video Player (1295 lines) ⚠️ HIGH
**Current**: `web/src/components/player/VideoPlayer.tsx`

**Issues**:
- 1295 lines in single component
- Complex controls and state
- Settings panel embedded

**Refactoring Strategy**:
```
web/src/components/player/
├── VideoPlayer.tsx               # Main container (~300 lines)
├── VideoPlayerControls.tsx       # Control bar
├── VideoPlayerProgress.tsx       # Progress bar/scrubbing
├── VideoPlayerSettings.tsx       # Settings panel
├── VideoPlayerChapters.tsx       # Chapter navigation
├── SubtitleControls.tsx          # Already separate ✓
├── LiveSubtitleControls.tsx      # Already separate ✓
├── hooks/
│   ├── useVideoState.ts          # Video state management
│   ├── useVideoControls.ts       # Playback controls
│   ├── useVideoProgress.ts       # Progress tracking
│   └── useVideoSettings.ts       # Settings state
└── types.ts                      # Player types
```

---

### 5. Frontend - Librarian Agent Page (1267 lines) ⚠️ HIGH
**Current**: `web/src/pages/admin/LibrarianAgentPage.tsx`

**Issues**:
- 1267 lines admin page
- Multiple tabs and views
- Complex audit logic

**Refactoring Strategy**:
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

---

## Additional Files to Consider

### Medium Priority (700-1000 lines)
- `web/src/pages/WatchPage.tsx` (964 lines)
- `web/src/pages/ProfilePage.tsx` (1061 lines)
- `web/src/components/settings/VoiceSettings.tsx` (943 lines)
- `shared/data/demoData.ts` (1163 lines) - Maybe split by content type
- `shared/screens/*` (1000+ lines) - Various admin screens

## Refactoring Principles

### 1. Single Responsibility
- Each module/component should have one clear purpose
- If a file does multiple things, split it

### 2. Size Guidelines
- Functions: <50 lines
- Components: <300 lines  
- Modules: <500 lines
- Files >1000 lines should be split

### 3. Code Organization
- Group related functionality together
- Use directories for related modules
- Clear naming conventions

### 4. Testability
- Smaller units are easier to test
- Extract logic from UI components
- Use custom hooks for complex logic

### 5. Maintainability
- Clear imports and exports
- Good documentation
- Consistent patterns

## Implementation Priority

### Phase 1: Critical Backend (Week 1)
1. ✅ Refactor `ai_agent_service.py` → `ai_agent/` module
2. ✅ Refactor `chat.py` → `chat/` module
3. Test all endpoints still work

### Phase 2: Critical Frontend (Week 2)
1. ✅ Refactor `Chatbot.tsx` → modular components
2. ✅ Refactor `VideoPlayer.tsx` → modular components  
3. Test UI components work correctly

### Phase 3: Admin Pages (Week 3)
1. ✅ Refactor `LibrarianAgentPage.tsx`
2. ✅ Refactor other large admin pages
3. Test admin functionality

### Phase 4: Shared Code (Week 4)
1. ✅ Refactor demo data
2. ✅ Refactor shared screens
3. Ensure consistency across platforms

## Testing Strategy

### For Each Refactoring:
1. **Before**: Run existing tests
2. **During**: Maintain same public API
3. **After**: 
   - All tests still pass
   - No functional changes
   - Improved code organization

### Test Coverage:
- Unit tests for individual modules
- Integration tests for modules working together
- E2E tests for critical user flows

## Success Metrics

- ✅ No file >1000 lines
- ✅ No component >500 lines
- ✅ No function >100 lines
- ✅ All tests passing
- ✅ No regressions in functionality
- ✅ Improved code maintainability score

## Rollout Plan

### Step-by-Step:
1. Create new module structure
2. Copy/move code with minimal changes
3. Update imports
4. Run tests
5. If tests pass, commit
6. If tests fail, fix issues
7. Delete old file only after new version works

### Safety:
- Keep old files temporarily (rename to `.old`)
- Gradual rollout (one module at a time)
- Easy rollback if issues arise
- Monitor production for issues

## Documentation Updates

After refactoring:
- Update architecture documentation
- Update developer onboarding docs
- Add module README files
- Update code style guide

## Timeline

- **Week 1**: Backend refactoring (ai_agent, chat)
- **Week 2**: Frontend components (chatbot, video player)
- **Week 3**: Admin pages (librarian, user management)
- **Week 4**: Shared code, cleanup, documentation

**Total**: 4 weeks for complete refactoring

## Notes

- This is a significant undertaking but necessary for maintainability
- Should be done incrementally with thorough testing
- No functional changes - pure refactoring
- Focus on improving code organization and readability
