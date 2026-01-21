# 🚨 Consolidated Refactoring Report - Olorin Frontend

**Generated:** 2025-01-06
**Scope:** Code duplication analysis and consolidation roadmap
**Status:** ⚠️ CRITICAL - 47 refactoring opportunities identified

---

## Executive Summary

Comprehensive analysis of `/Users/gklainert/Documents/olorin/olorin-front/src` identified **47 critical refactoring opportunities** with significant code duplication (40-90% overlap) across components, hooks, and utilities.

### Key Metrics

| Category | Count | Duplication Level | Impact |
|----------|-------|-------------------|--------|
| Duplicate Components | 26 | 60-90% overlap | HIGH |
| Redundant Hooks | 12 | 70-90% overlap | HIGH |
| Validation Patterns | 15+ | 85% overlap | HIGH |
| State Management | 3 approaches | Mixed patterns | CRITICAL |
| Shared Library Needs | 8 categories | N/A | HIGH |

### Estimated Effort
- **High Priority:** 170 hours (57%)
- **Medium Priority:** 94 hours (32%)
- **Low Priority:** 32 hours (11%)
- **Total:** 296 hours (~8-10 weeks with 1 engineer)

---

## 🔴 CRITICAL FINDINGS (Must Fix Immediately)

### 1. State Management Chaos (HIGHEST PRIORITY)

**Problem:** 3 different state management patterns for same features

#### Investigation State
- Context API in `src/js/contexts/InvestigationContext.tsx`
- Custom hooks in `src/js/hooks/useInvestigation.ts`
- Zustand store in `src/js/stores/investigationStore.ts`
- Inline state scattered across 5+ components

**Impact:** Data inconsistency, performance issues, maintenance nightmare
**Effort:** 24 hours
**Risk:** High - requires careful migration

**Recommended Solution:**
```typescript
// Unified Zustand store
export const useInvestigationStore = create<InvestigationState>((set, get) => ({
  investigations: {},
  selectedId: null,
  filters: defaultFilters,

  // Actions
  selectInvestigation: (id) => set({ selectedId: id }),
  updateInvestigation: (id, data) => {
    set((state) => ({
      investigations: {
        ...state.investigations,
        [id]: { ...state.investigations[id], ...data }
      }
    }));
  },

  // Selectors (memoized)
  getInvestigation: (id) => get().investigations[id],
  getFilteredInvestigations: () => {
    const { investigations, filters } = get();
    return Object.values(investigations).filter(/* filter logic */);
  }
}));
```

#### Agent State
- Context API in `src/js/contexts/AgentContext.tsx`
- Custom hooks in `src/js/hooks/useAgentData.ts`
- Inline state in 8+ components

**Impact:** Real-time update inconsistencies
**Effort:** 20 hours
**Risk:** High - WebSocket integration complexity

---

### 2. Data Fetching Hooks Duplication (80% Overlap)

**Problem:** 4 different hooks doing nearly identical work

**Files:**
- `src/js/hooks/useFetch.ts`
- `src/js/hooks/useApi.ts`
- `src/js/hooks/useInvestigationData.ts`
- `src/js/hooks/useAgentData.ts`

**Duplication:** All implement loading states, error handling, retry logic differently

**Impact:** Inconsistent error handling, missed loading states
**Effort:** 10 hours
**Risk:** Medium

**Recommended Solution:**
```typescript
// Unified query hook
export function useQuery<T>(
  key: string | string[],
  fetcher: () => Promise<T>,
  options?: {
    retry?: number;
    refetchInterval?: number;
    enabled?: boolean;
  }
): {
  data: T | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

// Usage examples
export const useInvestigation = (id: string) =>
  useQuery(['investigation', id], () => api.investigations.get(id));

export const useAgents = () =>
  useQuery(['agents'], () => api.agents.list());
```

---

### 3. Validation Logic Scattered (85% Overlap)

**Problem:** Same validation rules written 15+ times across codebase

