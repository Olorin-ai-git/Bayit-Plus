# Quickstart Guide: Olorin Marketing Webportal Dark Mode Transformation

**Feature**: 022-olorin-webportal-dark
**Branch**: `022-olorin-webportal-dark`
**Date**: 2025-11-12

## Overview

This guide provides step-by-step instructions for developers to implement the dark glassmorphic transformation of the Olorin marketing webportal.

## Prerequisites

### Required Software
- **Node.js**: v18+ (LTS recommended)
- **npm**: v9+
- **Git**: v2.30+
- **Code Editor**: VS Code recommended with extensions:
  - Tailwind CSS IntelliSense
  - ESLint
  - Prettier
  - TypeScript and JavaScript Language Features

### Required Knowledge
- React 18 functional components and hooks
- TypeScript basics
- Tailwind CSS utility classes
- CSS backdrop-filter and glassmorphic effects
- Responsive design principles

### Access Requirements
- Read access to `olorin-front` repository (for shared components)
- Write access to `olorin-web-portal` repository

## Project Setup

### 1. Clone and Checkout Branch

```bash
# Navigate to olorin-web-portal directory
cd /Users/gklainert/Documents/olorin/olorin-web-portal

# Ensure on correct branch
git checkout 022-olorin-webportal-dark

# Pull latest changes
git pull origin 022-olorin-webportal-dark

# Install dependencies
npm install
```

### 2. Environment Configuration

Create `.env` file in project root:

```bash
# Environment
REACT_APP_ENV=development

# Public URL
PUBLIC_URL=http://localhost:3000

# Demo app URL
REACT_APP_DEMO_URL=https://olorin-ai.web.app/investigation?demo=true

# EmailJS Configuration (get from team)
REACT_APP_EMAILJS_SERVICE_ID=your_service_id
REACT_APP_EMAILJS_TEMPLATE_ID=your_template_id
REACT_APP_EMAILJS_PUBLIC_KEY=your_public_key

# Analytics (optional)
REACT_APP_GA_ID=
REACT_APP_ANALYTICS_ENABLED=false

# Feature Flags
REACT_APP_FEATURE_CONTACT_FORM=true
REACT_APP_FEATURE_NEWSLETTER=false
REACT_APP_FEATURE_LANGUAGE_SELECTOR=true
```

### 3. Verify Shared Component Access

Ensure you can access shared components from React app:

```bash
# Check if olorin-front exists
ls ../olorin-front/src/shared/components

# Expected output: Modal.tsx, CollapsiblePanel.tsx, etc.
```

## Implementation Workflow

### Phase 1: Foundation Setup (Day 1)

#### Step 1: Update Tailwind Configuration

**File**: `tailwind.config.js`

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      colors: {
        // Replace existing primary/secondary with corporate colors
        corporate: {
          // Backgrounds (Dark Theme)
          bgPrimary: '#1A0B2E',
          bgSecondary: '#2D1B4E',
          bgTertiary: '#3E2C5F',

          // Accent Colors
          accentPrimary: '#A855F7',
          accentPrimaryHover: '#9333EA',
          accentSecondary: '#C084FC',
          accentSecondaryHover: '#A855F7',

          // Text Colors
          textPrimary: '#F9FAFB',
          textSecondary: '#D8B4FE',
          textTertiary: '#C084FC',
          textDisabled: '#7C3AED',

          // Border Colors
          borderPrimary: '#6B21A8',
          borderSecondary: '#7C3AED',
          borderAccent: '#A855F7',
        },

        // Status Colors
        status: {
          success: '#10B981',
          warning: '#F59E0B',
          error: '#EF4444',
          info: '#818CF8',
        },
      },

      // Add backdrop blur support
      backdropBlur: {
        xs: '2px',
        sm: '4px',
        md: '12px',
        lg: '16px',
        xl: '24px',
      },

      // Animation extensions
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'fade-in-up': 'fadeInUp 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'slide-down': 'slideDown 0.5s ease-out',
        'scale-in': 'scaleIn 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },

      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
};
```

#### Step 2: Create Glassmorphic Utility Classes

**File**: `src/styles/glassmorphic.css` (create new file)

```css
/**
 * Glassmorphic Utility Classes
 * Reusable styles for dark glassmorphic effects
 */

/* Base glassmorphic card */
.glass-card {
  @apply bg-corporate-bgSecondary/80 backdrop-blur-md;
  @apply border-2 border-corporate-borderPrimary/40;
  @apply rounded-lg shadow-lg;
}

