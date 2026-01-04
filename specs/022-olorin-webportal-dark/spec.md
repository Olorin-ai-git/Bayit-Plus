# Feature Specification: Olorin Marketing Webportal Dark Mode Transformation

**Feature Branch**: `022-olorin-webportal-dark`
**Created**: 2025-11-12
**Status**: Draft
**Input**: User description: "olorin webportal dark. examine the olorin webportal (marketing portal). I want you to modify each and every component to match the olorin REACT web app , with the same style, glassmorphic look, corporate purple colors, expanders, modals, etc all in dark mode. if needed reuse components that already exists in the React web app and make them shared between the web portals."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Visual Transformation to Dark Glassmorphic Theme (Priority: P1)

A marketing visitor lands on the Olorin.ai homepage and immediately experiences the premium, modern dark glassmorphic interface with corporate purple accents matching the main application.

**Why this priority**: The visual transformation establishes brand consistency and creates the professional "wow factor" critical for converting visitors. This is the foundation that all other changes build upon.

**Independent Test**: Can be fully tested by loading the homepage and verifying dark theme colors, glassmorphic effects on cards/panels, and purple accent colors match the React app design system (corporate-bgPrimary: #1A0B2E, corporate-accentPrimary: #A855F7).

**Acceptance Scenarios**:

1. **Given** visitor loads homepage, **When** page renders, **Then** all backgrounds use dark purple/black theme (#1A0B2E primary, #2D1B4E secondary)
2. **Given** visitor views feature cards, **When** hovering over cards, **Then** cards display glassmorphic effects with backdrop-blur and semi-transparent backgrounds
3. **Given** visitor scrolls through page, **When** viewing all sections, **Then** corporate purple accents (#A855F7) are consistently applied to CTAs, borders, and highlights
4. **Given** visitor views text content, **When** reading, **Then** text uses appropriate light colors (textPrimary: #F9FAFB, textSecondary: #D8B4FE)

---

### User Story 2 - Shared Component Library Integration (Priority: P1)

The marketing portal reuses proven UI components from the React investigation app (modals, collapsible panels, buttons) ensuring consistency and reducing code duplication.

**Why this priority**: Code reuse reduces maintenance burden and ensures consistent user experience across all Olorin properties. This is essential infrastructure.

**Independent Test**: Can be fully tested by examining component imports and verifying components like Modal, CollapsiblePanel, and WizardButton are imported from shared/components rather than duplicated.

**Acceptance Scenarios**:

1. **Given** modal needs to display contact form, **When** modal component is rendered, **Then** it uses shared Modal.tsx component with corporate dark styling
2. **Given** features section displays, **When** user clicks expandable content, **Then** CollapsiblePanel component from shared library is used
3. **Given** CTA buttons are clicked, **When** rendered, **Then** buttons use shared component with consistent hover states (brightness-110, scale-105)
4. **Given** developer examines imports, **When** checking component sources, **Then** all reusable UI components import from olorin-front/src/shared/components

---

###  User Story 3 - Interactive Glassmorphic UI Elements (Priority: P2)

Marketing content features interactive expandable panels, smooth hover transitions, and glassmorphic modals that enhance engagement and provide modern UX.

**Why this priority**: Interactivity keeps visitors engaged longer and creates memorable brand impression, directly supporting conversion goals.

**Independent Test**: Can be fully tested by interacting with expandable features sections, hovering over cards, and triggering modals to verify glassmorphic effects and animations.

**Acceptance Scenarios**:

1. **Given** feature cards on homepage, **When** user hovers, **Then** card scales up (scale-105) with smooth 200ms transition
2. **Given** "Learn More" sections exist, **When** user clicks to expand, **Then** collapsible panel smoothly animates open with chevron rotation
3. **Given** contact form is triggered, **When** modal opens, **Then** backdrop shows blur effect with dark overlay (bg-black/60 backdrop-blur-sm)
4. **Given** navigation menu on mobile, **When** opened, **Then** menu displays glassmorphic background with corporate border colors

---

### User Story 4 - Responsive Dark Theme Layout (Priority: P2)

The marketing portal maintains perfect visual consistency and usability across all device sizes (mobile, tablet, desktop) with dark theme optimized for each breakpoint.

**Why this priority**: Mobile traffic represents significant portion of visitors; responsive dark design ensures no visitor sees broken or poorly contrasted layouts.

**Independent Test**: Can be fully tested by resizing browser through all breakpoints (sm: 640px, md: 768px, lg: 1024px, xl: 1280px) and verifying layout, contrast, and readability.

**Acceptance Scenarios**:

1. **Given** mobile visitor (< 640px), **When** viewing homepage, **Then** hero section stacks vertically with readable text contrast on dark background
2. **Given** tablet visitor (768px-1024px), **When** viewing features grid, **Then** 2-column layout displays with proper glassmorphic card spacing
3. **Given** desktop visitor (> 1024px), **When** viewing full page, **Then** 3-column layouts activate with sticky sidebar navigation if applicable
4. **Given** any device size, **When** viewing dark backgrounds, **Then** text maintains WCAG AA contrast ratio (4.5:1 minimum)

---

### User Story 5 - Corporate Purple Color Palette Application (Priority: P3)

All UI elements consistently use the Olorin corporate purple color palette replacing the current light theme colors throughout the marketing site.

**Why this priority**: Consistent brand colors reinforce professional identity and create cohesive experience, but can be applied after structural changes.

**Independent Test**: Can be fully tested by using browser DevTools to inspect computed colors and verify they match the corporate palette defined in tailwind.config.js.

**Acceptance Scenarios**:

1. **Given** primary CTA buttons, **When** rendered, **Then** background uses corporate-accentPrimary (#A855F7) with hover state (#9333EA)
2. **Given** card borders, **When** displayed, **Then** borders use corporate-borderPrimary (#6B21A8) color
3. **Given** background sections, **When** page loads, **Then** backgrounds alternate between corporate-bgPrimary (#1A0B2E) and corporate-bgSecondary (#2D1B4E)
4. **Given** secondary accents, **When** displayed, **Then** secondary elements use corporate-accentSecondary (#C084FC)

---

### Edge Cases

- What happens when user switches from light to dark system theme while viewing portal?
  - Portal should maintain dark theme regardless of system preference (or provide manual toggle if requested)

- How does system handle glassmorphic effects on browsers that don't support backdrop-filter?
  - Gracefully degrade to solid semi-transparent backgrounds with appropriate fallback colors

- What happens when shared components from React app receive breaking changes?
  - Implement versioned imports or copy-on-write strategy to prevent marketing site breakage

- How does dark theme handle user-uploaded images or external content?
  - Apply border/shadow effects to create separation from dark backgrounds, ensure contrast

- What happens when accessibility tools request high contrast mode?
  - Provide high contrast dark theme variant with enhanced borders and brighter text

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST replace all light theme colors with Olorin corporate dark purple palette defined in tailwind.config.js
- **FR-002**: System MUST apply glassmorphic effects (backdrop-blur, semi-transparent backgrounds) to all card and panel components
- **FR-003**: System MUST reuse existing shared components from olorin-front/src/shared/components (Modal, CollapsiblePanel, buttons)
- **FR-004**: System MUST implement collapsible/expandable panels for content sections using shared CollapsiblePanel component
- **FR-005**: System MUST maintain responsive layouts optimized for dark theme across all breakpoints (sm, md, lg, xl)
- **FR-006**: System MUST apply consistent hover states (brightness-110, scale-105) to all interactive elements
- **FR-007**: System MUST use corporate purple accent colors (#A855F7 primary, #C084FC secondary) for all CTAs and highlights
- **FR-008**: System MUST ensure WCAG AA contrast ratios (4.5:1 minimum) for all text on dark backgrounds
- **FR-009**: System MUST replace current tailwind.config.js color palette with corporate colors from React app
- **FR-010**: System MUST implement glassmorphic modal overlays with backdrop blur for any modal interactions

### Key Entities

- **HomePage Component**: Main landing page with hero section, features grid, stats, benefits, and CTA sections - all transformed to dark glassmorphic design
- **ServicesPage Component**: Product capabilities page with detailed feature descriptions - transformed to match investigation wizard aesthetic
- **ContactPage Component**: Lead generation form with glassmorphic modal container and dark theme validation states
- **Header Component**: Navigation bar with transparent/glassmorphic background, purple highlights on active routes
- **Footer Component**: Site footer with dark background and light text, purple accent links
- **Shared Component Library**: Reusable components (Modal, CollapsiblePanel, Button, Card) imported from olorin-front/src/shared/components

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of pages pass visual regression tests comparing against Olorin React app design system
- **SC-002**: All reusable UI components (minimum 5: Modal, Panel, Button, Card, Badge) successfully imported from shared library
- **SC-003**: All text achieves minimum WCAG AA contrast ratio (4.5:1) against dark backgrounds
- **SC-004**: Page load performance maintains sub-3 second load time despite glassmorphic effects
- **SC-005**: All interactive elements demonstrate consistent hover/active states matching React app (200ms transitions)
- **SC-006**: Marketing site passes accessibility audit with 90+ Lighthouse score on dark theme
- **SC-007**: Zero color values hardcoded - all colors reference corporate palette from tailwind.config.js
- **SC-008**: Responsive layouts tested and validated across 5 device sizes (mobile, tablet, desktop, large desktop, extra-large)

## Technical Architecture

### Design System Integration

**Color Palette Replacement**:
```javascript
// Replace current tailwind.config.js colors with:
colors: {
  corporate: {
    bgPrimary: '#1A0B2E',        // Main background (dark purple/black)
    bgSecondary: '#2D1B4E',      // Secondary panels (medium purple)
    bgTertiary: '#3E2C5F',       // Tertiary surfaces (light purple)

    accentPrimary: '#A855F7',        // Purple (primary actions, highlights)
    accentPrimaryHover: '#9333EA',   // Purple hover state
    accentSecondary: '#C084FC',      // Light purple (secondary accent)
    accentSecondaryHover: '#A855F7', // Light purple hover state

    textPrimary: '#F9FAFB',    // Primary text (white)
    textSecondary: '#D8B4FE',  // Secondary text (purple tinted)
    textTertiary: '#C084FC',   // Tertiary text (light purple)

    borderPrimary: '#6B21A8',    // Primary borders (purple)
    borderSecondary: '#7C3AED',  // Secondary borders (purple)
  }
}
```

**Glassmorphic Effects Pattern**:
```typescript
// Apply to all card/panel components:
className="bg-corporate-bgSecondary/80 backdrop-blur-md border-2 border-corporate-borderPrimary/40"

// Hover states for interactive cards:
className="hover:bg-corporate-bgTertiary/90 hover:scale-105 transition-all duration-200"
```

### Component Migration Strategy

**Phase 1: Shared Component Setup**
1. Move reusable components to shared location if not already there
2. Update imports in marketing portal to reference shared components
3. Ensure TypeScript types are exported and accessible

**Phase 2: Color Palette Replacement**
1. Update tailwind.config.js with corporate colors
2. Replace all color class names (primary-* → corporate-*)
3. Update gradient classes to use corporate palette

**Phase 3: Glassmorphic Effects**
1. Add backdrop-blur-* classes to all card/panel components
2. Apply semi-transparent backgrounds (*/80, */90 opacity)
3. Update border styles with corporate colors

**Phase 4: Interactive States**
1. Implement hover states (brightness-110, scale-105)
2. Add smooth transitions (200ms duration)
3. Ensure focus states use corporate accent colors

### Shared Components to Reuse

From `olorin-front/src/shared/components`:
- **Modal.tsx**: Glassmorphic modal with corporate styling
- **CollapsiblePanel**: Expandable panels with chevron animation
- **Button components**: WizardButton, primary/secondary button variants
- **Card.tsx**: Base card with glassmorphic effects
- **Badge.tsx**: Status badges with corporate colors
- **LoadingSpinner.tsx**: Loading states with corporate accent colors

### File Structure Changes

```
olorin-web-portal/
├── src/
│   ├── components/
│   │   ├── Header.tsx              # Updated with glassmorphic nav
│   │   ├── Footer.tsx              # Updated with dark theme
│   │   ├── LanguageSelector.tsx   # Updated with corporate colors
│   │   └── shared/                 # NEW: Symlink or imports from olorin-front
│   ├── pages/
│   │   ├── HomePage.tsx            # Transformed to dark glassmorphic
│   │   ├── ServicesPage.tsx        # Transformed to dark glassmorphic
│   │   ├── ContactPage.tsx         # Transformed with glassmorphic modal
│   │   ├── AboutPage.tsx           # Transformed to dark theme
│   │   └── NotFoundPage.tsx        # Updated with corporate colors
│   ├── styles/
│   │   └── glassmorphic.css        # NEW: Glassmorphic utility classes
│   └── tailwind.config.js          # Updated with corporate colors
```

### Environment Variables

No new environment variables required - reuse existing configuration from React app.

### Browser Compatibility

- **backdrop-filter support**: Modern browsers (Chrome 76+, Firefox 103+, Safari 9+)
- **Fallback strategy**: Use solid semi-transparent backgrounds for unsupported browsers
- **Progressive enhancement**: Apply glassmorphic effects with @supports query

## Implementation Notes

### Glassmorphic Effect Guidelines

**Card Components**:
```typescript
// Standard glassmorphic card
<div className="bg-corporate-bgSecondary/80 backdrop-blur-md border-2 border-corporate-borderPrimary/40 rounded-lg p-6 hover:scale-105 hover:bg-corporate-bgTertiary/90 transition-all duration-200">
  {content}
</div>
```

**Modal Overlays**:
```typescript
// Glassmorphic modal backdrop
<div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />

// Modal content
<div className="bg-corporate-bgPrimary border-2 border-corporate-borderPrimary/40 rounded-lg shadow-2xl">
  {modal content}
</div>
```

**Navigation**:
```typescript
// Transparent/glassmorphic header on scroll
<header className="sticky top-0 bg-corporate-bgPrimary/80 backdrop-blur-lg border-b border-corporate-borderPrimary/40">
  {navigation}
</header>
```

### Accessibility Considerations

1. **Contrast Ratios**: All text must meet WCAG AA standards (4.5:1)
   - Primary text on dark: #F9FAFB on #1A0B2E (ratio: 14.5:1 ✓)
   - Secondary text on dark: #D8B4FE on #2D1B4E (ratio: 8.2:1 ✓)

2. **Focus Indicators**: Use corporate purple accent for focus rings
   ```css
   focus:ring-2 focus:ring-corporate-accentPrimary focus:ring-offset-2
   ```

3. **Reduced Motion**: Respect prefers-reduced-motion
   ```css
   @media (prefers-reduced-motion: reduce) {
     * { animation-duration: 0.01ms !important; }
   }
   ```

### Testing Strategy

**Visual Regression Tests**:
- Capture screenshots of all pages in dark theme
- Compare against React app investigation wizard screens
- Verify color palette consistency

**Component Integration Tests**:
- Test shared component imports work correctly
- Verify props interface compatibility
- Test component rendering in marketing context

**Accessibility Tests**:
- Run Lighthouse accessibility audits (target: 90+)
- Test keyboard navigation
- Verify screen reader compatibility with dark theme

**Cross-browser Tests**:
- Chrome/Edge (glassmorphic effects supported)
- Firefox (glassmorphic effects supported)
- Safari (test backdrop-filter support)
- Test fallback for older browsers

## Dependencies

- **olorin-front/src/shared/components**: Shared component library
- **@heroicons/react**: Icon library (already in use)
- **tailwindcss**: v3.3.0+ for backdrop-blur support
- **lucide-react**: Icon library (currently used, keep consistent)

## Risks & Mitigation

**Risk 1**: Shared components may have different prop interfaces
- **Mitigation**: Create adapter wrappers if necessary, document prop differences

**Risk 2**: Glassmorphic effects may impact performance on mobile
- **Mitigation**: Use CSS containment, reduce blur radius on mobile, test performance

**Risk 3**: Dark theme may reduce readability for some users
- **Mitigation**: Ensure high contrast ratios, provide high-contrast mode option if requested

**Risk 4**: Breaking changes in shared components affect marketing site
- **Mitigation**: Pin shared component versions, implement integration tests

## Future Enhancements

- **Theme Toggle**: Optional light/dark mode switch if requested
- **Animation Library**: Consider Framer Motion for advanced interactions
- **Component Documentation**: Create Storybook for shared components
- **Performance Monitoring**: Track Core Web Vitals impact of glassmorphic effects

## Compliance Checklist

- [ ] No hardcoded color values - all colors from tailwind.config.js corporate palette
- [ ] All shared components imported from olorin-front/src/shared/components
- [ ] Glassmorphic effects applied consistently across all pages
- [ ] WCAG AA contrast ratios achieved for all text
- [ ] Hover states (brightness-110, scale-105) on all interactive elements
- [ ] Responsive layouts tested at all breakpoints
- [ ] Browser fallbacks for unsupported backdrop-filter
- [ ] Accessibility audit passed with 90+ score
- [ ] Visual regression tests pass against React app design
- [ ] No TypeScript errors or warnings
- [ ] All files under 200 lines (per project standards)

## Timeline Estimate

- **Phase 1**: Shared Component Setup (1 day)
- **Phase 2**: Color Palette Replacement (1 day)
- **Phase 3**: Glassmorphic Effects (2 days)
- **Phase 4**: Interactive States & Polish (1 day)
- **Phase 5**: Testing & Validation (1 day)

**Total**: 6 days

## References

- React App Tailwind Config: `/Users/gklainert/Documents/olorin/olorin-front/tailwind.config.js`
- Shared Components: `/Users/gklainert/Documents/olorin/olorin-front/src/shared/components/`
- Marketing Portal: `/Users/gklainert/Documents/olorin/olorin-web-portal/`
- Olorin Web Plugin Reference: `/Users/gklainert/Documents/Gaia/gaia-webplugin/`
- Feature 004 Design System: `/Users/gklainert/Documents/olorin/specs/004-new-olorin-frontend/`
