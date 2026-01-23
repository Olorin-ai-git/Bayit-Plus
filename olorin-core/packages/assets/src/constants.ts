/**
 * Olorin Asset Constants
 * Centralized asset paths and metadata for the Olorin ecosystem
 */

export const FAVICON_SIZES = [16, 32, 64, 128, 192, 512] as const;
export type FaviconSize = typeof FAVICON_SIZES[number];

export const WIZARD_VARIANTS = ['main', 'fraud', 'streaming', 'radio', 'omen'] as const;
export type WizardVariant = typeof WIZARD_VARIANTS[number];

/**
 * Asset path constants for runtime usage
 * These paths assume assets are copied to the public directory at build time
 */
export const ASSET_PATHS = {
  favicons: {
    '16x16': '/favicons/16x16.png',
    '32x32': '/favicons/32x32.png',
    '64x64': '/favicons/64x64.png',
    '128x128': '/favicons/128x128.png',
    '192x192': '/favicons/192x192.png',
    '512x512': '/favicons/512x512.png',
    'apple-touch-icon': '/favicons/apple-touch-icon.png',
    'ico': '/favicons/favicon.ico',
  },
  logos: {
    wizard: {
      main: '/logos/wizard/main.png',
      fraud: '/logos/wizard/fraud.png',
      streaming: '/logos/wizard/streaming.png',
      radio: '/logos/wizard/radio.png',
      omen: '/logos/wizard/omen.png',
    },
    olorin: '/logos/olorin-logo.png',
    olorinText: '/logos/olorin-text-logo.png',
  },
} as const;

/**
 * Favicon metadata for HTML generation
 */
export const FAVICON_METADATA = [
  {
    rel: 'icon',
    type: 'image/png',
    sizes: '16x16',
    href: ASSET_PATHS.favicons['16x16'],
  },
  {
    rel: 'icon',
    type: 'image/png',
    sizes: '32x32',
    href: ASSET_PATHS.favicons['32x32'],
  },
  {
    rel: 'icon',
    type: 'image/png',
    sizes: '64x64',
    href: ASSET_PATHS.favicons['64x64'],
  },
  {
    rel: 'icon',
    type: 'image/png',
    sizes: '128x128',
    href: ASSET_PATHS.favicons['128x128'],
  },
  {
    rel: 'icon',
    type: 'image/png',
    sizes: '192x192',
    href: ASSET_PATHS.favicons['192x192'],
  },
  {
    rel: 'icon',
    type: 'image/png',
    sizes: '512x512',
    href: ASSET_PATHS.favicons['512x512'],
  },
  {
    rel: 'apple-touch-icon',
    sizes: '180x180',
    href: ASSET_PATHS.favicons['apple-touch-icon'],
  },
  {
    rel: 'shortcut icon',
    href: ASSET_PATHS.favicons.ico,
  },
] as const;

/**
 * Wizard logo variant metadata
 */
export const WIZARD_LOGO_METADATA: Record<WizardVariant, { name: string; alt: string }> = {
  main: {
    name: 'Olorin Main Portal',
    alt: 'Olorin Main Portal Logo',
  },
  fraud: {
    name: 'Olorin Fraud Detection',
    alt: 'Olorin Fraud Detection Logo',
  },
  streaming: {
    name: 'Bayit+ Streaming',
    alt: 'Bayit+ Streaming Logo',
  },
  radio: {
    name: 'Israeli Radio Manager',
    alt: 'Israeli Radio Manager Logo',
  },
  omen: {
    name: 'Omen Intelligence',
    alt: 'Omen Intelligence Logo',
  },
} as const;