/* Interactive glassmorphic card */
.glass-card-interactive {
  @apply glass-card;
  @apply hover:bg-corporate-bgTertiary/90 hover:scale-105;
  @apply transition-all duration-200;
  @apply cursor-pointer;
}

/* Glassmorphic modal overlay */
.glass-modal-overlay {
  @apply fixed inset-0 bg-black/60 backdrop-blur-sm;
  @apply transition-opacity duration-300;
}

/* Glassmorphic modal content */
.glass-modal-content {
  @apply bg-corporate-bgPrimary border-2 border-corporate-borderPrimary/40;
  @apply rounded-lg shadow-2xl;
}

/* Glassmorphic header (sticky) */
.glass-header {
  @apply sticky top-0 bg-corporate-bgPrimary/80 backdrop-blur-lg;
  @apply border-b border-corporate-borderPrimary/40;
  @apply z-50 transition-all duration-200;
}

/* Glassmorphic footer */
.glass-footer {
  @apply bg-corporate-bgPrimary border-t border-corporate-borderPrimary/20;
}

/* Glassmorphic panel */
.glass-panel {
  @apply bg-black/40 backdrop-blur-md rounded-lg;
  @apply border-2 border-corporate-accentPrimary/40;
  @apply hover:border-corporate-accentPrimary/60 transition-all shadow-lg;
}

/* Mobile optimizations (reduced blur for performance) */
@media (max-width: 768px) {
  .glass-card,
  .glass-card-interactive,
  .glass-panel {
    @apply backdrop-blur-sm;
  }

  .glass-header {
    @apply backdrop-blur-md;
  }
}

/* Fallback for browsers without backdrop-filter support */
@supports not (backdrop-filter: blur(12px)) {
  .glass-card,
  .glass-card-interactive {
    @apply bg-corporate-bgSecondary;
  }

  .glass-header {
    @apply bg-corporate-bgPrimary;
  }

  .glass-panel {
    @apply bg-corporate-bgSecondary;
  }
}
```

**Import in `src/index.css`**:

```css
@import './styles/glassmorphic.css';
```

#### Step 3: Set Up Shared Component Imports

**File**: `src/utils/sharedComponents.ts` (create new file)

```typescript
/**
 * Shared Components Import Helper
 * Centralizes imports from olorin-front shared components
 */

// Import components from olorin-front
export { Modal } from '../../olorin-front/src/shared/components/Modal';
export { CollapsiblePanel } from '../../olorin-front/src/shared/components/CollapsiblePanel';
export { default as LoadingSpinner } from '../../olorin-front/src/shared/components/LoadingSpinner';
export { default as ErrorBoundary } from '../../olorin-front/src/shared/components/ErrorBoundary';

// UI Components
export { Button } from '../../olorin-front/src/shared/components/ui/Button';
export { Badge } from '../../olorin-front/src/shared/components/ui/Badge';
export { Card } from '../../olorin-front/src/shared/components/ui/Card';
export { Input } from '../../olorin-front/src/shared/components/ui/Input';

// Types
export type { ModalProps } from '../../olorin-front/src/shared/components/Modal';
export type { CollapsiblePanelProps } from '../../olorin-front/src/shared/components/CollapsiblePanel';
export type { ButtonProps } from '../../olorin-front/src/shared/components/ui/Button';
```

### Phase 2: Core Components Transformation (Day 2)

#### Step 4: Transform Header Component

**File**: `src/components/Header.tsx`

Replace light theme classes:

```typescript
// OLD
className="bg-white shadow-sm sticky top-0 z-50"

// NEW
className="glass-header"
```

```typescript
// OLD - Navigation links
className="text-secondary-600 hover:text-primary-600"

// NEW
className="text-corporate-textSecondary hover:text-corporate-accentPrimary transition-colors duration-200"
```

```typescript
// OLD - Active link
className="text-primary-600 border-b-2 border-primary-600"

// NEW
className="text-corporate-accentPrimary border-b-2 border-corporate-accentPrimary"
```

```typescript
// OLD - CTA button
className="bg-primary-600 text-white hover:bg-primary-700"

// NEW
className="bg-corporate-accentPrimary text-white hover:bg-corporate-accentPrimaryHover hover:brightness-110 transition-all duration-200"
```

#### Step 5: Transform Footer Component

**File**: `src/components/Footer.tsx`

Apply dark theme:

```typescript
// OLD
className="bg-white"

// NEW
className="glass-footer"
```

```typescript
// OLD - Footer text
className="text-secondary-600"

// NEW
className="text-corporate-textSecondary"
```

```typescript
// OLD - Footer links
className="text-secondary-600 hover:text-primary-600"