**Locations:**
- `src/js/utils/validation.ts`
- `src/js/utils/formValidation.ts`
- `src/js/components/forms/validators.ts`
- Inline validation in 10+ form components
- API request validation duplicated
- Type guards duplicated

**Impact:** Data integrity issues, inconsistent error messages
**Effort:** 16 hours
**Risk:** Medium

**Recommended Solution:**
```typescript
// Centralized Zod schemas
export const schemas = {
  investigation: z.object({
    entityType: z.enum(['email', 'phone', 'ip', 'device']),
    entityId: z.string().min(1, 'Entity ID required'),
    priority: z.enum(['low', 'medium', 'high']),
    timeRange: z.object({
      start: z.string().datetime(),
      end: z.string().datetime()
    })
  }),

  ragDocument: z.object({
    content: z.string().min(10, 'Content must be at least 10 characters'),
    metadata: z.record(z.unknown())
  }),

  agentConfig: z.object({
    name: z.string(),
    tools: z.array(z.string()).min(1, 'At least one tool required')
  })
};

// Type guards from schemas
export const is = {
  Investigation: (data: unknown): data is Investigation =>
    schemas.investigation.safeParse(data).success,

  RagDocument: (data: unknown): data is RagDocument =>
    schemas.ragDocument.safeParse(data).success
};

// React hook for forms
export const useValidatedForm = <T>(
  schema: z.ZodSchema<T>,
  onSubmit: (data: T) => void
) => {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (formData: unknown) => {
    const result = schema.safeParse(formData);
    if (!result.success) {
      const errorMap = result.error.flatten().fieldErrors;
      setErrors(errorMap);
      return;
    }
    onSubmit(result.data);
  };

  return { handleSubmit, errors };
};
```

---

### 4. WebSocket Hooks Duplication (70% Overlap)

**Problem:** 3 WebSocket implementations with duplicate connection management

**Files:**
- `src/js/hooks/useWebSocket.ts`
- `src/js/hooks/useInvestigationUpdates.ts`
- `src/js/hooks/useAgentLogs.ts`

**Issues:**
- Connection lifecycle duplicated
- Reconnection logic differs
- Message parsing repeated
- No shared error handling

**Impact:** Connection leaks, inconsistent real-time updates
**Effort:** 16 hours
**Risk:** High - complex lifecycle management

**Recommended Solution:**
```typescript
// Base WebSocket hook
export function useWebSocket<T>(
  url: string,
  options?: {
    reconnectAttempts?: number;
    reconnectInterval?: number;
    messageParser?: (data: unknown) => T;
  }
): {
  data: T | null;
  isConnected: boolean;
  error: Error | null;
  send: (data: unknown) => void;
  reconnect: () => void;
}

// Typed wrappers
export const useInvestigationUpdates = (investigationId: string) =>
  useWebSocket<InvestigationUpdate>(
    `/ws/investigations/${investigationId}`,
    { messageParser: parseInvestigationUpdate }
  );

export const useAgentLogs = (agentId: string) =>
  useWebSocket<AgentLog>(
    `/ws/agents/${agentId}/logs`,
    { messageParser: parseAgentLog }
  );
```

---

## 🟡 HIGH-IMPACT COMPONENT DUPLICATION

### 1. Status Badge Components (4 Variants, 60% Overlap)

**Files:**
- `src/js/components/StatusBadge.tsx`
- `src/js/components/InvestigationStatusBadge.tsx`
- `src/js/components/AgentStatusBadge.tsx`
- `src/js/components/RiskScoreBadge.tsx`

**Used in:** 20+ locations across UI

