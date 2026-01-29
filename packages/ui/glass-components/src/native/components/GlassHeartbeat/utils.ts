/**
 * GlassHeartbeat Utilities
 *
 * Helper functions for heartbeat component
 */

import { colors } from '../../../theme';
import type { HeartbeatStatus, HeartbeatSize, HeartbeatSizeConfig } from './types';

/**
 * Get color based on health status
 */
export function getStatusColor(status: HeartbeatStatus): string {
  switch (status) {
    case 'healthy':
      return colors.success; // Green
    case 'degraded':
      return colors.warning; // Yellow
    case 'unhealthy':
      return colors.error; // Red
    case 'offline':
      return colors.textMuted; // Gray
    default:
      return colors.textSecondary;
  }
}

/**
 * Get size configuration based on component size prop
 */
export function getSizeConfig(size: HeartbeatSize): HeartbeatSizeConfig {
  switch (size) {
    case 'sm':
      return { dotSize: 8, fontSize: 12, spacing: 6 };
    case 'md':
      return { dotSize: 12, fontSize: 14, spacing: 8 };
    case 'lg':
      return { dotSize: 16, fontSize: 16, spacing: 10 };
    default:
      return { dotSize: 12, fontSize: 14, spacing: 8 };
  }
}

/**
 * Format latency for display
 */
export function formatLatency(latencyMs: number): string {
  if (latencyMs < 1) return '<1ms';
  if (latencyMs >= 1000) return `${(latencyMs / 1000).toFixed(1)}s`;
  return `${Math.round(latencyMs)}ms`;
}
