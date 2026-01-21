/**
 * Core Pricing Configuration Types and Base Implementation
 *
 * Provides basic pricing types and utility functions that can be extended
 * by higher-layer modules (e.g., @cvplus/premium).
 *
 * @author Gil Klainert
 * @version 1.0.0
  */

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

/**
 * Supported subscription tiers (base definition)
  */
export type SubscriptionTier = 'FREE' | 'PREMIUM';

/**
 * Supported currencies
  */
export type Currency = 'USD' | 'EUR' | 'GBP';

/**
 * Environment types for different configurations
  */
export type Environment = 'development' | 'staging' | 'production';

/**
 * Basic price configuration structure
  */
export interface PriceConfig {
  /** Price in cents (to avoid floating point issues)  */
  cents: number;
  /** Price in dollars (for display)  */
  dollars: number;
  /** Currency code  */
  currency: Currency;
}

/**
 * Basic tier configuration structure
  */
export interface TierConfig {
  /** Tier identifier  */
  tier: SubscriptionTier;
  /** Display name  */
  name: string;
  /** Description  */
  description: string;
  /** Price configuration  */
  price: PriceConfig;
  /** Whether this tier is currently available  */
  isActive: boolean;
}

/**
 * Core pricing configuration interface
  */
export interface PricingConfig {
  /** All available tiers  */
  tiers: Record<SubscriptionTier, TierConfig>;
  /** Default currency  */
  defaultCurrency: Currency;
  /** Current environment  */
  environment: Environment;
}

// =============================================================================
// ENVIRONMENT DETECTION
// =============================================================================

/**
 * Get current environment from environment variables
  */
const getCurrentEnvironment = (): Environment => {
  const nodeEnv = process.env.NODE_ENV;
  const functionsEmulator = process.env.FUNCTIONS_EMULATOR;

  // If running in Firebase emulator
  if (functionsEmulator === 'true' || functionsEmulator === '1') {
    return 'development';
  }

  // Standard NODE_ENV mapping
  switch (nodeEnv) {
    case 'development':
      return 'development';
    case 'staging':
      return 'staging';
    case 'production':
      return 'production';
    default:
      return 'development'; // Default fallback
  }
};

// =============================================================================
// BASIC PRICING CONFIGURATION
// =============================================================================

/**
 * Base pricing configuration for core module
 * Note: This is extended by @cvplus/premium for full functionality
  */
export const BACKEND_PRICING_CONFIG: PricingConfig = {
  defaultCurrency: 'USD',
  environment: getCurrentEnvironment(),

  tiers: {
    FREE: {
      tier: 'FREE',
      name: 'Free',
      description: 'Basic CV features with usage limits',
      price: {
        cents: 0,
        dollars: 0,
        currency: 'USD'
      },
      isActive: true
    },

    PREMIUM: {
      tier: 'PREMIUM',
      name: 'Premium',
      description: 'Full feature access with premium benefits',
      price: {
        cents: 4900, // $49.00 in cents
        dollars: 49,
        currency: 'USD'
      },
      isActive: true
    }
  }
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get tier configuration by tier type
  */
export const getTierConfig = (tier: SubscriptionTier): TierConfig => {
  return BACKEND_PRICING_CONFIG.tiers[tier];
};

/**
 * Get price in cents for a specific tier
  */
export const getPriceInCents = (tier: SubscriptionTier): number => {
  return getTierConfig(tier).price.cents;
};

/**
 * Get price in dollars for a specific tier
  */
export const getPriceInDollars = (tier: SubscriptionTier): number => {
  return getTierConfig(tier).price.dollars;
};

/**
 * Format price for display
  */
export const formatPrice = (tier: SubscriptionTier, showCurrency = true): string => {
  const config = getTierConfig(tier);

  if (config.price.dollars === 0) {
    return 'Free';
  }

  const currencySymbol = config.price.currency === 'USD' ? '$' :
                        config.price.currency === 'EUR' ? '€' :
                        config.price.currency === 'GBP' ? '£' : '$';

  return showCurrency ? `${currencySymbol}${config.price.dollars}` : config.price.dollars.toString();
};

/**
 * Basic validation of pricing configuration
  */
export const validatePricingConfig = (): { isValid: boolean; errors: string[]; warnings: string[] } => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if all tiers have required fields
  Object.values(BACKEND_PRICING_CONFIG.tiers).forEach(tier => {
    if (!tier.name || tier.name.trim() === '') {
      errors.push(`Tier ${tier.tier} is missing name`);
    }

    if (tier.tier === 'PREMIUM' && tier.price.cents <= 0) {
      errors.push(`Premium tier must have a positive price`);
    }
  });

  // Basic configuration validation
  if (!BACKEND_PRICING_CONFIG.defaultCurrency) {
    errors.push('Default currency is not configured');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * Type guard to check if a tier is premium
  */
export const isPremiumTier = (tier: SubscriptionTier): boolean => {
  return tier === 'PREMIUM';
};

/**
 * Check if pricing is properly configured
  */
export const isPricingConfigured = (): boolean => {
  const validation = validatePricingConfig();
  return validation.isValid;
};

// =============================================================================
// EXPORTS
// =============================================================================

// Export main configuration as default
export default BACKEND_PRICING_CONFIG;