// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts/**
 * Portal Theme and Styling Types
 * 
 * Theme, color scheme, and typography definitions for portal customization.
 * Extracted from portal.ts to maintain <200 line compliance.
 * 
 * @author Gil Klainert
 * @version 1.0.0
 */

/**
 * Portal theme configuration
 */
export interface PortalTheme {
  /** Theme identifier */
  id: string;
  
  /** Theme display name */
  name: string;
  
  /** Color scheme */
  colors: ColorScheme;
  
  /** Typography settings */
  typography: TypographyConfig;
  
  /** Spacing configuration */
  spacing: {
    /** Base unit for spacing (in rem) */
    baseUnit: number;
    
    /** Section padding */
    sectionPadding: number;
    
    /** Element margins */
    elementMargin: number;
  };
  
  /** Border radius settings */
  borderRadius: {
    /** Small radius (buttons, inputs) */
    sm: string;
    
    /** Medium radius (cards, panels) */
    md: string;
    
    /** Large radius (hero sections) */
    lg: string;
  };
  
  /** Shadow settings */
  shadows: {
    /** Light shadow */
    sm: string;
    
    /** Medium shadow */
    md: string;
    
    /** Heavy shadow */
    lg: string;
  };
  
  /** Background images */
  backgroundImages?: {
    /** Hero section background */
    hero?: string;
    
    /** Section backgrounds */
    sections?: string[];
    
    /** Pattern overlays */
    patterns?: string[];
  };
}

/**
 * Color scheme definition
 */
export interface ColorScheme {
  /** Primary brand color */
  primary: string;
  
  /** Secondary accent color */
  secondary: string;
  
  /** Secondary text color (legacy alias) */
  textSecondary?: string;
  
  /** Dark background color (legacy alias) */
  backgroundDark?: string;
  
  /** Background colors */
  background: {
    /** Main background */
    primary: string;
    
    /** Secondary background (cards, panels) */
    secondary: string;
    
    /** Accent background */
    accent: string;
  };
  
  /** Text colors */
  text: {
    /** Primary text */
    primary: string;
    
    /** Secondary text */
    secondary: string;
    
    /** Muted text */
    muted: string;
    
    /** Accent text */
    accent: string;
  };
  
  /** Border colors */
  border: {
    /** Primary border */
    primary: string;
    
    /** Light border */
    light: string;
    
    /** Accent border */
    accent: string;
  };
  
  /** Status colors */
  status: {
    /** Success color */
    success: string;
    
    /** Warning color */
    warning: string;
    
    /** Error color */
    error: string;
    
    /** Info color */
    info: string;
  };
  
  /** Gradient colors */
  gradients?: {
    /** Primary gradient */
    primary: string;
    
    /** Secondary gradient */
    secondary: string;
    
    /** Hero gradient */
    hero: string;
  };
}

/**
 * Typography configuration
 */
export interface TypographyConfig {
  /** Font family definitions */
  fontFamilies: {
    /** Heading font */
    heading: string;
    
    /** Body text font */
    body: string;
    
    /** Monospace font */
    mono: string;
  };
  
  /** Font sizes */
  fontSizes: {
    /** Extra small text */
    xs: string;
    
    /** Small text */
    sm: string;
    
    /** Base text size */
    base: string;
    
    /** Large text */
    lg: string;
    
    /** Extra large text */
    xl: string;
    
    /** 2X large text */
    '2xl': string;
    
    /** 3X large text */
    '3xl': string;
    
    /** 4X large text */
    '4xl': string;
  };
  
  /** Font weights */
  fontWeights: {
    /** Light weight */
    light: number;
    
    /** Normal weight */
    normal: number;
    
    /** Medium weight */
    medium: number;
    
    /** Semi-bold weight */
    semibold: number;
    
    /** Bold weight */
    bold: number;
  };
  
  /** Line heights */
  lineHeights: {
    /** Tight line height */
    tight: number;
    
    /** Normal line height */
    normal: number;
    
    /** Relaxed line height */
    relaxed: number;
  };
}

/**
 * Predefined theme presets
 */
export const THEME_PRESETS = {
  PROFESSIONAL: 'professional',
  CREATIVE: 'creative',
  MINIMAL: 'minimal',
  MODERN: 'modern',
  DARK: 'dark',
  LIGHT: 'light'
} as const;

/**
 * Portal sections that can be styled
 */
export enum PortalSection {
  HEADER = 'header',
  HERO = 'hero',
  ABOUT = 'about',
  EXPERIENCE = 'experience',
  SKILLS = 'skills',
  EDUCATION = 'education',
  PROJECTS = 'projects',
  CONTACT = 'contact',
  FOOTER = 'footer',
  SIDEBAR = 'sidebar',
  CHAT = 'chat',
  QR_CODE = 'qr_code',
  ACHIEVEMENTS = 'achievements',
  CERTIFICATIONS = 'certifications',
  PORTFOLIO = 'portfolio',
  TESTIMONIALS = 'testimonials',
  BLOG = 'blog',
  PUBLICATIONS = 'publications'
}