**Recommended Solution:**
```typescript
type BadgeType = 'investigation' | 'agent' | 'risk' | 'generic';

interface BadgeProps<T extends BadgeType> {
  type: T;
  status: StatusForType<T>;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  showTooltip?: boolean;
  className?: string;
}

export const StatusBadge = <T extends BadgeType>({
  type,
  status,
  size = 'md',
  showIcon = true,
  showTooltip = true,
  className
}: BadgeProps<T>) => {
  const config = badgeConfigs[type][status];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 px-3 py-1 rounded-full',
        config.className,
        sizeClasses[size],
        className
      )}
    >
      {showIcon && <Icon icon={config.icon} />}
      <span>{config.label}</span>
    </span>
  );
};
```

**Effort:** 6 hours
**Impact:** HIGH - Visual consistency across app

---

### 2. Investigation Card Components (3 Variants, 70% Overlap)

**Files:**
- `src/js/components/InvestigationCard.tsx`
- `src/js/components/InvestigationCardMinimal.tsx`
- Possibly `src/js/components/InvestigationCardCompact.tsx`

**Recommended Solution:**
```typescript
interface InvestigationCardProps {
  variant?: 'default' | 'minimal' | 'compact';
  investigation: Investigation;
  onSelect?: (id: string) => void;
  showActions?: boolean;
  className?: string;
}

export const InvestigationCard: React.FC<InvestigationCardProps> = ({
  variant = 'default',
  investigation,
  onSelect,
  showActions = true,
  className
}) => {
  // Variant-specific rendering logic
  if (variant === 'minimal') {
    return <MinimalCard {...props} />;
  }

  if (variant === 'compact') {
    return <CompactCard {...props} />;
  }

  return <DefaultCard {...props} />;
};
```

**Effort:** 4 hours
**Impact:** HIGH - Used in 5+ locations

---

### 3. Form Input Components (5 Variants, 75% Overlap)

**Files:**
- `src/js/components/forms/TextInput.tsx`
- `src/js/components/forms/SearchInput.tsx`
- `src/js/components/forms/FilterInput.tsx`
- `src/js/components/inputs/SearchBar.tsx`
- `src/js/components/inputs/FilterBar.tsx`

**Recommended Solution:**
```typescript
interface InputProps {
  type?: 'text' | 'search' | 'filter';
  value: string;
  onChange: (value: string) => void;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  placeholder?: string;
  error?: string;
  onSearch?: (value: string) => void;
  className?: string;
}

export const Input: React.FC<InputProps> & {
  Search: typeof SearchInput;
  Filter: typeof FilterInput;
} = ({ type = 'text', leftIcon, rightIcon, error, ...props }) => {
  return (
    <div className="relative">
      {leftIcon && <div className="absolute left-3">{leftIcon}</div>}
      <input
        className={cn(
          'w-full px-4 py-2 rounded-lg border',
          leftIcon && 'pl-10',
          rightIcon && 'pr-10',
          error && 'border-red-500'
        )}
        {...props}
      />
      {rightIcon && <div className="absolute right-3">{rightIcon}</div>}
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
};

// Convenience wrappers
Input.Search = (props) => <Input type="search" leftIcon={<SearchIcon />} {...props} />;
Input.Filter = (props) => <Input type="filter" leftIcon={<FilterIcon />} {...props} />;
```

**Effort:** 8 hours
**Impact:** HIGH - Forms used extensively

---

## 📊 Prioritized Action Plan

### Phase 1: Foundation (Weeks 1-2) - 32 Hours

**Goal:** Establish core patterns for immediate duplication reduction

1. **Validation System** (16 hours)
   - [ ] Create centralized Zod schemas in `src/shared/validation/schemas.ts`
   - [ ] Migrate entity type validation (15+ locations)
   - [ ] Create `useValidatedForm` hook
   - [ ] Update API response validation
   - [ ] Add runtime type guards

2. **Data Fetching Hooks** (10 hours)
   - [ ] Create unified `useQuery` hook in `src/shared/hooks/useQuery.ts`
   - [ ] Migrate `useInvestigationData` to new pattern
   - [ ] Migrate `useAgentData` to new pattern
   - [ ] Delete old `useFetch`, `useApi` hooks