// NEW
className="text-corporate-textTertiary hover:text-corporate-accentPrimary transition-colors"
```

### Phase 3: Page Transformation (Days 3-4)

#### Step 6: Transform HomePage

**File**: `src/pages/HomePage.tsx`

##### Hero Section:

```typescript
// OLD
className="bg-gradient-to-br from-primary-50 via-primary-100 to-purple-200"

// NEW
className="relative bg-gradient-to-br from-corporate-bgPrimary via-corporate-bgSecondary to-corporate-bgTertiary overflow-hidden"
```

```typescript
// OLD - Hero title
className="text-secondary-900"

// NEW
className="text-corporate-textPrimary animate-fade-in"
```

```typescript
// OLD - Hero subtitle
className="text-secondary-600"

// NEW
className="text-corporate-textSecondary animate-slide-up"
```

##### Feature Cards:

```typescript
// OLD
className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl"

// NEW
className="glass-card-interactive p-8"
```

```typescript
// OLD - Feature icon background
className="bg-primary-100 p-3 rounded-lg"

// NEW
className="bg-corporate-accentPrimary/20 p-3 rounded-lg backdrop-blur-sm"
```

##### Stats Section:

```typescript
// OLD
className="bg-white"

// NEW
className="bg-corporate-bgSecondary/50 backdrop-blur-lg"
```

```typescript
// OLD - Stat numbers
className="text-primary-600"

// NEW
className="text-corporate-accentPrimary"
```

#### Step 7: Transform ContactPage with Modal

**File**: `src/pages/ContactPage.tsx`

Import Modal:

```typescript
import { Modal, Button, Input } from '../utils/sharedComponents';
```

Wrap form in Modal:

```typescript
<Modal
  isOpen={isModalOpen}
  onClose={() => setIsModalOpen(false)}
  title="Contact Us"
  size="lg"
>
  <form onSubmit={handleSubmit} className="space-y-6">
    {/* Form fields with dark theme inputs */}
  </form>
</Modal>
```

Style form inputs for dark theme:

```typescript
<Input
  type="email"
  name="email"
  value={formData.email}
  onChange={handleChange}
  placeholder="your.email@company.com"
  className="bg-corporate-bgTertiary border-corporate-borderPrimary text-corporate-textPrimary focus:ring-corporate-accentPrimary"
/>
```

### Phase 4: Polish & Testing (Days 5-6)

#### Step 8: Responsive Testing

Test at all breakpoints:

```bash
# Start dev server
npm start

# Open in browser at different widths:
# - Mobile: 375px, 414px
# - Tablet: 768px, 1024px
# - Desktop: 1280px, 1440px, 1920px
```

Check:
- [ ] Glassmorphic effects render correctly
- [ ] Text is readable at all sizes
- [ ] Hover states work on all interactive elements
- [ ] Mobile menu displays correctly with dark theme
- [ ] Images have proper contrast/borders on dark backgrounds

#### Step 9: Accessibility Audit

Run Lighthouse audit:

```bash
# Build production bundle
npm run build

# Serve production build
npx serve -s build

# Open Chrome DevTools > Lighthouse
# Run audit with:
# - Performance
# - Accessibility
# - Best Practices
# - SEO

# Target scores:
# - Performance: 80+
# - Accessibility: 90+
# - Best Practices: 90+
# - SEO: 95+
```

Manual accessibility checks:
- [ ] Tab navigation works through all interactive elements
- [ ] Focus indicators visible on dark backgrounds
- [ ] Screen reader announces all content correctly
- [ ] Color contrast meets WCAG AA standards
- [ ] Forms have proper labels and error messages

#### Step 10: Cross-Browser Testing

Test in:
- [ ] Chrome 76+ (primary)
- [ ] Firefox 103+
- [ ] Safari 9+
- [ ] Edge 79+

Check for:
- Glassmorphic effects (backdrop-filter support)
- Animation performance
- Layout consistency
- Font rendering

## Development Commands

```bash
# Start development server
npm start

# Build production bundle
npm run build

# Run linter
npm run lint

# Fix linting issues
npm run lint:fix

# Run tests
npm test

# Run tests with coverage
npm test -- --coverage
```

## Common Issues & Solutions

### Issue 1: Shared Components Not Found

**Error**: `Cannot find module '../../olorin-front/src/shared/components/Modal'`

**Solution**:
```bash
# Ensure olorin-front exists in parent directory
ls ../olorin-front/src/shared/components

