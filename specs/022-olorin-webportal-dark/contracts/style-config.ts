/**
 * Style Configuration Contract
 * Feature: 022-olorin-webportal-dark
 *
 * Configuration interface for Tailwind CSS and glassmorphic styles.
 * Ensures all styling is configuration-driven with zero hardcoded values.
 */

// ============================================================================
// Tailwind Configuration Contract
// ============================================================================

/**
 * Tailwind Color Palette Extension
 * Extends default Tailwind colors with Olorin corporate palette
 */
export interface TailwindColorExtension {
  corporate: {
    /** Background colors */
    bgPrimary: string;
    bgSecondary: string;
    bgTertiary: string;

    /** Accent colors */
    accentPrimary: string;
    accentPrimaryHover: string;
    accentSecondary: string;
    accentSecondaryHover: string;

    /** Text colors */
    textPrimary: string;
    textSecondary: string;
    textTertiary: string;
    textDisabled: string;

    /** Border colors */
    borderPrimary: string;
    borderSecondary: string;
    borderAccent: string;
  };

  /** Status colors */
  status: {
    success: string;
    warning: string;
    error: string;
    info: string;
  };
}

/**
 * Tailwind Theme Extension
 * Complete extension object for tailwind.config.js
 */
export interface TailwindThemeExtension {
  colors: TailwindColorExtension;
  fontFamily: {
    sans: string[];
    mono: string[];
    display: string[];
  };
  fontSize: Record<string, [string, { lineHeight: string }]>;
  spacing: Record<string, string>;
  borderRadius: Record<string, string>;
  boxShadow: Record<string, string>;
  animation: Record<string, string>;
  keyframes: Record<string, Record<string, Record<string, string>>>;
  backdropBlur: Record<string, string>;
}

// ============================================================================
// Glassmorphic Style Utilities
// ============================================================================

/**
 * Glassmorphic Class Names
 * Utility classes for applying glassmorphic effects
 */
export interface GlassmorphicClassNames {
  /** Base glassmorphic card */
  card: string;

  /** Interactive glassmorphic card (with hover) */
  cardInteractive: string;

  /** Glassmorphic modal overlay */
  modalOverlay: string;

  /** Glassmorphic modal content */
  modalContent: string;

  /** Glassmorphic header (sticky) */
  header: string;

  /** Glassmorphic footer */
  footer: string;

  /** Glassmorphic panel */
  panel: string;

  /** Glassmorphic button overlay */
  buttonGlass: string;
}

/**
 * Predefined glassmorphic utility class names
 * Used in component className props
 */
export const glassmorphicClasses: GlassmorphicClassNames = {
  card: 'bg-corporate-bgSecondary/80 backdrop-blur-md border-2 border-corporate-borderPrimary/40 rounded-lg shadow-lg',

  cardInteractive: 'bg-corporate-bgSecondary/80 backdrop-blur-md border-2 border-corporate-borderPrimary/40 rounded-lg shadow-lg hover:bg-corporate-bgTertiary/90 hover:scale-105 transition-all duration-200',

  modalOverlay: 'fixed inset-0 bg-black/60 backdrop-blur-sm',

  modalContent: 'bg-corporate-bgPrimary border-2 border-corporate-borderPrimary/40 rounded-lg shadow-2xl',

  header: 'sticky top-0 bg-corporate-bgPrimary/80 backdrop-blur-lg border-b border-corporate-borderPrimary/40 z-50',

  footer: 'bg-corporate-bgPrimary/100 border-t border-corporate-borderPrimary/20',

  panel: 'bg-black/40 backdrop-blur-md rounded-lg border-2 border-corporate-accentPrimary/40 hover:border-corporate-accentPrimary/60 transition-all shadow-lg',

  buttonGlass: 'bg-corporate-accentPrimary/90 backdrop-blur-sm hover:bg-corporate-accentPrimary hover:brightness-110 transition-all duration-200',
};

// ============================================================================
// Animation Configuration
// ============================================================================

/**
 * Animation Class Names
 * Tailwind animation utilities
 */
export interface AnimationClassNames {
  /** Fade in animation */
  fadeIn: string;

  /** Fade in with upward slide */
  fadeInUp: string;

  /** Slide up animation */
  slideUp: string;

  /** Slide down animation */
  slideDown: string;

  /** Scale in animation */
  scaleIn: string;

  /** Pulse animation (slow) */
  pulseSlow: string;

  /** Spin animation (slow) */
  spinSlow: string;
}

export const animationClasses: AnimationClassNames = {
  fadeIn: 'animate-fade-in',
  fadeInUp: 'animate-fade-in-up',
  slideUp: 'animate-slide-up',
  slideDown: 'animate-slide-down',
  scaleIn: 'animate-scale-in',
  pulseSlow: 'animate-pulse-slow',
  spinSlow: 'animate-spin-slow',
};

// ============================================================================
// Responsive Design Utilities
// ============================================================================

/**
 * Responsive Modifier Prefixes
 * Tailwind responsive breakpoint prefixes
 */
export interface ResponsiveModifiers {
  /** Extra small devices (475px+) */
  xs: 'xs:';

  /** Small devices (640px+) */
  sm: 'sm:';

  /** Medium devices (768px+) */
  md: 'md:';

  /** Large devices (1024px+) */
  lg: 'lg:';

  /** Extra large devices (1280px+) */
  xl: 'xl:';

  /** 2XL devices (1536px+) */
  '2xl': '2xl:';

  /** 3XL devices (1600px+) */
  '3xl': '3xl:';
}

/**
 * Glassmorphic Responsive Adjustments
 * Device-specific glassmorphic modifications
 */
