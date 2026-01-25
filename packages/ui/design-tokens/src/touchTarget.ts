/**
 * Olorin Design System - Touch Target Sizes
 * Accessibility-first touch target dimensions
 * Based on WCAG 2.1 Level AAA guidelines and Apple HIG
 */

export interface TouchTarget {
  /** Minimum touch target height (44pt per Apple HIG) */
  minHeight: number;
  /** Minimum touch target width (44pt per Apple HIG) */
  minWidth: number;
  /** Recommended touch target height (48pt per WCAG) */
  recommendedHeight: number;
  /** Recommended touch target width (48pt per WCAG) */
  recommendedWidth: number;
  /** Large touch target for primary actions (56pt) */
  largeHeight: number;
  /** Large touch target for primary actions (56pt) */
  largeWidth: number;
}

/**
 * Touch target sizes following accessibility guidelines
 * - iOS HIG: 44x44pt minimum
 * - WCAG 2.1 AAA: 48x48px recommended
 * - Large targets: 56x56px for primary actions
 */
export const touchTarget: TouchTarget = {
  minHeight: 44,
  minWidth: 44,
  recommendedHeight: 48,
  recommendedWidth: 48,
  largeHeight: 56,
  largeWidth: 56,
};

export default touchTarget;
