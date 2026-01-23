import { ASSET_PATHS, WIZARD_LOGO_METADATA, type WizardVariant } from '../constants';

/**
 * Get the path for a wizard logo variant
 * @param variant - The wizard logo variant (main, fraud, streaming, radio, omen)
 * @returns The path to the logo image
 */
export function getWizardLogoPath(variant: WizardVariant): string {
  return ASSET_PATHS.logos.wizard[variant];
}

/**
 * Get metadata for a wizard logo variant
 * @param variant - The wizard logo variant
 * @returns Metadata including name and alt text
 */
export function getWizardLogoMetadata(variant: WizardVariant) {
  return WIZARD_LOGO_METADATA[variant];
}

/**
 * Get the Olorin primary logo path
 */
export function getOlorinLogoPath(): string {
  return ASSET_PATHS.logos.olorin;
}

/**
 * Get the Olorin text logo path
 */
export function getOlorinTextLogoPath(): string {
  return ASSET_PATHS.logos.olorinText;
}
