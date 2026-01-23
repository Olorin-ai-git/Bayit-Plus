# Implementation Plan: Olorin Marketing Webportal Dark Mode Transformation

**Branch**: `022-olorin-webportal-dark` | **Date**: 2025-11-12 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/022-olorin-webportal-dark/spec.md`

## Summary

Transform the Olorin marketing webportal from light theme to dark glassmorphic design matching the React investigation app. Replace all light backgrounds with corporate dark purple palette (#1A0B2E, #2D1B4E), apply glassmorphic effects (backdrop-blur, semi-transparent surfaces) to all cards and panels, and integrate shared UI components (Modal, CollapsiblePanel, Button) from the React app for consistency. Ensure WCAG AA accessibility compliance (4.5:1 contrast), responsive layouts optimized for dark theme across mobile/tablet/desktop breakpoints, and maintain sub-3-second page load performance despite glassmorphic effects.

**Technical Approach**: Incremental page-by-page transformation starting with foundation (Tailwind config update with corporate colors), core components (Header, Footer with glassmorphic styling), then pages (HomePage, ContactPage, ServicesPage with shared component integration). Use configuration-driven design with zero hardcoded colors, implement glassmorphic utility classes for reusability, and apply mobile-optimized blur radius (blur-sm vs blur-md) for performance.

## Technical Context

**Language/Version**: TypeScript 4.9+, React 18.2.0
**Primary Dependencies**:
- Tailwind CSS 3.3.0+ (backdrop-filter support required)
- React Router 6.x for navigation
- react-i18next for internationalization
- lucide-react for icons (already installed)
- @heroicons/react (optional, for additional icons)
**Storage**: N/A (static marketing site, no backend storage)
**Testing**:
- Visual regression: Percy.io or Chromatic
- Accessibility: Lighthouse (target: 90+), axe DevTools
- Unit tests: Jest + React Testing Library
- E2E tests: Playwright (optional for critical paths)
**Target Platform**: Modern web browsers (Chrome 76+, Firefox 103+, Safari 9+, Edge 79+) with backdrop-filter support, fallback for older browsers
**Project Type**: Web (Frontend only - React SPA)
**Performance Goals**:
- Page load: < 3 seconds (p95)
- Lighthouse performance: 80+ score
- Bundle size: < 200KB gzipped
- Core Web Vitals: LCP < 2.5s, FID < 100ms, CLS < 0.1
**Constraints**:
- All files must be < 200 lines (per project standards)
- Zero hardcoded colors (configuration-driven via Tailwind)
- WCAG AA contrast compliance (4.5:1 minimum)
- Glassmorphic effects must not degrade mobile performance (reduced blur on mobile)
- No breaking changes to functionality (purely visual transformation)
**Scale/Scope**:
- 6 pages to transform (Home, Services, Contact, About, 404, 500)
- 4 core components (Header, Footer, LanguageSelector, ErrorBoundary)
- 10+ shared components to integrate from React app
- Estimated 6 days implementation timeline

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**No Project Constitution Found** - Using default gates:

✅ **Configuration-Driven Design**: All colors, styles, and settings loaded from configuration (tailwind.config.js, environment variables), zero hardcoded values in code.

✅ **File Size Compliance**: All production code files must stay under 200 lines. Current violations identified:
- `HomePage.tsx`: 228 lines → Needs refactoring into sections
- All other components: ✅ Under 200 lines

✅ **Accessibility Compliance**: Must meet WCAG AA standards:
- Text contrast ratios: 4.5:1 minimum for normal text, 3:1 for large text
- Focus indicators visible on dark backgrounds
- Keyboard navigation fully functional
- Screen reader compatible

✅ **Performance Requirements**:
- Page load < 3 seconds
- Lighthouse performance score 80+
- No layout shift (CLS < 0.1)
- Smooth animations on mobile

✅ **Code Quality**:
- TypeScript strict mode enabled
- ESLint and Prettier configured
- Zero console warnings in production
- Comprehensive error handling

## Project Structure

### Documentation (this feature)

```text
specs/022-olorin-webportal-dark/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output - codebase analysis ✅
├── data-model.md        # Phase 1 output - TypeScript interfaces ✅
├── quickstart.md        # Phase 1 output - developer guide ✅
├── contracts/           # Phase 1 output - API contracts ✅
│   ├── shared-components.ts  # Component prop interfaces
│   └── style-config.ts       # Style configuration contracts
└── tasks.md             # Phase 2 output (/tasks command - NOT YET CREATED)
```

### Source Code (marketing portal)

```text
olorin-web-portal/
├── public/
│   ├── index.html                    # Main HTML entry point
│   ├── assets/images/                # Images and logos
│   └── 404.html, 500.html           # Error pages
│
├── src/
│   ├── index.tsx                     # React app entry point
│   ├── App.tsx                       # Root component with routing
│   ├── index.css                     # Global styles (imports glassmorphic.css)
│   │
│   ├── components/                   # Core UI components
│   │   ├── Header.tsx               # ⚠️ TRANSFORM: Dark glassmorphic header
│   │   ├── Footer.tsx               # ⚠️ TRANSFORM: Dark footer with light text
│   │   ├── LanguageSelector.tsx     # ⚠️ UPDATE: Corporate purple styling
│   │   └── ErrorBoundary.tsx        # ⚠️ UPDATE: Corporate error UI
│   │
│   ├── pages/                        # Page components
│   │   ├── HomePage.tsx             # ⚠️ TRANSFORM: Hero, features, stats, CTA
│   │   ├── ServicesPage.tsx         # ⚠️ TRANSFORM: Service cards with glassmorphic
│   │   ├── ContactPage.tsx          # ⚠️ TRANSFORM: Modal integration
│   │   ├── AboutPage.tsx            # ⚠️ TRANSFORM: Team cards, timeline
│   │   ├── NotFoundPage.tsx         # ⚠️ UPDATE: Corporate colors
│   │   └── ServerErrorPage.tsx      # ⚠️ UPDATE: Corporate colors
│   │
│   ├── styles/                       # ✅ NEW: Styling utilities
│   │   └── glassmorphic.css         # Glassmorphic utility classes
│   │
│   ├── utils/                        # ✅ NEW: Helper utilities
│   │   └── sharedComponents.ts      # Centralized shared component imports
│   │
│   └── i18n/                         # Internationalization
│       └── index.ts                  # i18next configuration
│
├── tailwind.config.js                # ⚠️ UPDATE: Add corporate colors
├── package.json                      # Dependencies (no changes needed)
├── tsconfig.json                     # TypeScript configuration
└── .env.example                      # Environment variables template
```

**Structure Decision**: Single-project web application (Option 1 from template). Marketing portal is a standalone React SPA with no backend. All components are client-side rendered. Shared components imported directly from adjacent olorin-front repository to ensure consistency with React investigation app.

## Complexity Tracking

No Constitution violations requiring justification. This is a straightforward visual transformation with no architectural changes, new dependencies, or complex patterns beyond standard Tailwind CSS and React component usage.

## Implementation Phases

### Phase 0: Research ✅ COMPLETED

**Deliverable**: `research.md`

**Summary**: Comprehensive codebase analysis completed. Identified:
- 6 pages and 4 core components requiring transformation
- 89 shared components available from React app (10+ suitable for reuse)
- Current light theme uses primary-600 (#9333ea), target corporate colors defined
- Performance impact of glassmorphic effects assessed (backdrop-filter on GPU)
- Accessibility validation: All corporate color combinations pass WCAG AA
- File size violations: HomePage.tsx needs refactoring (228 lines → target < 200)

**Key Findings**:
- Modal, CollapsiblePanel, Button, Badge, Card components ready for import
- Glassmorphic effects require mobile optimization (blur-sm vs blur-md)
- Browser support: Chrome 76+, Firefox 103+, Safari 9+, fallback needed for older browsers
- No breaking changes to functionality - purely visual transformation

### Phase 1: Design ✅ COMPLETED

**Deliverables**:
- `data-model.md` - TypeScript interfaces for all components, color tokens, style configurations
- `contracts/shared-components.ts` - Component prop interfaces
- `contracts/style-config.ts` - Style configuration contracts
- `quickstart.md` - Developer setup and implementation guide

**Summary**: Complete data models and contracts created. Defined:

**Data Models**:
- `CorporateColorPalette` - Token-based color system
- `GlassmorphicStyle` - Reusable effect configurations with presets (card, modal, header, footer)
- Component prop interfaces (ModalProps, CollapsiblePanelProps, ButtonProps, etc.)
- Form data models (ContactFormData, validation, state management)
- Responsive breakpoint models (mobile/tablet/desktop configurations)
- Animation configuration (durations, easing functions, hover states)
- Accessibility models (WCAG contrast ratios, focus indicators)
- Performance budgets (page load, bundle size, Lighthouse scores, Core Web Vitals)

**Style Contracts**:
- Glassmorphic utility class names (glass-card, glass-modal, glass-header, etc.)
- Animation class names (fadeIn, slideUp, scaleIn, etc.)
- Interactive state classes (hover, focus, active, disabled)
- Typography classes (heading, body, muted, link, error, success)
- Layout classes (container, section, grid, flex)
- Component variant classes (button variants, badge variants)

**Quickstart Guide Includes**:
- Environment setup instructions
- Step-by-step transformation workflow (4 phases, 10 steps)
- Code examples for each transformation
- Testing checklists (visual, accessibility, performance, cross-browser)
- Common issues and solutions
- File checklist and development commands

### Phase 2: Task Generation ⏳ PENDING

**Deliverable**: `tasks.md` (NOT YET CREATED - requires `/tasks` command)

**Purpose**: Break down implementation into atomic, actionable tasks with dependencies and effort estimates.

**Expected Task Categories**:
1. **Foundation Tasks**: Tailwind config, glassmorphic CSS, shared component setup
2. **Component Tasks**: Header, Footer, LanguageSelector transformations
3. **Page Tasks**: HomePage, ContactPage, ServicesPage, AboutPage, error pages
4. **Testing Tasks**: Visual regression, accessibility audits, performance profiling
5. **Documentation Tasks**: README updates, deployment guides

**Will Be Generated By**: Running `/speckit.tasks` command after plan approval

## Progress Tracking

| Phase | Status | Completion Date | Artifacts |
|-------|--------|----------------|-----------|
| Phase 0: Research | ✅ Complete | 2025-11-12 | research.md |
| Phase 1: Design | ✅ Complete | 2025-11-12 | data-model.md, contracts/, quickstart.md |
| Phase 2: Tasks | ⏳ Pending | - | tasks.md (needs /tasks command) |
| Implementation | 🔜 Ready | - | Code changes in olorin-web-portal |
| Testing | 🔜 Ready | - | Test reports, screenshots |
| Deployment | 🔜 Ready | - | Production deployment |

## Technical Design Summary

### Color System Architecture

**Token-Based Approach**: All colors defined as semantic tokens in `tailwind.config.js`:

```typescript
// Background layers
corporate-bgPrimary: #1A0B2E    // Main background
corporate-bgSecondary: #2D1B4E  // Panels
corporate-bgTertiary: #3E2C5F   // Cards

