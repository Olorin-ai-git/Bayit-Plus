// Core design token types
export type ColorScale = '50' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900' | '950';

export type BreakpointKey = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export type SpacingScale =
  | '0' | 'px' | '0.5' | '1' | '1.5' | '2' | '2.5' | '3' | '3.5' | '4' | '5' | '6'
  | '7' | '8' | '9' | '10' | '11' | '12' | '14' | '16' | '20' | '24' | '28' | '32'
  | '36' | '40' | '44' | '48' | '52' | '56' | '60' | '64' | '72' | '80' | '96';

export type FontWeight = '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900';

export type BorderRadius = 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full';

export type Shadow = 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'inner';

export type ComponentSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export type ComponentVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' | 'ghost' | 'outline' | 'solid';

export type ComponentState = 'default' | 'hover' | 'focus' | 'active' | 'disabled' | 'loading';

// Color system
export interface ColorToken {
  name: string;
  value: string;
  description?: string;
  accessibility?: {
    contrastRatio?: number;
    wcagLevel?: 'AA' | 'AAA';
  };
}

export interface ColorPalette {
  [key: string]: {
    [scale in ColorScale]?: ColorToken;
  };
}

export interface SemanticColors {
  primary: ColorPalette;
  secondary: ColorPalette;
  success: ColorPalette;
  warning: ColorPalette;
  error: ColorPalette;
  info: ColorPalette;
  neutral: ColorPalette;
}

// Typography system
export interface FontFamily {
  name: string;
  stack: string[];
  description?: string;
  usage?: string[];
}

export interface TypographyScale {
  fontSize: string;
  lineHeight: string;
  letterSpacing?: string;
  fontWeight?: FontWeight;
}

export interface TypographyToken {
  name: string;
  fontFamily: string;
  scale: TypographyScale;
  description?: string;
  usage?: string[];
}

export interface TypographySystem {
  fontFamilies: {
    sans: FontFamily;
    serif: FontFamily;
    mono: FontFamily;
  };
  scales: {
    xs: TypographyScale;
    sm: TypographyScale;
    base: TypographyScale;
    lg: TypographyScale;
    xl: TypographyScale;
    '2xl': TypographyScale;
    '3xl': TypographyScale;
    '4xl': TypographyScale;
    '5xl': TypographyScale;
    '6xl': TypographyScale;
    '7xl': TypographyScale;
    '8xl': TypographyScale;
    '9xl': TypographyScale;
  };
  semantic: {
    h1: TypographyToken;
    h2: TypographyToken;
    h3: TypographyToken;
    h4: TypographyToken;
    h5: TypographyToken;
    h6: TypographyToken;
    body: TypographyToken;
    caption: TypographyToken;
    overline: TypographyToken;
    code: TypographyToken;
  };
}

// Spacing system
export interface SpacingToken {
  name: string;
  value: string;
  pixels: number;
  description?: string;
}

export interface SpacingSystem {
  [key in SpacingScale]: SpacingToken;
}

// Layout system
export interface BreakpointToken {
  name: string;
  value: string;
  pixels: number;
  description?: string;
}

export interface LayoutSystem {
  breakpoints: {
    [key in BreakpointKey]: BreakpointToken;
  };
  containers: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
  };
  grid: {
    columns: number;
    gap: string;
    gutters: {
      sm: string;
      md: string;
      lg: string;
    };
  };
}

// Component tokens
export interface ComponentTokens {
  spacing: {
    padding: {
      [size in ComponentSize]: {
        x: SpacingScale;
        y: SpacingScale;
      };
    };
    margin: {
      [size in ComponentSize]: SpacingScale;
    };
  };
  borderRadius: {
    [size in ComponentSize]: BorderRadius;
  };
  shadows: {
    [size in ComponentSize]: Shadow;
  };
  typography: {
    [size in ComponentSize]: keyof TypographySystem['scales'];
  };
}

// Component definitions
export interface ComponentVariantDefinition {
  backgroundColor?: string;
  borderColor?: string;
  textColor?: string;
  borderWidth?: string;
  opacity?: number;
}

export interface ComponentStateDefinition {
  [state in ComponentState]?: ComponentVariantDefinition;
}

export interface ComponentDefinition {
  name: string;
  description?: string;
  baseStyles: ComponentVariantDefinition;
  variants: {
    [variant in ComponentVariant]?: ComponentStateDefinition;
  };
  sizes: {
    [size in ComponentSize]?: {
      padding?: string;
      fontSize?: string;
      borderRadius?: string;
      height?: string;
      minWidth?: string;
    };
  };
  tokens: ComponentTokens;
  examples?: ComponentExample[];
}

export interface ComponentExample {
  name: string;
  description?: string;
  props: Record<string, any>;
  code: string;
  preview?: string;
}

// Theme structure
export interface DesignTheme {
  name: string;
  version: string;
  description?: string;
  colors: SemanticColors;
  typography: TypographySystem;
  spacing: SpacingSystem;
  layout: LayoutSystem;
  borderRadius: {
    [key in BorderRadius]: string;
  };
  shadows: {
    [key in Shadow]: string;
  };
  animation: {
    duration: {
      fast: string;
      normal: string;
      slow: string;
    };
    easing: {
      linear: string;
      easeIn: string;
      easeOut: string;
      easeInOut: string;
    };
  };
  zIndex: {
    dropdown: number;
    modal: number;
    popover: number;
    tooltip: number;
    overlay: number;
  };
}

