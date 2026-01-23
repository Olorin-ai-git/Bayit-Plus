# Data Model: Olorin Marketing Webportal Dark Mode Transformation

**Feature**: 022-olorin-webportal-dark
**Date**: 2025-11-12
**Phase**: Phase 1 - Design

## Overview

This document defines the data structures, TypeScript interfaces, and style tokens for the dark glassmorphic transformation of the Olorin marketing webportal. All types ensure configuration-driven design with zero hardcoded values.

## Color Palette Token Model

### Corporate Color Tokens

**Purpose**: Single source of truth for all colors used across the marketing portal.

```typescript
/**
 * Corporate Color Palette
 * Applied consistently across all UI components
 */
export interface CorporateColorPalette {
  /** Background colors for different surface levels */
  backgrounds: {
    primary: string;    // Main page background: #1A0B2E
    secondary: string;  // Panel backgrounds: #2D1B4E
    tertiary: string;   // Card surfaces: #3E2C5F
  };

  /** Accent colors for interactive elements */
  accents: {
    primary: string;       // Primary CTAs: #A855F7
    primaryHover: string;  // Primary hover state: #9333EA
    secondary: string;     // Secondary elements: #C084FC
    secondaryHover: string; // Secondary hover: #A855F7
  };

  /** Text colors for different hierarchy levels */
  text: {
    primary: string;    // Headings, important text: #F9FAFB
    secondary: string;  // Body text: #D8B4FE
    tertiary: string;   // Muted text, captions: #C084FC
    disabled: string;   // Disabled state: #7C3AED
  };

  /** Border colors for UI elements */
  borders: {
    primary: string;    // Main borders: #6B21A8
    secondary: string;  // Lighter borders: #7C3AED
    accent: string;     // Highlight borders: #A855F7
  };

  /** Status colors for feedback */
  status: {
    success: string;  // Success states: #10B981
    warning: string;  // Warning states: #F59E0B
    error: string;    // Error states: #EF4444
    info: string;     // Info messages: #818CF8
  };
}

/**
 * Implementation example for Tailwind config
 */
export const corporateColors: CorporateColorPalette = {
  backgrounds: {
    primary: '#1A0B2E',
    secondary: '#2D1B4E',
    tertiary: '#3E2C5F',
  },
  accents: {
    primary: '#A855F7',
    primaryHover: '#9333EA',
    secondary: '#C084FC',
    secondaryHover: '#A855F7',
  },
  text: {
    primary: '#F9FAFB',
    secondary: '#D8B4FE',
    tertiary: '#C084FC',
    disabled: '#7C3AED',
  },
  borders: {
    primary: '#6B21A8',
    secondary: '#7C3AED',
    accent: '#A855F7',
  },
  status: {
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#818CF8',
  },
};
```

## Glassmorphic Style Model

### Glassmorphic Effect Tokens

**Purpose**: Reusable style configurations for glassmorphic effects.

```typescript
/**
 * Glassmorphic Effect Configuration
 * Defines backdrop blur, transparency, and border styles
 */
export interface GlassmorphicStyle {
  /** Background with transparency */
  background: {
    color: string;       // Base color (e.g., corporate-bgSecondary)
    opacity: number;     // Opacity value (0.0 - 1.0)
  };

  /** Backdrop blur configuration */
  blur: {
    amount: 'sm' | 'md' | 'lg' | 'xl';  // Tailwind blur sizes
    mobile: 'sm' | 'md';                 // Reduced blur for mobile
  };

  /** Border configuration */
  border: {
    width: number;       // Border width in pixels
    color: string;       // Border color
    opacity: number;     // Border opacity (0.0 - 1.0)
  };

  /** Shadow configuration */
  shadow: 'sm' | 'md' | 'lg' | 'xl' | '2xl';

  /** Hover state modifications */
  hover?: {
    backgroundOpacity?: number;  // New opacity on hover
    scale?: number;              // Scale factor (e.g., 1.05)
    brightness?: number;         // Brightness multiplier (e.g., 1.1)
  };
}

/**
 * Predefined glassmorphic style presets
 */
export const glassmorphicPresets = {
  /** Standard card styling */
  card: {
    background: { color: 'corporate-bgSecondary', opacity: 0.8 },
    blur: { amount: 'md' as const, mobile: 'sm' as const },
    border: { width: 2, color: 'corporate-borderPrimary', opacity: 0.4 },
    shadow: 'lg' as const,
    hover: { backgroundOpacity: 0.9, scale: 1.05 },
  },

  /** Modal overlay styling */
  modal: {
    background: { color: 'corporate-bgPrimary', opacity: 1.0 },
    blur: { amount: 'md' as const, mobile: 'sm' as const },
    border: { width: 2, color: 'corporate-borderPrimary', opacity: 0.4 },
    shadow: '2xl' as const,
  },

  /** Header/navigation styling */
  header: {
    background: { color: 'corporate-bgPrimary', opacity: 0.8 },
    blur: { amount: 'lg' as const, mobile: 'md' as const },
    border: { width: 1, color: 'corporate-borderPrimary', opacity: 0.4 },
    shadow: 'sm' as const,
  },

  /** Footer styling */
  footer: {
    background: { color: 'corporate-bgPrimary', opacity: 1.0 },
    blur: { amount: 'md' as const, mobile: 'sm' as const },
    border: { width: 1, color: 'corporate-borderPrimary', opacity: 0.2 },
    shadow: 'md' as const,
  },
} as const;
```