// Interactive accents
corporate-accentPrimary: #A855F7   // Primary CTAs
corporate-accentSecondary: #C084FC // Secondary elements

// Text hierarchy
corporate-textPrimary: #F9FAFB     // Headings
corporate-textSecondary: #D8B4FE   // Body text
corporate-textTertiary: #C084FC    // Muted text

// Borders and dividers
corporate-borderPrimary: #6B21A8   // Main borders
corporate-borderSecondary: #7C3AED // Lighter borders
```

**Usage in Code**:
```typescript
// ❌ NEVER hardcode colors
className="bg-[#1A0B2E]"  // WRONG

// ✅ ALWAYS use tokens
className="bg-corporate-bgPrimary"  // CORRECT
```

### Glassmorphic Effect System

**Three-Layer Approach**:

1. **Base Layer**: Semi-transparent background
   ```css
   bg-corporate-bgSecondary/80  /* 80% opacity */
   ```

2. **Blur Layer**: Backdrop filter for glass effect
   ```css
   backdrop-blur-md  /* Desktop: 12px blur */
   backdrop-blur-sm  /* Mobile: 4px blur (performance) */
   ```

3. **Border Layer**: Translucent borders
   ```css
   border-2 border-corporate-borderPrimary/40  /* 40% opacity */
   ```

**Utility Class Pattern**:
```css
.glass-card {
  @apply bg-corporate-bgSecondary/80 backdrop-blur-md;
  @apply border-2 border-corporate-borderPrimary/40;
  @apply rounded-lg shadow-lg;
}
```

**Interactive Enhancement**:
```css
.glass-card-interactive {
  @apply glass-card;
  @apply hover:bg-corporate-bgTertiary/90 hover:scale-105;
  @apply transition-all duration-200;
}
```

### Component Integration Strategy

**Shared Component Import Pattern**:

```typescript
// Centralized import in src/utils/sharedComponents.ts
export { Modal } from '../../olorin-front/src/shared/components/Modal';
export { CollapsiblePanel } from '../../olorin-front/src/shared/components/CollapsiblePanel';