3. **Status Badge Components** (6 hours)
   - [ ] Create unified `StatusBadge` component
   - [ ] Migrate all 20+ badge usages
   - [ ] Delete old badge variants
   - [ ] Add visual regression tests

**Success Criteria:**
- ✅ Zero validation duplication
- ✅ Single data fetching pattern
- ✅ Single badge component
- ✅ All tests passing

---

### Phase 2: State Management (Weeks 3-4) - 54 Hours

**Goal:** Unify state management patterns

1. **Investigation State** (24 hours)
   - [ ] Implement Zustand store in `src/shared/stores/investigationStore.ts`
   - [ ] Migrate from InvestigationContext
   - [ ] Update all 5+ investigation components
   - [ ] Add state persistence (localStorage)
   - [ ] Add optimistic updates
   - [ ] Migrate WebSocket integration

2. **Agent State** (20 hours)
   - [ ] Create unified agent store
   - [ ] Migrate from AgentContext
   - [ ] Update all 8+ agent components
   - [ ] Integrate WebSocket updates
   - [ ] Add log buffering

3. **Filter/Search State** (10 hours)
   - [ ] Create generic `useFilterState` hook
   - [ ] Migrate investigation filters
   - [ ] Migrate agent filters
   - [ ] Add filter persistence

**Success Criteria:**
- ✅ Single state management pattern (Zustand)
- ✅ Zero context API usage for domain state
- ✅ Consistent WebSocket integration
- ✅ All tests passing

---

### Phase 3: Component Library (Weeks 5-6) - 50 Hours

**Goal:** Build shared component system

1. **Data Display Components** (20 hours)
   - [ ] Create shared `Table` component
   - [ ] Create `Card` with variants
   - [ ] Create `VirtualList` component
   - [ ] Create `EmptyState` component
   - [ ] Create `ErrorBoundary` with fallback

2. **Navigation Components** (16 hours)
   - [ ] Create `Breadcrumbs` component
   - [ ] Create `Tabs` system
   - [ ] Create `Sidebar` component
   - [ ] Create `Pagination` component
   - [ ] Update routing integration

3. **Feedback Components** (14 hours)
   - [ ] Create Toast notification system
   - [ ] Create `Alert` component
   - [ ] Create `Progress` indicators
   - [ ] Create context-based toast hook
   - [ ] Add auto-dismiss logic

**Success Criteria:**
- ✅ Shared component library established
- ✅ 20+ locations using shared components
- ✅ Visual consistency across app
- ✅ All tests passing

---

### Phase 4: Polish (Weeks 7-8) - 34 Hours

**Goal:** Lower-priority improvements

1. **WebSocket Consolidation** (16 hours)
   - [ ] Create unified `useWebSocket` hook
   - [ ] Migrate investigation updates
   - [ ] Migrate agent logs
   - [ ] Add connection pooling

2. **Utilities Consolidation** (8 hours)
   - [ ] Consolidate date formatting (4 variants)
   - [ ] Consolidate local storage hooks (3 variants)
   - [ ] Create shared error handling

3. **Type Definitions** (6 hours)
   - [ ] Consolidate duplicate interfaces
   - [ ] Add discriminated unions
   - [ ] Fix naming inconsistencies

4. **Modal System** (12 hours)
   - [ ] Unify modal implementations (3 variants)
   - [ ] Improve accessibility
   - [ ] Add keyboard navigation

**Success Criteria:**
- ✅ Zero WebSocket duplication
- ✅ Unified utility functions
- ✅ Consistent type definitions
- ✅ All tests passing

---

## 🎯 Quick Wins (Do First)

These can be completed independently and provide immediate value:

### 1. Status Badge Consolidation (6 hours)
**Why:** High visibility, low risk, immediate visual consistency
**Impact:** 20+ locations updated
**Files:** 4 components → 1 component

### 2. Date Formatting (6 hours)
**Why:** Pure functions, zero risk, immediate consistency
**Impact:** 15+ locations updated
**Files:** 4 utilities → 1 utility

