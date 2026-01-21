import { TestLogger } from './test-logger';
import { fetchProgress, BackoffConfig } from './http-client';

/**
 * Progress Validation Helpers
 *
 * Extracted helper functions for progress verification tests.
 */

/**
 * Verify progress monotonicity over multiple polls
 */
export async function verifyProgressMonotonicity(
  backendBaseUrl: string,
  investigationId: string,
  config: BackoffConfig,
  logger?: TestLogger,
  pollCount: number = 5,
  intervalMs: number = 1000
): Promise<{ snapshots: number[]; valid: boolean }> {
  const snapshots: number[] = [];
  let previousPercent = 0;

  for (let i = 0; i < pollCount; i++) {
    const progressResponse = await fetchProgress(
      { backendBaseUrl },
      investigationId,
      config,
      logger
    );

    const currentPercent = progressResponse?.completion_percent || 0;
    snapshots.push(currentPercent);

    if (currentPercent < previousPercent) {
      logger?.error('Progress decreased', {
        current: currentPercent,
        previous: previousPercent,
      });
      return { snapshots, valid: false };
    }

    previousPercent = currentPercent;

    if (i < pollCount - 1) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }

  logger?.success('Progress monotonicity verified', { snapshots });
  return { snapshots, valid: true };
}

/**
 * Verify progress percentages are within valid range
 */
export function validateProgressPercentages(snapshots: number[]): boolean {
  return snapshots.every((percent) => percent >= 0 && percent <= 100);
}
