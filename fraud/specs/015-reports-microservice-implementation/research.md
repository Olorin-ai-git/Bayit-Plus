# Research & Technology Selection: Reports Microservice

**Feature**: 001-reports-microservice-implementation
**Date**: 2025-01-09
**Status**: Research Complete

## Executive Summary

This document consolidates research findings for building the Reports Microservice frontend. All technical decisions are based on analysis of the existing Olorin codebase, the reference HTML design (`olorin-reports.html`), and industry best practices for React markdown editing and data visualization.

**Key Decisions**:
- **Markdown Rendering**: react-markdown for React-native markdown rendering with plugin support
- **Widget Injection**: Custom markdown plugin to detect and replace widget placeholders
- **Charts**: Integrate with existing visualization microservice (no duplication)
- **Notifications**: react-hot-toast for lightweight, themeable toast notifications
- **TOC Generation**: Parse markdown AST to extract headings and generate navigation
- **Theme**: Use Olorin corporate colors from tailwind.config.js (dark purple theme)

---

## 1. Markdown Rendering Library Evaluation

### Decision: react-markdown

**Rationale**: React-native component library that renders markdown as React components, allowing easy customization and widget injection.

| Library | Strengths | Limitations | Decision |
|---------|-----------|-------------|----------|
| **react-markdown** | React-native, extensible plugins, safe by default | Requires remark/rehype plugins for advanced features | ✅ **SELECTED** |
| **marked** | Fast, feature-rich | Requires dangerouslySetInnerHTML, less React-friendly | ❌ Rejected |
| **markdown-to-jsx** | Simple, lightweight | Limited customization | ❌ Rejected |

**Implementation**:
```typescript
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm'; // GitHub Flavored Markdown support
```

---

## 2. Widget Injection Pattern

### Decision: Custom Markdown Plugin

**Rationale**: Parse markdown content to detect widget placeholders (`{{KPI total}}`, `{{CHART timeseries}}`, etc.) and replace them with React components that fetch and render data.

**Pattern**:
1. Parse markdown content
2. Detect widget placeholders using regex: `/\{\{(\w+)\s+(\w+)\}\}/g`
3. Replace placeholders with widget components
4. Widget components fetch data from backend API
5. Render widgets with actual data

**Widget Types**:
- `{{KPI total}}` → KPIWidget with investigation count
- `{{KPI completed}}` → KPIWidget with completed count
- `{{KPI success}}` → KPIWidget with success rate
- `{{CHART timeseries}}` → ChartWidget (timeseries via visualization microservice)
- `{{CHART success}}` → ChartWidget (donut chart)
- `{{CHART hbar}}` → ChartWidget (horizontal bar)
- `{{HEATMAP}}` → ChartWidget (heatmap)
- `{{TABLE recent}}` → TableWidget with recent investigations

---

## 3. Chart Integration

### Decision: Use Existing Visualization Microservice

**Rationale**: Avoid code duplication. The visualization microservice already provides Chart.js, D3.js, and Recharts components. Import and use these components.

**Integration Pattern**:
```typescript
import { LineChart, BarChart, PieChart } from '@microservices/visualization';
```

**Chart Types Needed**:
- Timeseries line chart → LineChart component
- Donut chart → PieChart component with donut variant
- Horizontal bar chart → BarChart component (horizontal orientation)
- Heatmap → Custom SVG component (or D3.js from visualization microservice)

---

## 4. Table of Contents Generation

### Decision: Parse Markdown AST

**Rationale**: Extract headings from markdown AST to generate TOC with proper nesting and anchor links.

**Implementation**:
1. Use remark plugin to extract headings
2. Generate unique IDs for each heading (slugify)
3. Create TOC structure with nested lists
4. Add scroll spy to highlight current section

**TOC Structure**:
```typescript
interface TOCItem {
  id: string;
  text: string;
  level: number; // 1, 2, 3 for h1, h2, h3
  children?: TOCItem[];
}
```

---

## 5. Toast Notifications

### Decision: react-hot-toast

**Rationale**: Lightweight, themeable, and easy to integrate with Olorin dark theme.

| Library | Strengths | Limitations | Decision |
|---------|-----------|-------------|----------|
| **react-hot-toast** | Lightweight, themeable, simple API | Less features than some alternatives | ✅ **SELECTED** |
| **react-toastify** | Feature-rich | Larger bundle size | ❌ Rejected |
| **sonner** | Modern, beautiful | Newer, less mature | ❌ Rejected |

**Theme Integration**:
```typescript
import toast, { Toaster } from 'react-hot-toast';

<Toaster
  position="bottom-right"
  toastOptions={{
    style: {
      background: '#11111a',
      color: '#e9e7ff',
      border: '1px solid rgba(139,92,246,.35)',
    },
  }}
/>
```

---

## 6. Keyboard Shortcuts

### Decision: Native React Event Handlers

**Rationale**: Simple keyboard shortcuts don't require a library. Use React's keyboard event handlers.

**Shortcuts**:
- `/` → Focus search input
- `N` → Create new report
- `Ctrl/Cmd+S` → Save report (in editor)