## Component Prop Interfaces

### Shared Component Interfaces

**Purpose**: TypeScript interfaces for reusable components from React app.

```typescript
/**
 * Modal Component Props
 * Imported from olorin-front/src/shared/components/Modal.tsx
 */
export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  children: React.ReactNode;
  showCloseButton?: boolean;
  closeOnBackdrop?: boolean;
  className?: string;
}

/**
 * CollapsiblePanel Component Props
 * Imported from olorin-front/src/shared/components/CollapsiblePanel.tsx
 */
export interface CollapsiblePanelProps {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  badges?: React.ReactNode[];
  actionButtons?: React.ReactNode[];
  className?: string;
}

/**
 * Button Component Props
 * Imported from olorin-front/src/shared/components/ui/Button.tsx
 */
export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
}

/**
 * Badge Component Props
 * Imported from olorin-front/src/shared/components/ui/Badge.tsx
 */
export interface BadgeProps {
  variant?: 'success' | 'warning' | 'error' | 'info' | 'default';
  size?: 'sm' | 'md';
  children: React.ReactNode;
  className?: string;
}

/**
 * Card Component Props
 * Imported from olorin-front/src/shared/components/ui/Card.tsx
 */
export interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'interactive';
  className?: string;
  onClick?: () => void;
}
```

## Page Section Models

### HomePage Data Model

**Purpose**: Structure for HomePage sections with glassmorphic styling.

```typescript
/**
 * Feature Card Data Structure
 * Used in Features section of HomePage
 */
export interface FeatureCard {
  /** Unique identifier */
  id: string;
  /** Feature icon component */
  icon: React.ReactNode;
  /** Translated feature title */
  title: string;
  /** Translated feature description */
  description: string;
  /** Optional link to learn more */
  learnMoreLink?: string;
}

/**
 * Stat Display Data Structure
 * Used in Stats section of HomePage
 */
export interface StatDisplay {
  /** Unique identifier */
  id: string;
  /** Stat number/value (e.g., "99%", "1000+") */
  number: string;
  /** Translated label */
  label: string;
  /** Optional icon */
  icon?: React.ReactNode;
}

/**
 * Benefit Item Data Structure
 * Used in Benefits section of HomePage
 */
export interface BenefitItem {
  /** Unique identifier */
  id: string;
  /** Translated benefit text */
  text: string;
  /** Optional icon (defaults to checkmark) */
  icon?: React.ReactNode;
}

/**
 * CTA Button Data Structure
 * Used in CTA sections
 */
export interface CTAButton {
  /** Unique identifier */
  id: string;
  /** Translated button text */
  text: string;
  /** Button link or route */
  href: string;
  /** Button variant */
  variant: 'primary' | 'secondary' | 'outline';
  /** External link flag */
  isExternal?: boolean;
  /** Optional icon */
  icon?: React.ReactNode;
}
```

### Navigation Data Model

**Purpose**: Structure for header navigation with active state tracking.

```typescript
/**
 * Navigation Item Data Structure
 */
export interface NavigationItem {
  /** Unique identifier */
  id: string;
  /** Translated navigation label */
  name: string;
  /** Route path */
  href: string;
  /** External link flag */
  isExternal?: boolean;
  /** Optional icon */
  icon?: React.ReactNode;
  /** Sub-menu items (for dropdowns) */
  children?: NavigationItem[];
}

/**
 * Navigation State
 * Tracks active route and mobile menu state
 */
export interface NavigationState {
  /** Currently active route */
  activeRoute: string;
  /** Mobile menu open/closed */
  isMobileMenuOpen: boolean;
  /** Scroll position for header transparency */
  scrollPosition: number;
}
```

## Form Data Models

### Contact Form Model

**Purpose**: Structure for contact form with validation.

