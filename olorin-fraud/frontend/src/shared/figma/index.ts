/**
 * Figma Integration for Olorin Microservices
 * Provides design-to-code automation, token synchronization, and visual consistency
 */

export { FigmaMCPClient, createFigmaMCPClient, FigmaServiceHelpers } from './figma-mcp';
export type {
  FigmaToken,
  FigmaComponent,
  FigmaComponentVariant,
  FigmaFrame,
  FigmaNode,
  FigmaFileResponse,
  FigmaConfig
} from './figma-mcp';

export {
  getDesignTokens,
  updateDesignTokens,
  getServiceColors,
  defaultDesignTokens
} from './design-tokens';
export type {
  DesignTokens,
  ColorTokens,
  TypographyTokens,
  SpacingTokens,
  ShadowTokens,
  BorderTokens,
  AnimationTokens
} from './design-tokens';

// Re-export for convenience
export { default as DesignTokensManager } from './design-tokens';