/**
 * GlassHeartbeat Types
 *
 * Type definitions for heartbeat/health indicator component
 */

export type HeartbeatStatus = 'healthy' | 'degraded' | 'unhealthy' | 'offline';

export type HeartbeatSize = 'sm' | 'md' | 'lg';

export interface GlassHeartbeatProps {
  /** Service/system status */
  status: HeartbeatStatus;
  /** Service name to display */
  serviceName: string;
  /** Latency in milliseconds (optional) */
  latencyMs?: number;
  /** Component size */
  size?: HeartbeatSize;
  /** Show pulse animation for healthy status */
  showPulse?: boolean;
  /** Callback when heartbeat is pressed */
  onPress?: () => void;
  /** Test ID for testing */
  testID?: string;
}

export interface HeartbeatSizeConfig {
  dotSize: number;
  fontSize: number;
  spacing: number;
}
