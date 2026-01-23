# Research & Analysis: Investigations Management Microservice

**Phase**: 0 - Research  
**Date**: 2025-01-31  
**Status**: ✅ Complete

## Reference Materials Analyzed

### 1. HTML Reference File
**File**: `/Users/gklainert/Documents/olorin/olorin-investigations-20251108-222707.html`

**Key Features Identified**:
- Card-based grid layout for investigation list
- Search functionality with keyboard shortcut (`/`)
- Status filtering (pending, in-progress, completed, failed, archived)
- Tab-based filtering (All, My Items, In Progress, Completed, Failed, Archived)
- Modal form for creating/editing investigations
- Drawer/sidebar for investigation details
- Phase timeline with progress bars
- Activity log table
- Real-time updates toggle
- Export/Import JSON functionality
- Keyboard shortcuts (`N` for new, `/` for search, `ESC` for close)

**Design Elements**:
- Dark theme with purple accent colors (`--primary: #8b5cf6`)
- Gradient backgrounds
- Glassmorphism effects (backdrop-blur)
- Smooth transitions and animations
- Responsive grid layout

### 2. Existing Olorin Pages

#### Root Page (ShellHomePage.tsx)
- Service cards displayed in grid layout
- Cards link to microservice routes
- Status badges, icons, descriptions
- Hover effects and transitions

#### Investigation Page (InvestigationWizard.tsx, ProgressPage.tsx)
- Dark theme with corporate design tokens
- Tailwind CSS classes
- Error boundaries
- Loading states
- Real-time updates via WebSocket/polling

### 3. Existing Microservices

#### Reporting Microservice
**Structure**:
```
reporting/
├── components/
│   ├── common/ (StatusBadge, TagChip, Toast)
│   ├── ReportList.tsx
│   ├── ReportViewer.tsx
│   └── ReportEditor.tsx
├── hooks/ (useReports, useReportEditor, etc.)
├── services/ (reportService.ts)
├── types/ (reports.ts)
└── ReportingApp.tsx
```

**Patterns**:
- Main App component with routing
- Service layer for API calls
- Custom hooks for state management
- Shared components in common/
- Type definitions in types/

#### RAG Intelligence Microservice
- Similar structure to reporting
- Uses ErrorBoundary
- Lazy loading with Suspense
- Integration with event bus

## Technical Stack Analysis

### Frontend Stack
- **Framework**: React 18.2.0 with TypeScript 4.9.5
- **Styling**: Tailwind CSS 3.3 (NO Material-UI)
- **Routing**: React Router 6.11
- **State Management**: React Hooks + Context
- **HTTP Client**: Axios 1.4
- **Notifications**: react-hot-toast 2.6
- **Build**: Webpack 5 with Module Federation
- **Testing**: Jest + React Testing Library, Playwright

### Backend Stack
- **Framework**: FastAPI (Python 3.11)
- **Database**: PostgreSQL via SQLAlchemy
- **API**: RESTful endpoints at `/api/investigations`
- **Authentication**: JWT Bearer tokens
- **WebSocket**: Socket.IO for real-time updates

### Design System
- **Colors**: Dark theme with purple accents
- **Tokens**: `corporate-accentPrimary`, `corporate-bgSecondary`, `corporate-borderPrimary`
- **Typography**: System fonts (ui-sans-serif)
- **Spacing**: Tailwind spacing scale
- **Components**: Shared components in `@shared/components`

## Backend API Analysis

### Existing Endpoints
Based on `olorin-server/app/router/investigations_router.py`:

1. **POST /api/investigation** - Create investigation
2. **GET /api/investigation/{id}** - Get investigation
3. **PUT /api/investigation/{id}** - Update investigation
4. **DELETE /api/investigation/{id}** - Delete investigation
5. **GET /api/investigations** - List all investigations
6. **DELETE /api/investigation** - Bulk delete (array of IDs)
7. **DELETE /api/investigations/delete_all** - Delete all (admin)