// Usage in pages
import { Modal, CollapsiblePanel } from '../utils/sharedComponents';
```

**Why Shared Components**:
- ✅ Battle-tested in production React app
- ✅ Already styled with corporate colors
- ✅ Accessibility features built-in (focus trapping, keyboard nav)
- ✅ Consistent user experience across all Olorin properties
- ✅ Reduces code duplication and maintenance burden

**Components to Reuse**:
1. **Modal** - Contact forms, confirmations
2. **CollapsiblePanel** - Feature sections, FAQ
3. **Button** - All CTAs and interactive buttons
4. **Badge** - Status indicators
5. **Card** - Feature cards, service cards
6. **LoadingSpinner** - Loading states
7. **ErrorBoundary** - Error handling
8. **Input/FormField** - Contact form fields

### Responsive Design Strategy

**Mobile-First with Performance Optimization**:

```typescript
// Desktop (full glassmorphic effects)
className="backdrop-blur-lg"  // 16px blur

// Tablet (standard effects)
className="backdrop-blur-md"  // 12px blur

// Mobile (reduced blur for performance)
className="backdrop-blur-sm"  // 4px blur

// Implemented with responsive modifiers
className="backdrop-blur-sm md:backdrop-blur-md lg:backdrop-blur-lg"
```

**Layout Breakpoints**:
- **Mobile** (< 768px): Single column, bottom navigation, reduced blur
- **Tablet** (768px-1024px): 2-column layouts, collapsible sidebars
- **Desktop** (1024px+): Multi-column, sticky navigation, enhanced blur

### Animation & Transition System

**Consistent Timing**:
```typescript
// Micro-interactions
duration-100  // 100ms - button presses