// Component library
export interface ComponentLibrary {
  name: string;
  version: string;
  theme: DesignTheme;
  components: {
    [componentName: string]: ComponentDefinition;
  };
  patterns: {
    [patternName: string]: PatternDefinition;
  };
  tokens: DesignTokens;
}

export interface PatternDefinition {
  name: string;
  description?: string;
  category: 'layout' | 'navigation' | 'forms' | 'feedback' | 'data-display' | 'content';
  components: string[];
  usage: string;
  examples: PatternExample[];
}

export interface PatternExample {
  name: string;
  description?: string;
  code: string;
  preview?: string;
  figmaUrl?: string;
}

// Design tokens
export interface DesignTokens {
  colors: {
    [tokenName: string]: ColorToken;
  };
  typography: {
    [tokenName: string]: TypographyToken;
  };
  spacing: {
    [tokenName: string]: SpacingToken;
  };
  effects: {
    shadows: {
      [tokenName: string]: {
        name: string;
        value: string;
        description?: string;
      };
    };
    borders: {
      [tokenName: string]: {
        name: string;
        width: string;
        style: string;
        color: string;
        radius?: string;
        description?: string;
      };
    };
  };
}

// Icon system
export interface IconDefinition {
  name: string;
  category: string;
  keywords: string[];
  sizes: ComponentSize[];
  variants?: string[];
  svg: string;
  unicodePoint?: string;
}

export interface IconLibrary {
  name: string;
  version: string;
  icons: {
    [iconName: string]: IconDefinition;
  };
  categories: {
    [categoryName: string]: {
      name: string;
      description?: string;
      icons: string[];
    };
  };
}

// Documentation
export interface ComponentDocumentation {
  name: string;
  description: string;
  category: string;
  status: 'stable' | 'beta' | 'alpha' | 'deprecated';
  props: ComponentProp[];
  examples: ComponentExample[];
  designGuidelines?: string;
  accessibilityNotes?: string;
  relatedComponents?: string[];
  changelog?: ChangelogEntry[];
}

export interface ComponentProp {
  name: string;
  type: string;
  required: boolean;
  defaultValue?: any;
  description: string;
  options?: any[];
  deprecated?: boolean;
}

export interface ChangelogEntry {
  version: string;
  date: string;
  type: 'added' | 'changed' | 'deprecated' | 'removed' | 'fixed' | 'security';
  description: string;
}

// Figma integration
export interface FigmaComponent {
  id: string;
  name: string;
  description?: string;
  figmaUrl: string;
  thumbnailUrl?: string;
  lastUpdated: string;
  tokens: {
    colors: string[];
    typography: string[];
    spacing: string[];
  };
}

export interface FigmaLibrary {
  fileKey: string;
  fileName: string;
  components: {
    [componentId: string]: FigmaComponent;
  };
  lastSync: string;
}

// Build and export
export interface BuildConfig {
  platforms: ('web' | 'ios' | 'android' | 'figma')[];
  formats: ('css' | 'scss' | 'json' | 'js' | 'ts' | 'swift' | 'kotlin')[];
  prefix?: string;
  namespace?: string;
  minify: boolean;
  includeDocumentation: boolean;
}

export interface ExportResult {
  platform: string;
  format: string;
  content: string;
  fileName: string;
  size: number;
  generatedAt: string;
}

// Validation and linting
export interface DesignRule {
  id: string;
  name: string;
  description: string;
  category: 'color' | 'typography' | 'spacing' | 'accessibility' | 'consistency';
  severity: 'error' | 'warning' | 'info';
  autoFixable: boolean;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  info: ValidationIssue[];
}

export interface ValidationIssue {
  rule: string;
  message: string;
  location?: {
    component?: string;
    property?: string;
    value?: string;
  };
  suggestion?: string;
  autoFix?: () => void;
}

// Usage analytics
export interface ComponentUsage {
  componentName: string;
  variant?: string;
  size?: string;
  usageCount: number;
  projects: string[];
  lastUsed: string;
}

export interface DesignSystemAnalytics {
  totalComponents: number;
  totalTokens: number;
  adoption: {
    componentsUsed: number;
    tokensUsed: number;
    adoptionRate: number;
  };
  usage: ComponentUsage[];
  trends: {
    popularComponents: string[];
    growingComponents: string[];
    deprecatedUsage: string[];
  };
  coverage: {
    designCoverage: number;
    implementationCoverage: number;
    documentationCoverage: number;
  };
}

// Team collaboration
export interface DesignSystemTeam {
  designers: TeamMember[];
  developers: TeamMember[];
  maintainers: TeamMember[];
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'designer' | 'developer' | 'maintainer' | 'contributor';
  permissions: Permission[];
  lastActive: string;
}

export interface Permission {
  action: 'read' | 'write' | 'delete' | 'publish' | 'admin';
  resource: 'components' | 'tokens' | 'documentation' | 'settings';
}

// Versioning and releases
export interface DesignSystemVersion {
  version: string;
  releaseDate: string;
  releaseNotes: string;
  breaking: boolean;
  changes: ChangelogEntry[];
  assets: {
    [platform: string]: {
      [format: string]: string; // URL to download
    };
  };
}

export interface ReleaseSchedule {
  type: 'major' | 'minor' | 'patch';
  plannedDate: string;
  features: string[];
  status: 'planned' | 'in-progress' | 'testing' | 'released';
}