export interface GlassmorphicResponsiveConfig {
  /** Mobile (<768px) - reduced blur for performance */
  mobile: {
    backdropBlur: 'backdrop-blur-sm';
    borderWidth: 'border';
  };

  /** Tablet (768px-1024px) - standard blur */
  tablet: {
    backdropBlur: 'backdrop-blur-md';
    borderWidth: 'border-2';
  };

  /** Desktop (1024px+) - enhanced blur */
  desktop: {
    backdropBlur: 'backdrop-blur-lg';
    borderWidth: 'border-2';
  };
}

export const glassmorphicResponsive: GlassmorphicResponsiveConfig = {
  mobile: {
    backdropBlur: 'backdrop-blur-sm',
    borderWidth: 'border',
  },
  tablet: {
    backdropBlur: 'backdrop-blur-md',
    borderWidth: 'border-2',
  },
  desktop: {
    backdropBlur: 'backdrop-blur-lg',
    borderWidth: 'border-2',
  },
};

// ============================================================================
// Hover State Configuration
// ============================================================================

/**
 * Interactive State Class Names
 * Hover, focus, and active states
 */
export interface InteractiveStateClasses {
  /** Standard hover effect */
  hover: string;

  /** Hover with scale */
  hoverScale: string;

  /** Hover with brightness */
  hoverBright: string;

  /** Focus ring (accessibility) */
  focus: string;

  /** Active/pressed state */
  active: string;

  /** Disabled state */
  disabled: string;
}

export const interactiveStates: InteractiveStateClasses = {
  hover: 'hover:opacity-90 transition-opacity duration-200',

  hoverScale: 'hover:scale-105 transition-transform duration-200',

  hoverBright: 'hover:brightness-110 transition-all duration-200',

  focus: 'focus:outline-none focus:ring-2 focus:ring-corporate-accentPrimary focus:ring-offset-2',

  active: 'active:scale-95 transition-transform duration-100',

  disabled: 'disabled:opacity-50 disabled:cursor-not-allowed',
};

// ============================================================================
// Text Styling Configuration
// ============================================================================

/**
 * Typography Class Names
 * Text colors and sizes for dark theme
 */
export interface TypographyClasses {
  /** Heading text (primary) */
  heading: string;

  /** Body text (secondary) */
  body: string;

  /** Muted text (tertiary) */
  muted: string;

  /** Link text */
  link: string;

  /** Error text */
  error: string;

  /** Success text */
  success: string;
}

export const typographyClasses: TypographyClasses = {
  heading: 'text-corporate-textPrimary font-bold',
  body: 'text-corporate-textSecondary',
  muted: 'text-corporate-textTertiary',
  link: 'text-corporate-accentPrimary hover:text-corporate-accentPrimaryHover underline transition-colors',
  error: 'text-status-error',
  success: 'text-status-success',
};

// ============================================================================
// Layout Configuration
// ============================================================================

/**
 * Layout Container Class Names
 */
export interface LayoutClasses {
  /** Max-width container */
  container: string;

  /** Section wrapper */
  section: string;

  /** Grid layout (responsive) */
  grid: string;

  /** Flex layout (responsive) */
  flex: string;
}

export const layoutClasses: LayoutClasses = {
  container: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8',

  section: 'py-12 md:py-16 lg:py-20',

  grid: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8',

  flex: 'flex flex-col md:flex-row gap-4 md:gap-6',
};

// ============================================================================
// Component-Specific Configurations
// ============================================================================

/**
 * Button Style Variants
 */
export interface ButtonVariantClasses {
  primary: string;
  secondary: string;
  outline: string;
  ghost: string;
}

export const buttonVariants: ButtonVariantClasses = {
  primary: 'bg-corporate-accentPrimary text-white hover:bg-corporate-accentPrimaryHover',

  secondary: 'bg-corporate-bgSecondary text-corporate-textPrimary hover:bg-corporate-bgTertiary',

  outline: 'border-2 border-corporate-accentPrimary text-corporate-accentPrimary hover:bg-corporate-accentPrimary/10',

  ghost: 'text-corporate-accentPrimary hover:bg-corporate-accentPrimary/10',
};

/**
 * Badge Style Variants
 */
export interface BadgeVariantClasses {
  success: string;
  warning: string;
  error: string;
  info: string;
  default: string;
}

export const badgeVariants: BadgeVariantClasses = {
  success: 'bg-status-success/20 text-status-success border border-status-success/40',

  warning: 'bg-status-warning/20 text-status-warning border border-status-warning/40',

  error: 'bg-status-error/20 text-status-error border border-status-error/40',

  info: 'bg-status-info/20 text-status-info border border-status-info/40',

  default: 'bg-corporate-bgTertiary text-corporate-textPrimary border border-corporate-borderPrimary',
};

// ============================================================================
// Export All Style Configurations
// ============================================================================

export {
  TailwindColorExtension,
  TailwindThemeExtension,
  GlassmorphicClassNames,
  AnimationClassNames,
  ResponsiveModifiers,
  GlassmorphicResponsiveConfig,
  InteractiveStateClasses,
  TypographyClasses,
  LayoutClasses,
  ButtonVariantClasses,
  BadgeVariantClasses,
};

/**
 * Complete style configuration export
 * Import this in marketing portal for consistent styling
 */
export const styleConfig = {
  glassmorphic: glassmorphicClasses,
  animations: animationClasses,
  responsive: glassmorphicResponsive,
  interactive: interactiveStates,
  typography: typographyClasses,
  layout: layoutClasses,
  button: buttonVariants,
  badge: badgeVariants,
} as const;

export default styleConfig;