# If missing, clone olorin-front:
cd ..
git clone [olorin-front-repo-url]
cd olorin-web-portal
```

### Issue 2: Backdrop Blur Not Working

**Error**: Glassmorphic effects not visible

**Solution**:
1. Check browser support (Chrome 76+, Firefox 103+, Safari 9+)
2. Verify Tailwind config includes `backdropBlur`
3. Ensure `@supports` fallback CSS is present
4. Clear browser cache and rebuild: `npm run build`

### Issue 3: Text Not Readable on Dark Background

**Error**: Low contrast text

**Solution**:
1. Use corporate text colors: `text-corporate-textPrimary`, `text-corporate-textSecondary`
2. Avoid using `text-corporate-accentPrimary` for body text (fails WCAG AA)
3. Run contrast checker: https://webaim.org/resources/contrastchecker/
4. Ensure minimum 4.5:1 contrast ratio

### Issue 4: Poor Mobile Performance

**Error**: Scrolling jank on mobile devices

**Solution**:
1. Reduce blur radius on mobile (already in glassmorphic.css)
2. Add CSS containment: `contain: layout style paint;`
3. Limit number of glassmorphic elements on screen
4. Use Chrome DevTools Performance tab to profile

## File Checklist

Before committing, ensure these files are updated:

- [ ] `tailwind.config.js` - Corporate colors added
- [ ] `src/styles/glassmorphic.css` - Utility classes created
- [ ] `src/index.css` - Imports glassmorphic.css
- [ ] `src/utils/sharedComponents.ts` - Shared component imports
- [ ] `src/components/Header.tsx` - Dark theme applied
- [ ] `src/components/Footer.tsx` - Dark theme applied
- [ ] `src/pages/HomePage.tsx` - Glassmorphic transformation
- [ ] `src/pages/ServicesPage.tsx` - Dark theme applied
- [ ] `src/pages/ContactPage.tsx` - Modal integration
- [ ] `src/pages/AboutPage.tsx` - Dark theme applied
- [ ] `src/pages/NotFoundPage.tsx` - Corporate colors
- [ ] `src/pages/ServerErrorPage.tsx` - Corporate colors
- [ ] `.env.example` - Updated with all required variables
- [ ] `README.md` - Development instructions updated

## Testing Checklist

Before submitting for review:

### Visual Tests
- [ ] All pages render with dark glassmorphic theme
- [ ] Corporate purple colors applied consistently
- [ ] Hover states work on all interactive elements
- [ ] Animations smooth and performant
- [ ] Responsive layouts work at all breakpoints

### Accessibility Tests
- [ ] Lighthouse accessibility score 90+
- [ ] All text meets WCAG AA contrast (4.5:1)
- [ ] Keyboard navigation works
- [ ] Focus indicators visible
- [ ] Screen reader compatible

### Performance Tests
- [ ] Lighthouse performance score 80+
- [ ] Page load < 3 seconds
- [ ] No layout shift (CLS < 0.1)
- [ ] Smooth scrolling on mobile
- [ ] Bundle size < 200KB gzipped

### Cross-Browser Tests
- [ ] Chrome: Glassmorphic effects render
- [ ] Firefox: Glassmorphic effects render
- [ ] Safari: Glassmorphic effects render
- [ ] Edge: Glassmorphic effects render
- [ ] Fallback works in older browsers

## Next Steps

After completing quickstart:

1. **Generate Tasks**: Run `/speckit.tasks` command to generate actionable task breakdown
2. **Implementation**: Follow tasks.md for step-by-step implementation
3. **Code Review**: Submit PR with screenshots of transformed pages
4. **QA Testing**: Full QA pass on staging environment
5. **Production Deploy**: Deploy to production after approval

## Support

### Documentation
- Specification: `specs/022-olorin-webportal-dark/spec.md`
- Data Model: `specs/022-olorin-webportal-dark/data-model.md`
- Research: `specs/022-olorin-webportal-dark/research.md`
- Contracts: `specs/022-olorin-webportal-dark/contracts/`

### Reference Projects
- React App Design System: `/Users/gklainert/Documents/olorin/olorin-front/`
- Olorin Web Plugin: `/Users/gklainert/Documents/Gaia/gaia-webplugin/`
- Feature 004 Spec: `/Users/gklainert/Documents/olorin/specs/004-new-olorin-frontend/`

### Contact
- Technical Questions: [Team Lead]
- Design Questions: [Design Lead]
- Deployment Questions: [DevOps Lead]

---

**Last Updated**: 2025-11-12
**Version**: 1.0
**Status**: Ready for Implementation
