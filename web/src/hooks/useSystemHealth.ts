/**
 * useSystemHealth Hook - WebSocket connection and diagnostics data management
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { getClients, getBackendServices, getAnalytics, type ClientStatus, type ServiceHealth } from '../services/diagnosticsApi';
import { useAuthStore } from '../stores/authStore';
import logger from '../utils/logger';

interface SystemMetrics {
  cpu_usage: number;
  memory_usage: number;
  disk_usage: number;
  active_requests: number;
}

interface DiagnosticsData {
  services: Record<string, ServiceHealth>;
  clients: Record<string, ClientStatus[]>;
}

interface UseSystemHealthReturn {
  services: Record<string, ServiceHealth>;
  clients: Record<string, ClientStatus[]>;
  metrics: SystemMetrics | null;
  loading: boolean;
  error: string | null;
  isLive: boolean;
  refresh: () => Promise<void>;
}

const WS_BASE_URL = import.meta.env.VITE_WS_URL || `ws://${window.location.hostname}:8000`;

/**
 * Custom hook for system health monitoring with WebSocket real-time updates
 */
export function useSystemHealth(): UseSystemHealthReturn {
  const token = useAuthStore((state) => state.token);
  const log = logger.scope('SystemHealth');
  const [services, setServices] = useState<Record<string, ServiceHealth>>({});
  const [clients, setClients] = useState<Record<string, ClientStatus[]>>({});
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Load initial data from REST API
   */
  const loadInitialData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [servicesData, clientsData, analyticsData] = await Promise.all([
        getBackendServices(),
        getClients(),
        getAnalytics('1h').catch(() => null)
      ]);

      setServices(servicesData ?? {});
      setClients(clientsData ?? {});

      // Calculate metrics from client data and analytics
      const allClients = Object.values(clientsData ?? {}).flat();
      if (allClients.length > 0) {
        const avgCpu = allClients.reduce((sum, c) => sum + (c.metrics.cpu_usage || 0), 0) / allClients.length;
        const avgMemory = allClients.reduce((sum, c) => sum + (c.metrics.memory_usage || 0), 0) / allClients.length;
        const diskUsage = analyticsData?.avg_metrics?.disk_usage ?? 0;

        setMetrics({
          cpu_usage: avgCpu,
          memory_usage: avgMemory,
          disk_usage: diskUsage,
          active_requests: allClients.reduce((sum, c) => sum + c.metrics.active_users, 0)
        });
      }

      setLoading(false);
    } catch (err) {
      log.error('Failed to load diagnostics data', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
      setLoading(false);
    }
  }, []);

  /**
   * Connect to WebSocket for real-time updates
   */
  const connectWebSocket = useCallback(() => {
    if (!token) {
      log.warn('No auth token available for WebSocket connection');
      return;
    }

    try {
      const ws = new WebSocket(`${WS_BASE_URL}/ws/admin/diagnostics?token=${token}`);
      wsRef.current = ws;

      ws.onopen = () => {
        log.info('Diagnostics WebSocket connected');
        setIsLive(true);
        setError(null);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'snapshot' || data.type === 'update') {
            const diagnosticsData: DiagnosticsData = data.data;

            setServices(diagnosticsData.services ?? {});
            setClients(diagnosticsData.clients ?? {});

            // Update metrics from WS data; preserve existing disk_usage from analytics
            const allClients = Object.values(diagnosticsData.clients ?? {}).flat();
            if (allClients.length > 0) {
              const avgCpu = allClients.reduce((sum, c) => sum + (c.metrics.cpu_usage || 0), 0) / allClients.length;
              const avgMemory = allClients.reduce((sum, c) => sum + (c.metrics.memory_usage || 0), 0) / allClients.length;
              const wsDiskUsage = (data.data as any)?.metrics?.disk_usage;

              setMetrics((prev) => ({
                cpu_usage: avgCpu,
                memory_usage: avgMemory,
                disk_usage: wsDiskUsage ?? prev?.disk_usage ?? 0,
                active_requests: allClients.reduce((sum, c) => sum + c.metrics.active_users, 0)
              }));
            }
          } else if (data.type === 'pong') {
            log.debug('Received pong from server');
          }
        } catch (err) {
          log.error('Failed to parse WebSocket message', err);
        }
      };

      ws.onerror = (event) => {
        log.error('WebSocket error', event);
        setError('WebSocket connection error');
        setIsLive(false);
      };

      ws.onclose = () => {
        log.info('Diagnostics WebSocket closed');
        setIsLive(false);
        wsRef.current = null;

        // Attempt reconnection after 5 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          log.info('Attempting WebSocket reconnection');
          connectWebSocket();
        }, 5000);
      };
    } catch (err) {
      log.error('Failed to create WebSocket', err);
      setError(err instanceof Error ? err.message : 'WebSocket connection failed');
      setIsLive(false);
    }
  }, [token]);

  const disconnectWebSocket = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsLive(false);
  }, []);

  const refresh = useCallback(async () => {
    await loadInitialData();

    // Send refresh command via WebSocket if connected
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ command: 'refresh' }));
    }
  }, [loadInitialData]);

  // Load initial data and connect WebSocket on mount
  useEffect(() => {
    loadInitialData();
    connectWebSocket();

    return () => {
      disconnectWebSocket();
    };
  }, [loadInitialData, connectWebSocket, disconnectWebSocket]);

  return { services, clients, metrics, loading, error, isLive, refresh };
}
