/**
 * Shared branding types for Olorin portal ecosystem
 */

/**
 * Portal domain variants
 * - main: Olorin.AI (parent portal)
 * - fraud: Olorin.AI Fraud Detection
 * - streaming: Olorin.ai Media Enrichment (streaming services)
 * - radio: Olorin.ai Media Enrichment (radio management)
 * - omen: Olorin.AI Omen (speech translation)
 * - station: Olorin.AI Station (media station management)
 * - cvplus: Olorin.AI CVPlus (professional CV builder)
 */
export type PortalDomain = 'main' | 'fraud' | 'streaming' | 'radio' | 'omen' | 'station' | 'cvplus';

/**
 * Extended accent color type including 'purple' for backward compatibility
 * with existing components that support a generic purple accent
 */
export type AccentColor = PortalDomain | 'purple';

/**
 * Brand configuration per portal domain
 */
export interface PortalBrandConfig {
  logoText: string;
  shortName: string;
  fullName: string;
  description: string;
}

/**
 * Brand configurations for all portal domains
 */
export const PORTAL_BRANDS: Record<PortalDomain, PortalBrandConfig> = {
  main: {
    logoText: 'OLORIN.AI',
    shortName: 'Olorin.ai',
    fullName: 'Olorin.AI',
    description: 'Enterprise AI Solutions',
  },
  fraud: {
    logoText: 'OLORIN.AI FRAUD',
    shortName: 'Olorin Fraud',
    fullName: 'Olorin.AI Fraud Detection',
    description: 'AI-Powered Fraud Detection',
  },
  streaming: {
    logoText: 'OLORIN.AI MEDIA ENRICHMENT',
    shortName: 'Olorin Media',
    fullName: 'Olorin.ai Media Enrichment',
    description: 'AI-Driven Media Streaming',
  },
  radio: {
    logoText: 'OLORIN.AI MEDIA ENRICHMENT',
    shortName: 'Olorin Media',
    fullName: 'Olorin.ai Media Enrichment',
    description: 'Intelligent Radio Management',
  },
  omen: {
    logoText: 'OLORIN.AI OMEN',
    shortName: 'Olorin Omen',
    fullName: 'Olorin.AI Omen',
    description: 'Real-Time Speech Translation',
  },
  station: {
    logoText: 'OLORIN.AI STATION',
    shortName: 'Olorin Station',
    fullName: 'Olorin.AI Station',
    description: 'Media Station Management',
  },
  cvplus: {
    logoText: 'OLORIN.AI CVPLUS',
    shortName: 'Olorin CVPlus',
    fullName: 'Olorin.AI CVPlus',
    description: 'Professional CV Builder',
  },
};
