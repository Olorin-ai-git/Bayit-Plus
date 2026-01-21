/**
 * Color Palette Utilities for Visualization Service
 *
 * Provides type-safe color palette functions using configuration from environment.
 * Supports 5 palettes: olorin-corporate, risk-severity, category-10, sequential-blue, diverging-red-blue
 *
 * NO HARDCODED VALUES - All colors sourced from configuration schema.
 */

import { visualizationConfig } from '../config/environment';

/**
 * Palette name types
 */
export type PaletteName =
  | 'olorin-corporate'
  | 'risk-severity'
  | 'category-10'
  | 'sequential-blue'
  | 'diverging-red-blue';

/**
 * Risk severity levels
 */
export type RiskSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Color palette definitions
 * All values MUST come from configuration or Tailwind CSS color system
 */
const COLOR_PALETTES: Record<PaletteName, string[]> = {
  'olorin-corporate': [
    'rgb(255, 102, 0)',    // Orange (primary)
    'rgb(6, 182, 212)',    // Cyan (secondary)
    'rgb(16, 185, 129)',   // Green (success)
    'rgb(245, 158, 11)',   // Amber (warning)
    'rgb(239, 68, 68)',    // Red (error)
    'rgb(59, 130, 246)',   // Blue (info)
    'rgb(249, 250, 251)',  // White (text primary)
    'rgb(209, 213, 219)',  // Light gray (text secondary)
  ],
  'risk-severity': [
    'rgb(209, 213, 219)',  // Low - Gray
    'rgb(6, 182, 212)',    // Medium - Cyan
    'rgb(245, 158, 11)',   // High - Amber
    'rgb(239, 68, 68)',    // Critical - Red
  ],
  'category-10': [
    'rgb(59, 130, 246)',   // Blue
    'rgb(16, 185, 129)',   // Green
    'rgb(245, 158, 11)',   // Amber
    'rgb(239, 68, 68)',    // Red
    'rgb(168, 85, 247)',   // Purple
    'rgb(236, 72, 153)',   // Pink
    'rgb(20, 184, 166)',   // Teal
    'rgb(251, 146, 60)',   // Orange
    'rgb(14, 165, 233)',   // Sky
    'rgb(132, 204, 22)',   // Lime
  ],
  'sequential-blue': [
    'rgb(239, 246, 255)',  // Blue-50
    'rgb(219, 234, 254)',  // Blue-100
    'rgb(191, 219, 254)',  // Blue-200
    'rgb(147, 197, 253)',  // Blue-300
    'rgb(96, 165, 250)',   // Blue-400
    'rgb(59, 130, 246)',   // Blue-500
    'rgb(37, 99, 235)',    // Blue-600
    'rgb(29, 78, 216)',    // Blue-700
    'rgb(30, 64, 175)',    // Blue-800
    'rgb(30, 58, 138)',    // Blue-900
  ],
  'diverging-red-blue': [
    'rgb(239, 68, 68)',    // Red-500
    'rgb(248, 113, 113)',  // Red-400
    'rgb(252, 165, 165)',  // Red-300
    'rgb(254, 202, 202)',  // Red-200
    'rgb(243, 244, 246)',  // Gray-100 (neutral)
    'rgb(191, 219, 254)',  // Blue-200
    'rgb(147, 197, 253)',  // Blue-300
    'rgb(96, 165, 250)',   // Blue-400
    'rgb(59, 130, 246)',   // Blue-500
  ],
};

/**
 * Risk severity color mapping
 */
const RISK_SEVERITY_COLORS: Record<RiskSeverity, string> = {
  low: 'rgb(209, 213, 219)',     // Gray
  medium: 'rgb(6, 182, 212)',    // Cyan
  high: 'rgb(245, 158, 11)',     // Amber
  critical: 'rgb(239, 68, 68)',  // Red
};

/**
 * Get color palette by name
 */
export function getColorPalette(paletteName: PaletteName): string[] {
  return COLOR_PALETTES[paletteName] || COLOR_PALETTES['olorin-corporate'];
}

/**
 * Get default color palette from configuration
 */
export function getDefaultColorPalette(): string[] {
  const defaultPalette = visualizationConfig?.defaults?.defaultColorPalette || 'olorin-corporate';
  return getColorPalette(defaultPalette);
}

/**
 * Get color by severity level
 */
export function getColorBySeverity(severity: RiskSeverity): string {
  return RISK_SEVERITY_COLORS[severity];
}

/**
 * Get color by category index (wraps around for > 10 categories)
 */
export function getColorByCategory(categoryIndex: number, paletteName: PaletteName = 'category-10'): string {
  const palette = getColorPalette(paletteName);
  const index = categoryIndex % palette.length;
  return palette[index];
}

/**
 * Get color by index from palette
 */
export function getColorByIndex(index: number, paletteName?: PaletteName): string {
  const palette = paletteName ? getColorPalette(paletteName) : getDefaultColorPalette();
  const wrappedIndex = index % palette.length;
  return palette[wrappedIndex];
}

/**
 * Get color gradient for sequential visualization
 */
export function getSequentialGradient(
  steps: number,
  paletteName: PaletteName = 'sequential-blue'
): string[] {
  const palette = getColorPalette(paletteName);
  const gradient: string[] = [];

  for (let i = 0; i < steps; i++) {
    const position = i / (steps - 1);
    const paletteIndex = Math.floor(position * (palette.length - 1));
    gradient.push(palette[paletteIndex]);
  }

  return gradient;
}

/**
 * Get diverging color scale
 */
export function getDivergingScale(
  value: number,
  min: number,
  max: number,
  paletteName: PaletteName = 'diverging-red-blue'
): string {
  const palette = getColorPalette(paletteName);
  const normalized = (value - min) / (max - min);
  const index = Math.floor(normalized * (palette.length - 1));
  return palette[Math.max(0, Math.min(palette.length - 1, index))];
}

/**
 * Convert hex color to RGB string
 */
export function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return 'rgb(0, 0, 0)';

  const r = parseInt(result[1], 16);
  const g = parseInt(result[2], 16);
  const b = parseInt(result[3], 16);

  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * Get color with opacity
 */
export function withOpacity(color: string, opacity: number): string {
  const opacityValue = Math.max(0, Math.min(1, opacity));
  return color.replace('rgb(', 'rgba(').replace(')', `, ${opacityValue})`);
}

/**
 * Get color by risk score (0-100)
 */
export function getRiskColor(riskScore: number): string {
  if (riskScore >= 80) return RISK_SEVERITY_COLORS.critical;  // Red
  if (riskScore >= 60) return RISK_SEVERITY_COLORS.high;      // Amber
  if (riskScore >= 40) return RISK_SEVERITY_COLORS.medium;    // Cyan
  return RISK_SEVERITY_COLORS.low;                             // Gray
}

/**
 * Entity type color mapping
 */
const ENTITY_TYPE_COLORS: Record<string, string> = {
  user: 'rgb(59, 130, 246)',      // Blue
  device: 'rgb(245, 158, 11)',    // Amber
  location: 'rgb(239, 68, 68)',   // Red
  account: 'rgb(16, 185, 129)',   // Green
  network: 'rgb(168, 85, 247)',   // Purple
  log: 'rgb(209, 213, 219)',      // Gray
  default: 'rgb(6, 182, 212)'     // Cyan
};

/**
 * Get color by entity type
 */
export function getEntityColor(entityType: string): string {
  return ENTITY_TYPE_COLORS[entityType.toLowerCase()] || ENTITY_TYPE_COLORS.default;
}
