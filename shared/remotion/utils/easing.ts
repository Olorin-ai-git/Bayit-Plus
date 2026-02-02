/**
 * Easing Functions
 * Custom easing functions for smooth transitions between gestures
 */

/**
 * Cubic ease-in-out - smooth acceleration and deceleration
 */
export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Quadratic ease-in-out - gentle acceleration and deceleration
 */
export function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

/**
 * Exponential ease-in-out - dramatic acceleration and deceleration
 */
export function easeInOutExpo(t: number): number {
  return t === 0
    ? 0
    : t === 1
    ? 1
    : t < 0.5
    ? Math.pow(2, 20 * t - 10) / 2
    : (2 - Math.pow(2, -20 * t + 10)) / 2;
}

/**
 * Sine ease-in-out - smooth sinusoidal transition
 */
export function easeInOutSine(t: number): number {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

/**
 * Linear - no easing
 */
export function linear(t: number): number {
  return t;
}

/**
 * Elastic ease-out - bouncy effect at the end
 */
export function easeOutElastic(t: number): number {
  const c4 = (2 * Math.PI) / 3;
  return t === 0
    ? 0
    : t === 1
    ? 1
    : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
}

/**
 * Back ease-in-out - slight overshoot on both ends
 */
export function easeInOutBack(t: number): number {
  const c1 = 1.70158;
  const c2 = c1 * 1.525;

  return t < 0.5
    ? (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2
    : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2;
}

export type EasingFunction = (t: number) => number;

export const EASING_FUNCTIONS = {
  linear,
  easeInOutCubic,
  easeInOutQuad,
  easeInOutExpo,
  easeInOutSine,
  easeOutElastic,
  easeInOutBack,
} as const;

export type EasingType = keyof typeof EASING_FUNCTIONS;