**Implementation**:
```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
      e.preventDefault();
      searchInputRef.current?.focus();
    }
    if (e.key === 'n' || e.key === 'N') {
      handleNewReport();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      handleSave();
    }
  };
  document.addEventListener('keydown', handleKeyDown);
  return () => document.removeEventListener('keydown', handleKeyDown);
}, []);
```

---

## 7. Olorin Theme Integration

### Decision: Use Tailwind Corporate Colors

**Rationale**: Olorin theme is already defined in `tailwind.config.js` with corporate colors. Use these classes directly.

**Color Palette** (from tailwind.config.js):
- Background: `bg-corporate-bgPrimary` (#1A0B2E) or `bg-black` (#000000)
- Panels: `bg-black/40` with `backdrop-blur-md`
- Primary: `text-corporate-accentPrimary` (#A855F7)
- Text: `text-corporate-textPrimary` (#F9FAFB)
- Muted: `text-corporate-textSecondary` (#D8B4FE)
- Borders: `border-corporate-borderPrimary` (#6B21A8)

**Reference Design Colors** (from olorin-reports.html):
- Background: `#0b0b12`
- Panel: `#11111a`
- Primary: `#8b5cf6`
- Text: `#e9e7ff`
- Muted: `#a5a1c2`

**Decision**: Use Tailwind corporate colors as primary, but match reference design where it differs (e.g., use `#8b5cf6` for primary accent to match reference).

---

## 8. State Management

### Decision: React Hooks + Context (No Zustand)

**Rationale**: Simple state management doesn't require external library. Use React hooks and context for shared state.

**State Structure**:
- Report list state → `useReports` hook
- Editor state → `useReportEditor` hook
- Widget data → `useWidgetData` hook
- UI state (modals, toasts) → Component-level state

---

## 9. API Integration

### Decision: Axios with Existing BaseApiService Pattern

**Rationale**: Follow existing patterns in codebase. Use Axios with base URL from config.

**Service Pattern**:
```typescript
import { getConfig } from '@shared/config/env.config';
import axios from 'axios';

const api = axios.create({
  baseURL: `${getConfig().api.baseUrl}/api/v1/reports`,
});
```

---

## 10. File Size Compliance

### Decision: Component Decomposition

**Rationale**: All files must be <200 lines. Break down large components into smaller, focused components.

**Component Structure**:
- ReportList.tsx (<200 lines) → Main list component
- ReportListItem.tsx (<100 lines) → Individual report item
- ReportViewer.tsx (<200 lines) → Main viewer component
- ReportContent.tsx (<150 lines) → Markdown content rendering
- ReportTOC.tsx (<100 lines) → Table of contents sidebar
- ReportEditor.tsx (<200 lines) → Main editor component
- Widget components (<100 lines each)

---

## Summary of Technology Choices

| Category | Technology | Version | Rationale |
|----------|-----------|---------|-----------|
| Markdown Rendering | react-markdown | Latest | React-native, extensible |
| Markdown Plugins | remark-gfm | Latest | GitHub Flavored Markdown |
| Charts | Visualization Microservice | Existing | No duplication |
| Notifications | react-hot-toast | Latest | Lightweight, themeable |
| HTTP Client | Axios | Existing | Follow existing patterns |
| Styling | Tailwind CSS | Existing | Olorin theme system |
| State Management | React Hooks | Built-in | Simple, no external deps |

---

## Integration Points

1. **Backend API**: `/api/v1/reports` endpoints (already implemented)
2. **Investigation Statistics**: `/api/v1/reports/statistics/investigations` (already implemented)
3. **Visualization Microservice**: Import chart components
4. **Auth**: Use existing `useAuth` hook from core-ui
5. **Event Bus**: Use existing event bus for cross-service communication (optional)

---

## Performance Considerations

1. **Lazy Loading**: Load markdown renderer and widgets only when needed
2. **Memoization**: Memoize widget data fetching to avoid redundant API calls
3. **Virtualization**: Consider virtual scrolling for long report lists (if >100 reports)
4. **Code Splitting**: Split widget components into separate chunks
5. **Debouncing**: Debounce search input to reduce API calls

---

## Accessibility Considerations

1. **Keyboard Navigation**: All interactive elements keyboard accessible
2. **ARIA Labels**: Proper ARIA labels for screen readers
3. **Focus Management**: Focus management for modals and editor
4. **Color Contrast**: Ensure sufficient contrast for text readability
5. **Semantic HTML**: Use proper semantic HTML elements

---

## Security Considerations

1. **XSS Prevention**: react-markdown sanitizes by default
2. **API Authentication**: Use existing auth middleware
3. **Input Validation**: Validate markdown content before saving
4. **CORS**: Backend handles CORS configuration

---

## Testing Strategy

1. **Unit Tests**: Test individual components and hooks
2. **Integration Tests**: Test API integration and widget data fetching
3. **E2E Tests**: Test complete user flows (create, edit, publish, view)
4. **Visual Regression**: Test UI matches reference design

---

## Next Steps

1. ✅ Research complete
2. → Generate data model (Phase 1)
3. → Generate API contracts (Phase 1)
4. → Generate quickstart guide (Phase 1)
5. → Generate tasks (Phase 2)

