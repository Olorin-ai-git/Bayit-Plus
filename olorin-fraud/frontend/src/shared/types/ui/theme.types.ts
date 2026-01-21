/**
 * Theme and UI Types
 * SINGLE SOURCE OF TRUTH for UI theming types
 */

export interface Theme {
  mode: 'light' | 'dark';
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  customizations: Record<string, any>;
}

export interface ComponentProps {
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
  testId?: string;
}
