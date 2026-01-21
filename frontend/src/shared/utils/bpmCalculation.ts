/**
 * BPM Calculation Utilities
 *
 * Converts tools per second (TPS) to beats per minute (BPM) for EKG display.
 * Formula: BPM = 40 + (tools/sec × 6) for 6 agents
 *
 * Range: [40, 280] BPM
 * - 40 BPM: Baseline (0 tools/sec, idle state)
 * - 280 BPM: Maximum (40 tools/sec, peak activity across 6 agents)
 */

/**
 * Calculate EKG heart rate (BPM) from tools per second
 *
 * @param toolsPerSec - Number of tools executed per second (0-40)
 * @returns BPM value (40-280)
 *
 * @example
 * calculateBPM(0)   // Returns 40 (baseline/idle)
 * calculateBPM(10)  // Returns 100 (moderate activity)
 * calculateBPM(25)  // Returns 190 (high activity)
 * calculateBPM(40)  // Returns 280 (maximum)
 * calculateBPM(50)  // Returns 280 (clamped to max)
 */
export function calculateBPM(toolsPerSec: number): number {
  // Clamp input to valid range [0, 40]
  const clampedTPS = Math.max(0, Math.min(40, toolsPerSec));

  // Apply formula: 40 + (tools/sec × 6) for 6 agents
  const bpm = 40 + clampedTPS * 6;

  // Round to nearest integer
  return Math.round(bpm);
}

/**
 * Reverse calculation: Convert BPM back to tools per second
 *
 * @param bpm - Beats per minute (40-280)
 * @returns Estimated tools per second (0-40)
 *
 * @example
 * bpmToToolsPerSec(40)   // Returns 0
 * bpmToToolsPerSec(100)  // Returns 10
 * bpmToToolsPerSec(280)  // Returns 40
 */
export function bpmToToolsPerSec(bpm: number): number {
  // Clamp BPM to valid range [40, 280]
  const clampedBPM = Math.max(40, Math.min(280, bpm));

  // Reverse formula: (BPM - 40) / 6
  const tps = (clampedBPM - 40) / 6;

  // Round to nearest integer
  return Math.round(tps);
}

/**
 * Validate if BPM is within acceptable range
 *
 * @param bpm - Beats per minute to validate
 * @returns True if BPM is valid (40-280)
 */
export function isValidBPM(bpm: number): boolean {
  return Number.isFinite(bpm) && bpm >= 40 && bpm <= 280;
}

/**
 * Get human-readable activity level from tools/sec
 *
 * @param toolsPerSec - Tools per second (0-40)
 * @returns Activity level description
 */
export function getActivityLevel(
  toolsPerSec: number
): 'idle' | 'low' | 'moderate' | 'high' | 'peak' {
  const clampedTPS = Math.max(0, Math.min(40, toolsPerSec));

  if (clampedTPS === 0) return 'idle';
  if (clampedTPS <= 10) return 'low';
  if (clampedTPS <= 20) return 'moderate';
  if (clampedTPS <= 30) return 'high';
  return 'peak';
}

/**
 * Get color code for activity level visualization
 *
 * @param toolsPerSec - Tools per second (0-40)
 * @returns Hex color code
 */
export function getActivityColor(toolsPerSec: number): string {
  const level = getActivityLevel(toolsPerSec);

  const colors: Record<'idle' | 'low' | 'moderate' | 'high' | 'peak', string> = {
    idle: '#6b7280', // Gray
    low: '#34c759', // Green
    moderate: '#3b82f6', // Blue
    high: '#ff9f0a', // Orange
    peak: '#ff3b30', // Red
  };

  return colors[level];
}
