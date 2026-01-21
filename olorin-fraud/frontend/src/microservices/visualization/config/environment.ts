/**
 * Environment Configuration Loader
 *
 * This module provides a singleton configuration instance for the visualization service.
 * Configuration is loaded once at startup and validated using the Zod schema.
 *
 * The loader implements fail-fast behavior:
 * - Missing required environment variables will throw an error
 * - Invalid configuration values will throw an error
 * - Service will not start if configuration is invalid
 *
 * Usage:
 *   import { visualizationConfig } from './config/environment';
 *   const apiKey = visualizationConfig.googleMaps.apiKey;
 */

import { loadVisualizationConfig, VisualizationConfig } from './validation';

/**
 * Singleton configuration instance
 *
 * This is loaded once when the module is first imported.
 * Any subsequent imports will receive the same validated configuration object.
 */
let configInstance: VisualizationConfig | null = null;

/**
 * Get the validated configuration instance
 *
 * This function performs lazy initialization - the config is loaded
 * on first access and cached for subsequent calls.
 *
 * @throws {Error} If configuration validation fails
 * @returns {VisualizationConfig} Validated configuration object
 */
export function getVisualizationConfig(): VisualizationConfig {
  if (!configInstance) {
    try {
      configInstance = loadVisualizationConfig();
    } catch (error) {
      console.error('❌ Failed to load visualization service configuration');
      console.error('   Please check your environment variables and try again.');
      console.error('   See .env.example for required configuration.');
      throw error;
    }
  }

  return configInstance;
}

/**
 * Reset the configuration instance (for testing purposes only)
 *
 * This should NEVER be used in production code.
 * It exists solely to allow tests to reload configuration with different values.
 */
export function resetVisualizationConfig(): void {
  if (process.env.NODE_ENV !== 'test') {
    console.warn('⚠️  WARNING: resetVisualizationConfig() called outside test environment!');
  }
  configInstance = null;
}

/**
 * Exported singleton configuration instance
 *
 * For browser-based frontend components, this will be null until explicitly loaded.
 * Most visualization components work with sensible defaults and don't require configuration.
 *
 * If you need configuration, call getVisualizationConfig() which will load it lazily.
 * For components that check config, use optional chaining: visualizationConfig?.defaults?.defaultColorPalette
 */
export const visualizationConfig = configInstance;

/**
 * Default export for convenience
 */
export default visualizationConfig;
