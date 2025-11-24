# Tasks: Olorin Marketing Webportal Dark Mode Transformation

**Feature**: 022-olorin-webportal-dark
**Branch**: `022-olorin-webportal-dark`
**Input**: Design documents from `/specs/022-olorin-webportal-dark/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Tests**: Tests are NOT explicitly requested in the feature specification, so test tasks are excluded.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `- [ ] [ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

**Marketing Portal Structure** (from plan.md):
```
olorin-web-portal/
├── src/
│   ├── components/       # Core UI components
│   ├── pages/            # Page components
│   ├── styles/           # CSS files
│   ├── utils/            # Helper utilities
│   └── i18n/             # Internationalization
├── tailwind.config.js    # Tailwind configuration
└── package.json          # Dependencies
```

---

## Phase 1: Setup (Foundation Infrastructure) ✅ COMPLETED

**Purpose**: Project initialization, configuration, and shared utilities

- [X] T001 Verify project structure matches plan.md in olorin-web-portal/
- [X] T002 [P] Create src/styles/glassmorphic.css with glassmorphic utility classes per quickstart.md
- [X] T003 [P] Create src/utils/sharedComponents.ts to centralize shared component imports from olorin-front
- [X] T004 Update src/index.css to import glassmorphic.css

---

## Phase 2: Foundational (Blocking Prerequisites) ✅ COMPLETED

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T005 Update tailwind.config.js with corporate color palette (backgrounds, accents, text, borders, status colors) per data-model.md
- [X] T006 [P] Add backdropBlur configuration to tailwind.config.js (xs: 2px, sm: 4px, md: 12px, lg: 16px, xl: 24px)
- [X] T007 [P] Add animation keyframes to tailwind.config.js (fadeIn, fadeInUp, slideUp, slideDown, scaleIn, pulse-slow)
- [X] T008 Verify shared components are accessible from olorin-front/src/shared/components/ (Modal, CollapsiblePanel, Button, Badge, Card)
- [X] T009 Create .env.example with all required environment variables (EmailJS, feature flags, analytics) per quickstart.md

**✅ Checkpoint PASSED**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Visual Transformation to Dark Glassmorphic Theme (Priority: P1) 🎯 MVP

**Goal**: Transform all pages to dark glassmorphic theme with corporate purple palette

**Independent Test**: Load homepage and verify dark theme colors (#1A0B2E background), glassmorphic effects (backdrop-blur on cards), and purple accents (#A855F7) match React app

**Acceptance Scenarios**:
1. All backgrounds use dark purple/black theme
2. Cards display glassmorphic effects with hover states
3. Corporate purple accents consistently applied
4. Text uses light colors (textPrimary: #F9FAFB, textSecondary: #D8B4FE)

### Core Components Transformation (US1) ✅ IN PROGRESS

- [X] T010 [P] [US1] Transform Header.tsx: Replace bg-white with glass-header class in src/components/Header.tsx
- [X] T011 [P] [US1] Update Header.tsx navigation links: text-secondary-600 → text-corporate-textSecondary with hover:text-corporate-accentPrimary in src/components/Header.tsx
- [X] T012 [P] [US1] Update Header.tsx active link styling: border-corporate-accentPrimary in src/components/Header.tsx
- [X] T013 [P] [US1] Update Header.tsx CTA button: bg-corporate-accentPrimary with hover states in src/components/Header.tsx
- [X] T014 [P] [US1] Transform Footer.tsx: Apply glass-footer class in src/components/Footer.tsx
- [X] T015 [P] [US1] Update Footer.tsx text colors: text-corporate-textSecondary for body, text-corporate-textMuted for links in src/components/Footer.tsx
- [ ] T016 [P] [US1] Update LanguageSelector.tsx with corporate purple styling in src/components/LanguageSelector.tsx
- [ ] T017 [P] [US1] Update ErrorBoundary.tsx with corporate error UI colors in src/components/ErrorBoundary.tsx

### HomePage Transformation (US1)

- [ ] T018 [US1] Refactor HomePage.tsx into section components (file > 200 lines): Create HeroSection.tsx, FeaturesSection.tsx, StatsSection.tsx, BenefitsSection.tsx, CTASection.tsx in src/components/home/
- [ ] T019 [P] [US1] Transform HeroSection.tsx: Apply bg-gradient-to-br from-corporate-bgPrimary via-corporate-bgSecondary to-corporate-bgTertiary in src/components/home/HeroSection.tsx
- [ ] T020 [P] [US1] Update HeroSection.tsx title: text-corporate-textPrimary with animate-fade-in in src/components/home/HeroSection.tsx
- [ ] T021 [P] [US1] Update HeroSection.tsx subtitle: text-corporate-textSecondary with animate-slide-up in src/components/home/HeroSection.tsx
- [ ] T022 [P] [US1] Transform FeaturesSection.tsx cards: Apply glass-card-interactive class with corporate colors in src/components/home/FeaturesSection.tsx
- [ ] T023 [P] [US1] Update FeaturesSection.tsx icon backgrounds: bg-corporate-accentPrimary/20 with backdrop-blur-sm in src/components/home/FeaturesSection.tsx
- [ ] T024 [P] [US1] Transform StatsSection.tsx: bg-corporate-bgSecondary/50 with backdrop-blur-lg in src/components/home/StatsSection.tsx
- [ ] T025 [P] [US1] Update StatsSection.tsx numbers: text-corporate-accentPrimary in src/components/home/StatsSection.tsx
- [ ] T026 [P] [US1] Transform BenefitsSection.tsx with dark theme styling in src/components/home/BenefitsSection.tsx
- [ ] T027 [P] [US1] Transform CTASection.tsx with corporate button colors in src/components/home/CTASection.tsx
- [ ] T028 [US1] Update HomePage.tsx to import and use refactored section components in src/pages/HomePage.tsx

### Other Pages Transformation (US1)

- [ ] T029 [P] [US1] Transform ServicesPage.tsx: Apply dark theme and glassmorphic cards in src/pages/ServicesPage.tsx
- [ ] T030 [P] [US1] Transform AboutPage.tsx: Apply dark theme with corporate colors in src/pages/AboutPage.tsx
- [ ] T031 [P] [US1] Transform NotFoundPage.tsx: Update colors to corporate palette in src/pages/NotFoundPage.tsx
- [ ] T032 [P] [US1] Transform ServerErrorPage.tsx: Update colors to corporate palette in src/pages/ServerErrorPage.tsx

**Checkpoint**: User Story 1 complete - All pages should display dark glassmorphic theme with corporate colors

---

## Phase 4: User Story 2 - Shared Component Library Integration (Priority: P1)

**Goal**: Replace duplicated UI components with shared components from olorin-front

**Independent Test**: Examine component imports and verify Modal, CollapsiblePanel, Button are imported from shared/components, not duplicated

**Acceptance Scenarios**:
1. Modal uses shared Modal.tsx component
2. CollapsiblePanel uses shared component
3. Buttons use shared component with consistent hover states
4. All reusable UI components import from olorin-front/src/shared/components

### Shared Component Integration (US2)

- [ ] T033 [US2] Verify src/utils/sharedComponents.ts exports Modal, CollapsiblePanel, Button, Badge, Card, LoadingSpinner from olorin-front
- [ ] T034 [P] [US2] Update ContactPage.tsx to import Modal from sharedComponents in src/pages/ContactPage.tsx
- [ ] T035 [P] [US2] Update ContactPage.tsx to import Button from sharedComponents in src/pages/ContactPage.tsx
- [ ] T036 [P] [US2] Update FeaturesSection.tsx to import CollapsiblePanel if expandable sections exist in src/components/home/FeaturesSection.tsx
- [ ] T037 [P] [US2] Replace all custom button implementations with shared Button component across all pages
- [ ] T038 [P] [US2] Replace all custom badge implementations with shared Badge component across all pages
- [ ] T039 [P] [US2] Replace all custom card wrappers with shared Card component where appropriate
- [ ] T040 [US2] Remove any duplicate component implementations that are now imported from shared library

**Checkpoint**: User Story 2 complete - All reusable components should be imported from shared library

---

## Phase 5: User Story 3 - Interactive Glassmorphic UI Elements (Priority: P2)

**Goal**: Add interactive expandable panels, smooth hover transitions, and glassmorphic modals

**Independent Test**: Interact with expandable features, hover over cards, trigger modals to verify glassmorphic effects and animations

**Acceptance Scenarios**:
1. Feature cards scale up (scale-105) with 200ms transition on hover
2. Collapsible panels animate smoothly with chevron rotation
3. Contact modal shows backdrop blur (bg-black/60 backdrop-blur-sm)
4. Mobile menu displays glassmorphic background

### Interactive Elements Implementation (US3)

- [ ] T041 [P] [US3] Add CollapsiblePanel to ServicesPage.tsx for expandable service descriptions in src/pages/ServicesPage.tsx
- [ ] T042 [P] [US3] Implement glassmorphic Modal for ContactPage.tsx contact form in src/pages/ContactPage.tsx
- [ ] T043 [P] [US3] Add modal backdrop overlay with bg-black/60 backdrop-blur-sm to ContactPage modal in src/pages/ContactPage.tsx
- [ ] T044 [P] [US3] Verify all glass-card-interactive elements have hover:scale-105 and transition-all duration-200
- [ ] T045 [P] [US3] Add smooth chevron rotation animation to CollapsiblePanel components
- [ ] T046 [P] [US3] Update mobile menu in Header.tsx with glassmorphic background in src/components/Header.tsx
- [ ] T047 [US3] Test all interactive transitions are smooth (200ms) and performant on mobile

**Checkpoint**: User Story 3 complete - All interactive elements should have glassmorphic effects and smooth animations

---

## Phase 6: User Story 4 - Responsive Dark Theme Layout (Priority: P2)

**Goal**: Ensure dark theme maintains consistency and usability across all device sizes

**Independent Test**: Resize browser through breakpoints (sm: 640px, md: 768px, lg: 1024px, xl: 1280px) and verify layout, contrast, and readability

**Acceptance Scenarios**:
1. Mobile (< 640px): Hero stacks vertically with readable text
2. Tablet (768px-1024px): 2-column feature grid with proper spacing
3. Desktop (> 1024px): 3-column layouts with sticky nav
4. All devices maintain WCAG AA contrast (4.5:1 minimum)

### Responsive Layout Implementation (US4)

- [ ] T048 [P] [US4] Add mobile-specific backdrop-blur-sm to glassmorphic.css @media (max-width: 768px) in src/styles/glassmorphic.css
- [ ] T049 [P] [US4] Test HomePage responsive layouts at 5 breakpoints: 375px, 640px, 768px, 1024px, 1280px
- [ ] T050 [P] [US4] Test ServicesPage responsive layouts at 5 breakpoints
- [ ] T051 [P] [US4] Test ContactPage modal responsiveness at mobile and tablet sizes
- [ ] T052 [P] [US4] Verify Header.tsx mobile menu displays correctly with dark theme in src/components/Header.tsx
- [ ] T053 [P] [US4] Test all FeaturesSection.tsx cards display correctly in 1, 2, and 3-column layouts in src/components/home/FeaturesSection.tsx
- [ ] T054 [P] [US4] Verify text contrast ratios meet WCAG AA (4.5:1) on all backgrounds at all breakpoints
- [ ] T055 [US4] Add responsive margin/padding adjustments for mobile readability across all pages

**Checkpoint**: User Story 4 complete - Dark theme should be fully responsive and accessible across all devices

---

## Phase 7: User Story 5 - Corporate Purple Color Palette Application (Priority: P3)

**Goal**: Ensure consistent corporate purple color palette throughout marketing site

**Independent Test**: Use browser DevTools to inspect computed colors and verify they match tailwind.config.js corporate palette

**Acceptance Scenarios**:
1. Primary CTAs use corporate-accentPrimary (#A855F7) with hover (#9333EA)
2. Card borders use corporate-borderPrimary (#6B21A8)
3. Backgrounds alternate between corporate-bgPrimary and corporate-bgSecondary
4. Secondary accents use corporate-accentSecondary (#C084FC)

### Color Consistency Validation (US5)

- [ ] T056 [P] [US5] Audit HomePage.tsx for hardcoded colors and replace with corporate tokens in src/pages/HomePage.tsx and src/components/home/*
- [ ] T057 [P] [US5] Audit ServicesPage.tsx for hardcoded colors and replace with corporate tokens in src/pages/ServicesPage.tsx
- [ ] T058 [P] [US5] Audit ContactPage.tsx for hardcoded colors and replace with corporate tokens in src/pages/ContactPage.tsx
- [ ] T059 [P] [US5] Audit AboutPage.tsx for hardcoded colors and replace with corporate tokens in src/pages/AboutPage.tsx
- [ ] T060 [P] [US5] Audit Header.tsx for hardcoded colors and replace with corporate tokens in src/components/Header.tsx
- [ ] T061 [P] [US5] Audit Footer.tsx for hardcoded colors and replace with corporate tokens in src/components/Footer.tsx
- [ ] T062 [P] [US5] Verify all primary CTAs use bg-corporate-accentPrimary with hover:bg-corporate-accentPrimaryHover
- [ ] T063 [P] [US5] Verify all card borders use border-corporate-borderPrimary
- [ ] T064 [P] [US5] Verify background sections alternate between corporate-bgPrimary and corporate-bgSecondary
- [ ] T065 [US5] Run script to grep for hardcoded color values (#) and replace with corporate tokens

**Checkpoint**: User Story 5 complete - All colors should use corporate palette tokens from tailwind.config.js

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Quality improvements, documentation, and deployment preparation

### Accessibility & Performance

- [ ] T066 [P] Run Lighthouse accessibility audit: Target 90+ score
- [ ] T067 [P] Run Lighthouse performance audit: Target 80+ score
- [ ] T068 [P] Verify WCAG AA contrast ratios (4.5:1) for all text/background combinations
- [ ] T069 [P] Test keyboard navigation through all interactive elements
- [ ] T070 [P] Verify focus indicators visible on dark backgrounds (ring-corporate-accentPrimary)
- [ ] T071 [P] Test with screen reader (VoiceOver/NVDA) for dark theme compatibility
- [ ] T072 [P] Verify reduced motion media query respects user preferences

### Cross-Browser Testing

- [ ] T073 [P] Test glassmorphic effects in Chrome 76+ (backdrop-filter support)
- [ ] T074 [P] Test glassmorphic effects in Firefox 103+
- [ ] T075 [P] Test glassmorphic effects in Safari 9+
- [ ] T076 [P] Test glassmorphic effects in Edge 79+
- [ ] T077 [P] Verify @supports fallback for browsers without backdrop-filter

### Performance Optimization

- [ ] T078 [P] Profile mobile performance (scrolling, animations) using Chrome DevTools
- [ ] T079 [P] Verify bundle size < 200KB gzipped
- [ ] T080 [P] Measure Core Web Vitals: LCP < 2.5s, FID < 100ms, CLS < 0.1
- [ ] T081 [P] Test page load time < 3 seconds (p95)
- [ ] T082 Add CSS containment (contain: layout style paint) to glassmorphic cards if performance issues detected

### Code Quality & Documentation

- [ ] T083 [P] Run ESLint and fix all warnings
- [ ] T084 [P] Run Prettier to format all code
- [ ] T085 [P] Verify all production files are under 200 lines (per project standards)
- [ ] T086 [P] Update README.md with dark theme setup instructions in olorin-web-portal/README.md
- [ ] T087 [P] Create .env.example with all required variables and comments in olorin-web-portal/.env.example
- [ ] T088 Run quickstart.md validation checklist

### Final Validation

- [ ] T089 Visual regression comparison against React app design system
- [ ] T090 Complete all checklist items in quickstart.md Testing Checklist
- [ ] T091 Complete all checklist items in spec.md Compliance Checklist
- [ ] T092 Prepare deployment with screenshots of transformed pages
- [ ] T093 [P] Create deployment guide with environment variables and build steps

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies - can start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 - BLOCKS all user stories
- **Phase 3 (US1)**: Depends on Phase 2 - Can start once foundation complete
- **Phase 4 (US2)**: Depends on Phase 2 - Can start once foundation complete, runs parallel with US1
- **Phase 5 (US3)**: Depends on Phase 2 - Can start once foundation complete, runs parallel with US1/US2
- **Phase 6 (US4)**: Depends on Phase 3 (US1 visual transformation must be complete first)
- **Phase 7 (US5)**: Depends on Phase 3 (US1 visual transformation must be complete first)
- **Phase 8 (Polish)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Visual Transformation - Independent, no dependencies on other stories
- **User Story 2 (P1)**: Shared Components - Independent, can run parallel with US1
- **User Story 3 (P2)**: Interactive Elements - Requires US1 and US2 base components
- **User Story 4 (P2)**: Responsive Layout - Requires US1 visual transformation complete
- **User Story 5 (P3)**: Color Palette - Requires US1 visual transformation complete

### Critical Path

```
Phase 1 → Phase 2 → Phase 3 (US1) → Phase 6 (US4) → Phase 7 (US5) → Phase 8
                  ↘ Phase 4 (US2) ↗ Phase 5 (US3) ↗
```

### Parallel Opportunities

#### Phase 1 (Setup)
- T002, T003 can run in parallel (different files)

#### Phase 2 (Foundational)
- T006, T007 can run in parallel (different config sections)

#### Phase 3 (User Story 1)
- Core Components (T010-T017): All can run in parallel
- HomePage Sections (T019-T027): All can run in parallel after T018
- Other Pages (T029-T032): All can run in parallel

#### Phase 4 (User Story 2)
- All tasks (T034-T039) can run in parallel

#### Phase 5 (User Story 3)
- T041, T042, T043 can run in parallel
- T044, T045, T046 can run in parallel

#### Phase 6 (User Story 4)
- T048, T049, T050, T051, T052, T053, T054 can all run in parallel

#### Phase 7 (User Story 5)
- T056-T064 can all run in parallel (different files)

#### Phase 8 (Polish)
- Most tasks can run in parallel (marked with [P])

---

## Parallel Example: User Story 1 Core Components

```bash
# Launch all core component transformations together:
Task: "Transform Header.tsx: Replace bg-white with glass-header class"
Task: "Update Header.tsx navigation links: text-corporate-textSecondary"
Task: "Update Header.tsx active link styling: border-corporate-accentPrimary"
Task: "Update Header.tsx CTA button: bg-corporate-accentPrimary"
Task: "Transform Footer.tsx: Apply glass-footer class"
Task: "Update Footer.tsx text colors: text-corporate-textSecondary"
Task: "Update LanguageSelector.tsx with corporate purple styling"
Task: "Update ErrorBoundary.tsx with corporate error UI colors"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2 Only)

**Timeline: ~3 days**

1. Complete Phase 1: Setup (0.5 day)
2. Complete Phase 2: Foundational (0.5 day)
3. Complete Phase 3: User Story 1 - Visual Transformation (1.5 days)
4. Complete Phase 4: User Story 2 - Shared Components (0.5 day)
5. **STOP and VALIDATE**: Test visual transformation and shared components independently
6. Deploy/demo if ready

**MVP Deliverable**: Marketing portal with complete dark glassmorphic theme and shared component integration

### Incremental Delivery (Recommended)

**Timeline: ~6 days**

1. **Day 1**: Setup + Foundational → Foundation ready
2. **Day 2-3**: User Story 1 → Test independently → Deploy/Demo (MVP!)
3. **Day 3.5**: User Story 2 → Test independently → Integrate with US1
4. **Day 4**: User Story 3 → Test independently → Deploy/Demo
5. **Day 5**: User Stories 4 + 5 → Test independently → Deploy/Demo
6. **Day 6**: Polish & Testing → Final validation → Production deploy

Each story adds value without breaking previous stories.

### Parallel Team Strategy

With 2-3 developers:

1. **Day 1** (All together): Setup + Foundational
2. **Day 2-3** (Split):
   - Developer A: User Story 1 (Visual Transformation)
   - Developer B: User Story 2 (Shared Components)
3. **Day 3-4** (Split):
   - Developer A: User Story 3 (Interactive Elements)
   - Developer B: User Story 4 (Responsive Layout)
4. **Day 5** (All together): User Story 5 + Polish + Testing

---

## Task Summary

| Phase | Task Count | Can Parallelize | Estimated Time |
|-------|-----------|-----------------|----------------|
| Phase 1: Setup | 4 | 2 tasks | 0.5 day |
| Phase 2: Foundational | 5 | 3 tasks | 0.5 day |
| Phase 3: US1 (Visual) | 23 | 20 tasks | 1.5 days |
| Phase 4: US2 (Shared) | 8 | 7 tasks | 0.5 day |
| Phase 5: US3 (Interactive) | 7 | 6 tasks | 0.5 day |
| Phase 6: US4 (Responsive) | 8 | 7 tasks | 0.5 day |
| Phase 7: US5 (Colors) | 10 | 9 tasks | 0.5 day |
| Phase 8: Polish | 28 | 23 tasks | 1 day |
| **TOTAL** | **93 tasks** | **77 parallelizable** | **6 days** |

### Parallel Opportunities by Story

- **User Story 1**: 20 of 23 tasks can run in parallel (87%)
- **User Story 2**: 7 of 8 tasks can run in parallel (88%)
- **User Story 3**: 6 of 7 tasks can run in parallel (86%)
- **User Story 4**: 7 of 8 tasks can run in parallel (88%)
- **User Story 5**: 9 of 10 tasks can run in parallel (90%)
- **Polish**: 23 of 28 tasks can run in parallel (82%)

### MVP Scope (Recommended First Iteration)

**User Stories 1 + 2** = 31 tasks → ~2.5 days
- Complete visual transformation to dark glassmorphic theme
- Integrate all shared components
- Delivers immediately visible value
- Establishes foundation for remaining stories

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
- **CRITICAL**: All files must stay under 200 lines (per project standards) - T018 specifically addresses this for HomePage.tsx

---

**Generated**: 2025-11-12
**Total Tasks**: 93
**Estimated Timeline**: 6 days (with parallelization)
**MVP Tasks**: 31 (User Stories 1 + 2)
**MVP Timeline**: 2.5 days
