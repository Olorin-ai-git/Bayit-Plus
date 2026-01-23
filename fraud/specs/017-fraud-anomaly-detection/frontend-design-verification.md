# Frontend Design Verification & Task Alignment

## Design Requirements Summary

### Visual System
- **Glassmorphic styling**: Cards with `backdrop-filter: blur()`, soft borders, gradients
- **Dark/neon theme**: Purple accents (#A855F7, #C084FC), dark backgrounds
- **Common header**: Shared across all three pages
- **URL-driven state**: Filters reflected in query string for shareable links

### Core Building Blocks Needed
1. **Routing**: React Router with routes `/analytics/anomalies`, `/analytics/detectors/:id`, `/analytics/replay`
2. **API wrapper**: Thin `api.ts` with functions matching FastAPI endpoints
3. **Visual components**: Panel, Toolbar, KpiTile, DataTable, Sparkline, Toast
4. **Accessibility**: aria-labels, keyboard focus, high contrast, large click targets

### Page-Specific Requirements

#### 1. Detector Studio (Canvas Page)
- **Left**: Configuration (metric selector, cohort fields, sliders for k/persistence)
- **Right**: Preview (time-series chart with SVG, red dots for anomalies, anomalies table)
- **Client-side preview**: Mock `/series` generator, approximate STL+MAD/CUSUM scoring
- **Interactions**: Reload Series, Run Preview buttons with toasts
- **Swap to real backend**: One-liner replacement of mock function

#### 2. Anomaly Hub
- **Filters toolbar**: Time range, metric, severity, cohort filters
- **KPI tiles**: Volume, critical count, top-affected cohorts
- **Live table**: Last N anomalies (severity colored, sortable)
- **Sparkline**: Trend panel for selected row
- **WebSocket**: Real-time updates via `/v1/stream/anomalies`
- **Drawer**: Details view with evidence and investigation links

#### 3. Replay Studio
- **Controls**: Time window, metric/cohort, thresholds
- **Run button**: Progress indicator
- **Results**: Counts, precision proxy, diff table (new-only, missing, overlap)
- **Promote button**: Persist detector config

## Task Gap Analysis

### Missing Tasks Identified

#### Visual System & Components
- [ ] Create glassmorphic Panel component with backdrop blur
- [ ] Create Toolbar component with glassmorphic styling
- [ ] Create KpiTile component (glassmorphic card with gradient)
- [ ] Create DataTable component (sortable, glassmorphic)
- [ ] Create Sparkline component (mini trend chart)
- [ ] Create Toast component (notifications)
- [ ] Create common AnalyticsHeader component (shared across pages)

#### Detector Studio Specific
- [ ] Create mock series generator (seasonality + noise + injected anomalies)
- [ ] Implement client-side STL approximation (two moving averages)
- [ ] Implement client-side MAD z-score calculation
- [ ] Implement client-side CUSUM-like level-shift scoring
- [ ] Implement fused score calculation (max(MAD, CUSUM))
- [ ] Create slider components for k and persistence
- [ ] Create metric selector dropdown
- [ ] Create cohort field inputs
- [ ] Implement preview scoring state management

#### Anomaly Hub Specific
- [ ] Implement URL query string state management (filters in URL)
- [ ] Create filter toolbar with URL sync
- [ ] Create KPI tiles layout
- [ ] Implement WebSocket connection with auto-reconnect
- [ ] Create drawer component for anomaly details
- [ ] Implement local cache keyed by query string

#### Replay Studio Specific
- [ ] Create diff table component (new-only, missing, overlap)
- [ ] Create progress indicator component
- [ ] Implement visual diff (colors and badges)

#### Shared Infrastructure
- [ ] Implement error boundaries around charts/tables
- [ ] Create skeleton loaders for loading states
- [ ] Implement toast notification system
- [ ] Create empty state components with retry buttons
- [ ] Implement PII masking utilities
- [ ] Add accessibility features (aria-labels, keyboard navigation)

#### API Integration
- [ ] Implement `getSeries()` function in api.ts
- [ ] Implement `streamAnomalies()` WebSocket wrapper
- [ ] Implement URL state sync helpers

## Alignment with Existing Olorin Style

### Verified Existing Patterns
✅ Glassmorphic classes: `.glass`, `.glass-md`, `.glass-lg` exist in `index.css`
✅ Dark theme: `bg-corporate-bgPrimary`, `text-corporate-textPrimary` patterns
✅ Purple accents: `#A855F7`, `#C084FC` in palette
✅ Card components: `Card` component exists with variants
✅ EmptyState component exists
✅ ErrorBoundary component exists

### Gaps to Fill
- Need to ensure all new components use glassmorphic styling
- Need to create missing visual components (Panel, Toolbar, KpiTile, DataTable, Sparkline, Toast)
- Need to implement URL-driven state management
- Need to add accessibility features consistently

## Recommendations

1. **Create shared component library** for glassmorphic components
2. **Add URL state management hook** (`useUrlState`) for filter sync
3. **Create mock data generators** for Detector Studio preview
4. **Implement client-side scoring** for instant preview feedback
5. **Add comprehensive accessibility** features to all interactive components
6. **Create toast notification system** for user feedback
7. **Implement error boundaries** around all data-dependent components

