/**
 * Diagnostics API Service
 * Client for backend diagnostics REST endpoints
 */

import api from './api';

export interface ClientMetrics {
  cpu_usage?: number;
  memory_usage?: number;
  network_latency?: number;
  error_count: number;
  active_users: number;
}

export interface ClientStatus {
  client_type: string;
  client_id: string;
  status: 'online' | 'offline' | 'degraded';
  last_seen: string;
  metrics: ClientMetrics;
  api_latency?: number;
}

export interface ServiceHealth {
  service_name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency_ms?: number;
  message?: string;
  last_check: string;
}

export interface HeartbeatRequest {
  client_type: string;
  client_id: string;
  client_version: string;
  metrics: ClientMetrics;
  api_latency?: number;
}

export interface HeartbeatResponse {
  status: string;
  message: string;
  next_heartbeat_interval_seconds: number;
}

export interface AnalyticsResponse {
  time_range: string;
  total_heartbeats: number;
  unique_clients: number;
  avg_metrics: {
    cpu_usage: number;
    memory_usage: number;
  };
  status_distribution: Record<string, number>;
}

/**
 * Submit client heartbeat telemetry
 */
export async function submitHeartbeat(
  heartbeat: HeartbeatRequest
): Promise<HeartbeatResponse> {
  const response = await api.post<HeartbeatResponse>(
    '/diagnostics/heartbeat',
    heartbeat
  );
  return response.data;
}

/**
 * Get all client statuses (admin only)
 */
export async function getClients(): Promise<Record<string, ClientStatus[]>> {
  const response = await api.get<Record<string, ClientStatus[]>>(
    '/diagnostics/clients'
  );
  return response.data;
}

/**
 * Get backend service health (admin only)
 */
export async function getBackendServices(): Promise<Record<string, ServiceHealth>> {
  const response = await api.get<Record<string, ServiceHealth>>(
    '/diagnostics/backend-services'
  );
  return response.data;
}

/**
 * Trigger ping to specific client type (admin only)
 */
export async function pingClients(clientType: string): Promise<any> {
  const response = await api.post(
    `/diagnostics/ping/${clientType}`
  );
  return response.data;
}

/**
 * Get aggregate analytics and trends (admin only)
 */
export async function getAnalytics(
  timeRange: '15m' | '1h' | '6h' | '24h' = '1h'
): Promise<AnalyticsResponse> {
  const response = await api.get<AnalyticsResponse>(
    '/diagnostics/analytics',
    { params: { time_range: timeRange } }
  );
  return response.data;
}