```typescript
/**
 * Contact Form Data
 * Used in ContactPage for lead generation
 */
export interface ContactFormData {
  /** Contact name */
  name: string;
  /** Contact email */
  email: string;
  /** Company name (optional) */
  company?: string;
  /** Phone number (optional) */
  phone?: string;
  /** Message/inquiry text */
  message: string;
  /** Newsletter opt-in */
  newsletter?: boolean;
}

/**
 * Contact Form Validation Errors
 */
export interface ContactFormErrors {
  name?: string;
  email?: string;
  message?: string;
  [key: string]: string | undefined;
}

/**
 * Contact Form State
 */
export interface ContactFormState {
  /** Form data */
  data: ContactFormData;
  /** Validation errors */
  errors: ContactFormErrors;
  /** Submission state */
  isSubmitting: boolean;
  /** Submission success */
  isSuccess: boolean;
  /** Submission error message */
  errorMessage?: string;
}
```

## Responsive Design Model

### Breakpoint Configuration

**Purpose**: Responsive breakpoint definitions matching Tailwind config.

```typescript
/**
 * Responsive Breakpoints
 * Matches Tailwind CSS breakpoints
 */
export interface ResponsiveBreakpoints {
  xs: number;   // 475px
  sm: number;   // 640px
  md: number;   // 768px
  lg: number;   // 1024px
  xl: number;   // 1280px
  '2xl': number; // 1536px
  '3xl': number; // 1600px
}

export const breakpoints: ResponsiveBreakpoints = {
  xs: 475,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
  '3xl': 1600,
};

/**
 * Device Type Detection
 */
export type DeviceType = 'mobile' | 'tablet' | 'desktop' | 'wide';

/**
 * Get device type based on window width
 */
export function getDeviceType(width: number): DeviceType {
  if (width < breakpoints.md) return 'mobile';
  if (width < breakpoints.lg) return 'tablet';
  if (width < breakpoints['2xl']) return 'desktop';
  return 'wide';
}
```

## Animation & Transition Models

### Animation Configuration

**Purpose**: Consistent animation timing and easing functions.

```typescript
/**
 * Animation Durations (in milliseconds)
 */
export interface AnimationDurations {
  fast: number;     // 100ms - micro-interactions
  normal: number;   // 200ms - standard transitions
  slow: number;     // 300ms - larger movements
  slower: number;   // 500ms - page transitions
}

export const animationDurations: AnimationDurations = {
  fast: 100,
  normal: 200,
  slow: 300,
  slower: 500,
};

/**
 * Easing Functions
 */
export interface EasingFunctions {
  linear: string;
  easeIn: string;
  easeOut: string;
  easeInOut: string;
  bounce: string;
}

export const easingFunctions: EasingFunctions = {
  linear: 'linear',
  easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
  easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
  easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
};

/**
 * Hover State Configuration
 */
export interface HoverStateConfig {
  scale: number;        // Scale multiplier (e.g., 1.05)
  brightness: number;   // Brightness multiplier (e.g., 1.1)
  duration: number;     // Transition duration (ms)
  easing: string;       // Easing function
}

export const defaultHoverConfig: HoverStateConfig = {
  scale: 1.05,
  brightness: 1.1,
  duration: animationDurations.normal,
  easing: easingFunctions.easeOut,
};
```

## Accessibility Model

### WCAG Compliance Configuration

**Purpose**: Accessibility standards and contrast requirements.

```typescript
/**
 * WCAG Contrast Requirements
 */
export interface WCAGContrastRatios {
  AA: {
    normalText: number;  // 4.5:1
    largeText: number;   // 3:1
  };
  AAA: {
    normalText: number;  // 7:1
    largeText: number;   // 4.5:1
  };
}

export const wcagContrastRatios: WCAGContrastRatios = {
  AA: {
    normalText: 4.5,
    largeText: 3.0,
  },
  AAA: {
    normalText: 7.0,
    largeText: 4.5,
  },
};

/**
 * Text Size Thresholds for WCAG
 * Large text = 18pt+ or 14pt+ bold
 */
export interface TextSizeThresholds {
  largeRegular: number;  // 18pt = 24px
  largeBold: number;     // 14pt = 18.66px
}

export const textSizeThresholds: TextSizeThresholds = {
  largeRegular: 24,
  largeBold: 18.66,
};

/**
 * Focus Indicator Configuration
 */
export interface FocusIndicatorConfig {
  ringWidth: number;        // Ring width in pixels
  ringColor: string;        // Ring color (corporate-accentPrimary)
  ringOffset: number;       // Offset from element (pixels)
  ringOpacity: number;      // Ring opacity (0.0 - 1.0)
}

export const defaultFocusIndicator: FocusIndicatorConfig = {
  ringWidth: 2,
  ringColor: 'corporate-accentPrimary',
  ringOffset: 2,
  ringOpacity: 0.5,
};
```

## Configuration Model