### Data Models
From `app/models/api_models.py`:
- `InvestigationCreate` - Request model for creation
- `InvestigationOut` - Response model
- `InvestigationUpdate` - Request model for updates

### Investigation Structure
```typescript
interface Investigation {
  id: string;
  name?: string;
  owner?: string;
  description?: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed' | 'archived';
  created: string; // ISO 8601
  updated: string; // ISO 8601
  riskModel?: string;
  sources?: string[];
  tools?: string[];
  from?: string; // ISO 8601
  to?: string; // ISO 8601
  progress?: number; // 0-100
  phases?: InvestigationPhase[];
}

interface InvestigationPhase {
  name: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  pct: number; // 0-100
  started?: string; // ISO 8601
  ended?: string; // ISO 8601
  summary?: string;
}
```

## Integration Points

### 1. Shell Integration
- Add card to `serviceLinks` array in `src/shell/constants/serviceData.ts`
- Add route in `src/shell/App.tsx` for `/investigations-management`
- Lazy load with Suspense and ErrorBoundary

### 2. Backend Integration
- Use existing `/api/investigations` endpoints
- No new backend endpoints required
- WebSocket integration for real-time updates (if available)

### 3. Shared Components
- `@shared/components/ErrorBoundary` - Error handling
- `@shared/components/LoadingSpinner` - Loading states
- `@shared/components/Card` - Card component (if applicable)
- `@shared/events/UnifiedEventBus` - Event bus for inter-service communication

## Design System Mapping

### Color Palette
- Background: `bg-black` (dark theme)
- Panels: `bg-black/40 backdrop-blur-md`
- Borders: `border-corporate-borderPrimary/40`
- Accent: `text-corporate-accentPrimary` (purple)
- Success: `text-corporate-success` (green)
- Warning: `text-corporate-warning` (yellow)
- Error: `text-corporate-error` (red)

### Component Patterns
- Cards: `bg-black/40 backdrop-blur-md border-2 border-corporate-accentPrimary/40 rounded-lg`
- Buttons: `bg-gradient-to-r from-corporate-accentPrimary to-corporate-accentSecondary`
- Modals: `bg-black/40 backdrop-blur-md border border-corporate-borderPrimary`
- Drawers: Fixed right-side panel with slide-in animation

## Key Decisions

1. **Microservice Port**: Will use port 3007 (next available after existing services)
2. **Module Federation**: Expose `InvestigationsManagementApp` as remote module
3. **State Management**: React hooks + Context (no Redux/Zustand needed)
4. **Real-time Updates**: Polling initially, WebSocket if backend supports
5. **Form Validation**: Client-side validation with Zod or native HTML5
6. **Export Format**: JSON (matches reference HTML)
7. **Keyboard Shortcuts**: Use `useEffect` with keyboard event listeners

## Constraints & Considerations

### File Size Limit
- All components must be <200 lines
- Break down large components into smaller sub-components
- Extract hooks and utilities to separate files

### Styling Constraints
- Tailwind CSS only (no Material-UI)
- Use corporate design tokens
- Match existing Olorin look and feel

### Performance Requirements
- Page load <2 seconds
- Filter/search updates <500ms
- Real-time updates <1s latency
- Responsive on mobile (320px+), tablet (768px+), desktop (1024px+)

### Browser Support
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Open Questions Resolved

1. ✅ **Backend API**: Use existing `/api/investigations` endpoints
2. ✅ **Real-time Updates**: Polling initially, upgrade to WebSocket later
3. ✅ **Export Format**: JSON (matches reference)
4. ✅ **Microservice Pattern**: Follow reporting/rag-intelligence structure
5. ✅ **Design System**: Use Tailwind CSS with corporate tokens

## Next Steps

1. Define data models (Phase 1)
2. Create API contracts (Phase 1)
3. Design component structure (Phase 1)
4. Generate task breakdown (Phase 2)

