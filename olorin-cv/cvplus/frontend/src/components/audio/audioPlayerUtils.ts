/**
 * Audio Player Utility Functions
 *
 * Helper functions for audio playback and time formatting
 */

/**
 * Format seconds to MM:SS format
 */
export function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) {
    return '0:00';
  }

  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Calculate progress percentage
 */
export function calculateProgress(currentTime: number, duration: number): number {
  if (!duration || !isFinite(duration)) {
    return 0;
  }
  return (currentTime / duration) * 100;
}

/**
 * Convert click position to time
 */
export function clickPositionToTime(
  clickX: number,
  elementWidth: number,
  duration: number
): number {
  const percentage = clickX / elementWidth;
  return percentage * duration;
}

/**
 * Convert click position to volume
 */
export function clickPositionToVolume(
  clickX: number,
  elementWidth: number
): number {
  const volume = clickX / elementWidth;
  return Math.max(0, Math.min(1, volume));
}