### Environment Configuration

**Purpose**: Runtime configuration from environment variables.

```typescript
/**
 * Marketing Portal Configuration
 * All values loaded from environment variables
 */
export interface MarketingPortalConfig {
  /** Environment (development, staging, production) */
  env: 'development' | 'staging' | 'production';

  /** Public URL base */
  publicUrl: string;

  /** Demo app URL (external link) */
  demoAppUrl: string;

  /** EmailJS configuration */
  emailjs: {
    serviceId: string;
    templateId: string;
    publicKey: string;
  };

  /** Analytics configuration */
  analytics?: {
    googleAnalyticsId?: string;
    enabled: boolean;
  };

  /** Feature flags */
  features: {
    enableContactForm: boolean;
    enableNewsletter: boolean;
    enableLanguageSelector: boolean;
  };
}

/**
 * Load configuration from environment variables
 * Validates all required values are present
 */
export function loadMarketingConfig(): MarketingPortalConfig {
  const config: MarketingPortalConfig = {
    env: (process.env.REACT_APP_ENV || 'development') as 'development' | 'staging' | 'production',
    publicUrl: process.env.PUBLIC_URL || '',
    demoAppUrl: process.env.REACT_APP_DEMO_URL || 'https://olorin-ai.web.app/investigation?demo=true',
    emailjs: {
      serviceId: process.env.REACT_APP_EMAILJS_SERVICE_ID || '',
      templateId: process.env.REACT_APP_EMAILJS_TEMPLATE_ID || '',
      publicKey: process.env.REACT_APP_EMAILJS_PUBLIC_KEY || '',
    },
    analytics: {
      googleAnalyticsId: process.env.REACT_APP_GA_ID,
      enabled: process.env.REACT_APP_ANALYTICS_ENABLED === 'true',
    },
    features: {
      enableContactForm: process.env.REACT_APP_FEATURE_CONTACT_FORM !== 'false',
      enableNewsletter: process.env.REACT_APP_FEATURE_NEWSLETTER === 'true',
      enableLanguageSelector: process.env.REACT_APP_FEATURE_LANGUAGE_SELECTOR !== 'false',
    },
  };

  // Validate required fields
  if (!config.emailjs.serviceId || !config.emailjs.templateId || !config.emailjs.publicKey) {
    throw new Error('EmailJS configuration is incomplete. Check environment variables.');
  }

  return config;
}
```

## Performance Model

### Performance Budgets

**Purpose**: Performance targets and monitoring thresholds.

```typescript
/**
 * Performance Budget Configuration
 */
export interface PerformanceBudget {
  /** Page load time targets (milliseconds) */
  pageLoad: {
    target: number;    // Target load time: 3000ms
    warning: number;   // Warning threshold: 2500ms
  };

  /** Bundle size targets (kilobytes) */
  bundleSize: {
    target: number;    // Target: 200KB gzipped
    warning: number;   // Warning: 180KB gzipped
  };

  /** Lighthouse score targets (0-100) */
  lighthouse: {
    performance: number;    // Target: 80+
    accessibility: number;  // Target: 90+
    bestPractices: number;  // Target: 90+
    seo: number;           // Target: 95+
  };

  /** Core Web Vitals */
  coreWebVitals: {
    LCP: number;  // Largest Contentful Paint: 2.5s
    FID: number;  // First Input Delay: 100ms
    CLS: number;  // Cumulative Layout Shift: 0.1
  };
}

export const performanceBudget: PerformanceBudget = {
  pageLoad: {
    target: 3000,
    warning: 2500,
  },
  bundleSize: {
    target: 200,
    warning: 180,
  },
  lighthouse: {
    performance: 80,
    accessibility: 90,
    bestPractices: 90,
    seo: 95,
  },
  coreWebVitals: {
    LCP: 2500,
    FID: 100,
    CLS: 0.1,
  },
};
```

## Summary

This data model provides:

1. **Color Palette Tokens**: Corporate colors with semantic naming
2. **Glassmorphic Style Configurations**: Reusable style presets
3. **Component Prop Interfaces**: TypeScript contracts for shared components
4. **Page Section Models**: Structured data for homepage sections
5. **Form Data Models**: Contact form structure and validation
6. **Responsive Design Models**: Breakpoint and device type definitions
7. **Animation Models**: Consistent timing and easing
8. **Accessibility Models**: WCAG compliance configuration
9. **Configuration Models**: Environment-driven configuration
10. **Performance Models**: Performance budgets and targets

All models support:
- Zero hardcoded values (configuration-driven)
- TypeScript type safety
- Validation and error handling
- Environment-specific customization
- Performance monitoring
- Accessibility compliance

**Next Steps**: Create API contracts and quickstart guide in Phase 1.