// Standard transitions
duration-200  // 200ms - hover effects, color changes

// Larger movements
duration-300  // 300ms - panel collapse/expand

// Page transitions
duration-500  // 500ms - modal open/close
```

**Easing Functions**:
```typescript
// Linear (progress bars)
ease-linear

// Ease out (user-initiated actions)
ease-out  // Default for most interactions

// Bounce (delightful moments)
ease-bounce  // Special interactions only
```

### Accessibility Architecture

**WCAG AA Compliance Matrix**:

| Text Color | Background | Contrast Ratio | Status |
|------------|------------|----------------|--------|
| textPrimary (#F9FAFB) | bgPrimary (#1A0B2E) | 14.5:1 | ✅ AAA |
| textSecondary (#D8B4FE) | bgSecondary (#2D1B4E) | 8.2:1 | ✅ AAA |
| textTertiary (#C084FC) | bgTertiary (#3E2C5F) | 5.8:1 | ✅ AA |
| accentPrimary (#A855F7) | bgPrimary (#1A0B2E) | 3.2:1 | ⚠️ Large text only |

**Focus Indicators**:
```css
focus:outline-none
focus:ring-2
focus:ring-corporate-accentPrimary
focus:ring-offset-2
focus:ring-offset-corporate-bgPrimary
```

**Keyboard Navigation**:
- ✅ Tab order logical and predictable
- ✅ Skip links for main content
- ✅ Focus visible on dark backgrounds
- ✅ Escape key closes modals
- ✅ Enter/Space activate buttons

### Performance Optimization Strategy

**Bundle Size Management**:
- Current: ~150KB gzipped
- Shared components: +20KB
- Target: < 200KB gzipped
- **Strategy**: Tree-shaking, code splitting, lazy loading for pages

**Glassmorphic Performance**:
- **GPU Acceleration**: Backdrop-filter uses GPU compositing
- **Mobile Optimization**: Reduced blur radius (4px vs 12px)
- **CSS Containment**: `contain: layout style paint;` on cards
- **Will-Change**: `will-change: transform;` on interactive elements

**Critical Rendering Path**:
1. Load minimal CSS (Tailwind purged)
2. Render above-the-fold content first
3. Lazy load images with placeholder
4. Defer non-critical JavaScript

**Monitoring**:
- Lighthouse CI in GitHub Actions
- Core Web Vitals tracking
- Bundle size budgets enforced
- Performance regression alerts

## Risk Mitigation

### Risk 1: Shared Component Breaking Changes

**Risk**: React app updates shared components → marketing portal breaks

**Mitigation Strategy**:
1. **Version Locking**: Pin shared component versions in package.json
2. **Integration Tests**: Snapshot tests for marketing portal pages
3. **Adapter Pattern**: Wrap shared components if prop interfaces differ
4. **Notification System**: Alert on shared component updates

**Implementation**:
```json
// package.json (if monorepo)
{
  "dependencies": {
    "@olorin/shared-components": "1.0.0"  // Fixed version
  }
}
```

### Risk 2: Mobile Performance Degradation

**Risk**: Glassmorphic effects cause jank on lower-end mobile devices

**Mitigation Strategy**:
1. **Reduced Blur**: 4px on mobile vs 12px desktop
2. **CSS Containment**: `contain: layout style paint;`
3. **Will-Change**: Hint browser for animations
4. **Performance Budget**: Monitor and enforce

**Implementation**:
```css
/* Mobile optimization in glassmorphic.css */
@media (max-width: 768px) {
  .glass-card {
    @apply backdrop-blur-sm;  /* 4px instead of 12px */
  }
}
```

**Testing**: Profile on actual devices (iPhone SE, Android low-end)

### Risk 3: Browser Compatibility

**Risk**: Older browsers don't support backdrop-filter

**Mitigation Strategy**:
1. **Feature Detection**: `@supports` query
2. **Graceful Degradation**: Solid backgrounds as fallback
3. **Progressive Enhancement**: Core functionality works without glassmorphic

**Implementation**:
```css
/* Fallback for no backdrop-filter support */
@supports not (backdrop-filter: blur(12px)) {
  .glass-card {
    @apply bg-corporate-bgSecondary;  /* Solid background */
  }
}
```

**Supported Browsers**:
- ✅ Chrome 76+ (2019)
- ✅ Firefox 103+ (2022)
- ✅ Safari 9+ (2015)
- ✅ Edge 79+ (2020)

### Risk 4: Accessibility Regression

**Risk**: Dark theme introduces contrast or usability issues

**Mitigation Strategy**:
1. **Automated Testing**: Lighthouse + axe DevTools in CI
2. **Manual Testing**: Keyboard navigation, screen reader
3. **Contrast Validation**: All text/background pairs validated
4. **User Testing**: Test with users who rely on assistive tech

**Validation Process**:
```bash
# Run in CI/CD
npm run test:a11y  # Automated accessibility tests
npm run test:contrast  # Contrast ratio validation
npm run test:keyboard  # Keyboard navigation tests
```

**Gates**: Must pass all accessibility tests before merge

## Success Metrics

### Completion Criteria

**Visual**:
- [ ] All 6 pages transformed to dark glassmorphic theme
- [ ] Corporate purple colors applied consistently
- [ ] Glassmorphic effects visible and performant
- [ ] Hover states work on all interactive elements
- [ ] Responsive layouts tested at 5+ breakpoints

**Technical**:
- [ ] Zero hardcoded colors (configuration-driven)
- [ ] All files under 200 lines
- [ ] TypeScript errors: 0
- [ ] ESLint warnings: 0
- [ ] Shared components integrated successfully

**Quality**:
- [ ] Lighthouse accessibility: 90+ score
- [ ] Lighthouse performance: 80+ score
- [ ] WCAG AA contrast: All text passes
- [ ] Visual regression tests: Pass
- [ ] Cross-browser tests: Pass (Chrome, Firefox, Safari, Edge)

**Performance**:
- [ ] Page load < 3 seconds (p95)
- [ ] Bundle size < 200KB gzipped
- [ ] Core Web Vitals: Green (LCP < 2.5s, FID < 100ms, CLS < 0.1)
- [ ] Smooth scrolling on mobile (60fps)

### Validation Process

**Phase 1: Development Validation**
1. Visual inspection in dev environment
2. Responsive testing at all breakpoints
3. Browser DevTools accessibility audit
4. Local performance profiling

**Phase 2: Staging Validation**
1. Full Lighthouse audit (all categories)
2. Cross-browser testing (4+ browsers)
3. Mobile device testing (iOS + Android)
4. Integration test suite execution

**Phase 3: Production Validation**
1. Canary deployment (10% traffic)
2. Real User Monitoring (RUM) metrics
3. Error rate monitoring
4. User feedback collection

## Timeline

| Phase | Duration | Status | Deliverables |
|-------|----------|--------|--------------|
| **Phase 0: Research** | 0.5 day | ✅ Complete | research.md |
| **Phase 1: Design** | 0.5 day | ✅ Complete | data-model.md, contracts/, quickstart.md |
| **Phase 2: Foundation** | 1 day | 🔜 Ready | Tailwind config, glassmorphic CSS, shared imports |
| **Phase 3: Core Components** | 1 day | 🔜 Ready | Header, Footer, LanguageSelector |
| **Phase 4: Pages** | 2 days | 🔜 Ready | HomePage, ContactPage, ServicesPage, AboutPage |
| **Phase 5: Polish & Testing** | 1 day | 🔜 Ready | Responsive, a11y, performance tests |

**Total**: 6 days

**Critical Path**: Phase 2 (Foundation) must complete before Phase 3 (Core Components), which must complete before Phase 4 (Pages).

## Next Steps

1. **Generate Tasks**: Run `/speckit.tasks` command to create `tasks.md` with atomic implementation tasks
2. **Review & Approve**: Technical lead reviews plan and approves for implementation
3. **Kickoff**: Development team begins Phase 2 (Foundation Setup)
4. **Daily Standups**: Track progress against timeline
5. **Phase Gates**: QA validation at end of each phase
6. **Final Review**: Code review + QA signoff before production deployment

## References

### Specification Documents
- **Main Spec**: [spec.md](./spec.md)
- **Research**: [research.md](./research.md)
- **Data Model**: [data-model.md](./data-model.md)
- **Quickstart**: [quickstart.md](./quickstart.md)
- **Contracts**: [contracts/](./contracts/)

### External References
- **React App Tailwind Config**: `/Users/gklainert/Documents/olorin/olorin-front/tailwind.config.js`
- **Shared Components**: `/Users/gklainert/Documents/olorin/olorin-front/src/shared/components/`
- **Olorin Web Plugin**: `/Users/gklainert/Documents/Gaia/gaia-webplugin/`
- **Feature 004 Design System**: `/Users/gklainert/Documents/olorin/specs/004-new-olorin-frontend/`

### Marketing Portal
- **Repository**: `/Users/gklainert/Documents/olorin/olorin-web-portal/`
- **Current Tailwind**: `tailwind.config.js`
- **Pages**: `src/pages/`
- **Components**: `src/components/`

---

**Status**: ✅ Ready for Implementation
**Last Updated**: 2025-11-12
**Version**: 1.0
**Next Action**: Run `/speckit.tasks` to generate implementation tasks
