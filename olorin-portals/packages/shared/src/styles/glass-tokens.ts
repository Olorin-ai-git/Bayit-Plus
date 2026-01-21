/**
 * Glass Design System Tokens
 * Standardized glassmorphism design tokens for consistent styling across portals
 */

export const glassTokens = {
  layers: {
    background: 'bg-black/10 backdrop-blur-md',
    card: 'bg-white/5 backdrop-blur-lg border border-white/10',
    cardHover: 'bg-white/10 backdrop-blur-lg border border-white/15',
    modal: 'bg-black/60 backdrop-blur-xl',
    tvos: 'bg-black/70 backdrop-blur-2xl', // 10-foot legibility
    hero: 'bg-black/40 backdrop-blur-xl',
  },
  states: {
    hover: 'hover:bg-white/10 hover:scale-[1.02] transition-all duration-300',
    focus: 'focus:ring-2 focus:ring-white/30 focus:outline-none',
    focusTvos: 'focus:scale-110 focus:ring-4 focus:ring-white/50 transition-all',
    active: 'active:bg-white/15 active:scale-[0.98]',
    disabled: 'opacity-40 cursor-not-allowed',
  },
  borders: {
    subtle: 'border border-white/10',
    medium: 'border border-white/20',
    accent: 'border-2 border-wizard-accent-purple/50',
    accentStrong: 'border-2 border-wizard-accent-purple',
  },
  shadows: {
    glow: 'shadow-lg shadow-wizard-accent-purple/20',
    glowStrong: 'shadow-xl shadow-wizard-accent-purple/30',
    card: 'shadow-lg shadow-black/30',
  },
  text: {
    primary: 'text-white',
    secondary: 'text-white/70',
    muted: 'text-white/50',
    accent: 'text-wizard-accent-purple',
  },
  gradients: {
    hero: 'bg-gradient-to-b from-wizard-bg-deep via-wizard-bg-primary to-wizard-bg-deep',
    card: 'bg-gradient-to-br from-white/10 to-white/5',
    accent: 'bg-gradient-to-r from-wizard-accent-purple to-wizard-accent-streaming',
  },
} as const;

/**
 * Platform-specific glass configurations
 */
export const platformGlass = {
  web: {
    hero: glassTokens.layers.hero,
    card: glassTokens.layers.card,
    focus: glassTokens.states.focus,
  },
  ios: {
    hero: glassTokens.layers.hero,
    card: glassTokens.layers.card,
    focus: glassTokens.states.focus,
  },
  tvos: {
    hero: glassTokens.layers.tvos,
    card: 'bg-white/8 backdrop-blur-xl border border-white/15',
    focus: glassTokens.states.focusTvos,
  },
} as const;

/**
 * Typography scale with Hebrew support (Hebrew 20% larger)
 */
export const typography = {
  h1: 'text-5xl md:text-7xl font-bold leading-tight',
  h1Hebrew: 'text-6xl md:text-8xl font-bold leading-tight',
  h2: 'text-4xl md:text-5xl font-bold leading-snug',
  h2Hebrew: 'text-4xl md:text-6xl font-bold leading-snug',
  h3: 'text-2xl md:text-3xl font-semibold',
  h4: 'text-xl md:text-2xl font-semibold',
  bodyLg: 'text-lg md:text-xl font-normal leading-relaxed',
  body: 'text-base font-normal',
  caption: 'text-sm text-white/70',
  // tvOS specific (10-foot viewing)
  tvosBody: 'text-2xl leading-relaxed',
  tvosH1: 'text-6xl font-bold',
} as const;

export type GlassTokens = typeof glassTokens;
export type PlatformGlass = typeof platformGlass;
export type Typography = typeof typography;
