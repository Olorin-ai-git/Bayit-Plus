/**
 * @olorin/assets
 * Centralized asset package for the Olorin ecosystem
 *
 * This package provides unified access to all brand assets including:
 * - Favicons (8 sizes)
 * - Wizard logos (5 portal variants)
 * - Olorin brand logos
 * - Shared icons
 */

export {
  FAVICON_SIZES,
  WIZARD_VARIANTS,
  ASSET_PATHS,
  FAVICON_METADATA,
  WIZARD_LOGO_METADATA,
  type FaviconSize,
  type WizardVariant,
} from './constants';

export { getWizardLogoPath, getWizardLogoMetadata } from './utils/logo';
export { getFaviconPath, getFaviconMetadata, generateFaviconLinks } from './utils/favicon';
