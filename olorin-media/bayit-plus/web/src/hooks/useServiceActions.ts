/**
 * useServiceActions Hook
 * Actions for service management (ping, restart, etc.)
 */

import { useState, useCallback } from 'react';
import { pingClients } from '../services/diagnosticsApi';

interface UseServiceActionsReturn {
  pingService: (clientType: string) => Promise<void>;
  restartService: (serviceName: string) => Promise<void>;
  isPinging: boolean;
  isRestarting: boolean;
  error: string | null;
}

/**
 * Custom hook for service management actions
 */
export function useServiceActions(): UseServiceActionsReturn {
  const [isPinging, setIsPinging] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Ping specific client type
   */
  const pingService = useCallback(async (clientType: string) => {
    try {
      setIsPinging(true);
      setError(null);

      await pingClients(clientType);

      console.log(`Ping sent to ${clientType} clients`);
    } catch (err) {
      console.error(`Failed to ping ${clientType}:`, err);
      setError(err instanceof Error ? err.message : 'Ping failed');
      throw err;
    } finally {
      setIsPinging(false);
    }
  }, []);

  /**
   * Restart service (placeholder - requires backend implementation)
   */
  const restartService = useCallback(async (serviceName: string) => {
    try {
      setIsRestarting(true);
      setError(null);

      // TODO: Implement restart endpoint in backend
      console.warn(`Restart service not yet implemented: ${serviceName}`);

      // Placeholder timeout
      await new Promise(resolve => setTimeout(resolve, 1000));

      console.log(`Service restart triggered: ${serviceName}`);
    } catch (err) {
      console.error(`Failed to restart ${serviceName}:`, err);
      setError(err instanceof Error ? err.message : 'Restart failed');
      throw err;
    } finally {
      setIsRestarting(false);
    }
  }, []);

  return {
    pingService,
    restartService,
    isPinging,
    isRestarting,
    error
  };
}