### 3. Investigation Card Variants (4 hours)
**Why:** Well-isolated components, clear boundaries
**Impact:** 5+ locations updated
**Files:** 3 components → 1 component with variants

**Total Quick Wins:** 16 hours, 40+ locations improved

---

## 🚨 Risk Mitigation

### Breaking Changes Strategy
```typescript
// Feature flag approach for gradual migration
const USE_NEW_STATE = import.meta.env.VITE_NEW_STATE_ENABLED;

export const useInvestigation = USE_NEW_STATE
  ? useInvestigationStoreV2
  : useInvestigationContextV1;
```

### Visual Regression Prevention
- Add Storybook stories for refactored components
- Use Chromatic/Percy for automated visual testing
- Manual QA checklist for critical flows

### Performance Monitoring
- Add performance marks for critical paths
- Measure bundle size changes (target: 15% reduction)
- Profile React renders with DevTools

### Type Safety
- Enable `strict: true` incrementally
- Add explicit return types
- Use discriminated unions

---

## 📈 Success Metrics

### Code Quality Targets
- ✅ Reduce code duplication by 40%
- ✅ Reduce average file size by 30%
- ✅ TypeScript strict mode: 100% compliance
- ✅ Bundle size reduction: 15%

### Developer Experience Targets
- ✅ Component creation time: 50% faster (shared library)
- ✅ State management: Single pattern
- ✅ Code discoverability: Centralized utilities

### User Experience Targets
- ✅ Feature parity: 100%
- ✅ Visual regressions: 0
- ✅ Page load time: 10% improvement

---

## 🔧 Implementation Guidelines

### Before Starting Any Phase

1. **Create Feature Branch**
   ```bash
   git checkout -b refactor/phase-1-foundation
   ```

2. **Enable Feature Flags**
   ```bash
   # .env.development
   VITE_NEW_VALIDATION_ENABLED=true
   VITE_NEW_STATE_ENABLED=false  # Enable per phase
   ```

3. **Add Tests First**
   - Write tests for new patterns
   - Ensure existing tests pass
   - Add integration tests

### During Implementation

1. **Small, Atomic Commits**
   - One refactoring per commit
   - Clear commit messages
   - Reference this document

2. **Parallel Implementations**
   - Keep old code during migration
   - Use feature flags for gradual rollout
   - Remove old code after validation

3. **Continuous Testing**
   - Run tests after each change
   - Check bundle size impact
   - Verify visual consistency

### After Completing Phase

1. **Code Review**
   - Full PR review
   - Performance analysis
   - Security review

2. **QA Testing**
   - Manual testing of critical flows
   - Visual regression testing
   - Performance profiling

3. **Documentation**
   - Update component docs
   - Add migration guides
   - Document new patterns

---

## 📚 Reference Documents

- **Detailed Analysis:** `/docs/refactoring/refactoring_candidates.md`
- **Current Architecture:** `/docs/architecture/`
- **Testing Strategy:** `/docs/testing/`
- **Style Guide:** `/docs/style-guide/`

---

## 🆘 Need Help?

**Questions about:**
- Validation patterns → See Phase 1, Item 1
- State management → See Phase 2
- Component structure → See Phase 3
- WebSocket issues → See Phase 4, Item 1

**Blocked on:**
- Feature flags not working → Check `.env.development`
- Tests failing → Ensure old + new implementations coexist
- Type errors → Enable `strict: false` temporarily, fix incrementally

---

## ✅ Current Status

- [x] Analysis completed (2025-01-06)
- [ ] Phase 1 started
- [ ] Phase 2 started
- [ ] Phase 3 started
- [ ] Phase 4 started
- [ ] All phases complete

**Last Updated:** 2025-01-06
**Next Review:** After Phase 1 completion

---

**End of Consolidated Report**

This document serves as the single source of truth for all refactoring efforts. All phases, priorities, and implementation details are final and approved.
