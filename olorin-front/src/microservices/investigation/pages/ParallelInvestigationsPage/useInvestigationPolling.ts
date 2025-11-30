import { useEffect, useRef, useState, useCallback } from 'react';
import { investigationService } from '../../services/investigationService';
import { getInvestigationConfig } from '../../config/investigationConfig';
import { ParallelInvestigation, InvestigationPollingHookReturn, InvestigationStatusType } from '../../types/parallelInvestigations';
import { eventBusInstance } from '../../../../shared/events/UnifiedEventBus';

export interface EnhancedInvestigationPollingReturn extends InvestigationPollingHookReturn {
  lastUpdated: Date | null;
  selectedStatus: InvestigationStatusType | 'ALL';
  setSelectedStatus: (status: InvestigationStatusType | 'ALL') => void;
  retryWithBackoff: () => Promise<void>;
}

export function useInvestigationPolling(): EnhancedInvestigationPollingReturn {
  const [investigations, setInvestigations] = useState<ParallelInvestigation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isWebSocketConnected, setIsWebSocketConnected] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<InvestigationStatusType | 'ALL'>('ALL');
  const [retryCount, setRetryCount] = useState(0);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const investigationsMapRef = useRef<Map<string, ParallelInvestigation>>(new Map());

  const fetchInvestigations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setRetryCount(0);

      const config = getInvestigationConfig();
      const response = await investigationService.getInvestigations({
        page: 1,
        pageSize: config.paginationSize,
      });

      const newInvestigations = response.investigations || [];

      // Update internal map for real-time updates
      investigationsMapRef.current.clear();
      newInvestigations.forEach(inv => {
        investigationsMapRef.current.set(inv.id, inv);
      });

      // Apply status filter if enabled
      const filtered = selectedStatus === 'ALL'
        ? newInvestigations
        : newInvestigations.filter(inv => inv.status === selectedStatus);

      setInvestigations(filtered);
      setLastUpdated(new Date());
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      setInvestigations([]);
    } finally {
      setLoading(false);
    }
  }, [selectedStatus]);

  const handleInvestigationUpdate = useCallback((data: any) => {
    const { id, status, data: updateData } = data;
    if (!id) return;

    const updatedInv = investigationsMapRef.current.get(id);
    if (updatedInv) {
      const merged = {
        ...updatedInv,
        ...updateData,
        status: status || updatedInv.status,
      };
      investigationsMapRef.current.set(id, merged);

      // Update state with new array to trigger re-render
      setInvestigations(Array.from(investigationsMapRef.current.values()));
    }
  }, []);

  const retryWithBackoff = useCallback(async () => {
    const maxRetries = 5;
    const baseDelay = 1000; // 1 second

    if (retryCount >= maxRetries) {
      setError(new Error('Max retries exceeded. Please check your connection.'));
      return;
    }

    // Exponential backoff: 1s, 2s, 4s, 8s, 16s
    const delay = baseDelay * Math.pow(2, retryCount);

    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }

    retryTimeoutRef.current = setTimeout(() => {
      setRetryCount(prev => prev + 1);
      fetchInvestigations();
    }, delay);
  }, [retryCount, fetchInvestigations]);

  const refetch = useCallback(async () => {
    await fetchInvestigations();
  }, [fetchInvestigations]);

  useEffect(() => {
    // Initial fetch
    fetchInvestigations();

    // Subscribe to investigation updates via event bus (real-time)
    const unsubscribe = eventBusInstance.on('investigation:updated', handleInvestigationUpdate);

    // Setup polling as fallback (every 10 seconds or configured interval)
    const config = getInvestigationConfig();
    pollingIntervalRef.current = setInterval(() => {
      fetchInvestigations();
    }, config.pollingInterval);

    // Try to establish WebSocket connection for true real-time updates
    // This is attempted but polling continues regardless
    try {
      const wsConnected = () => {
        setIsWebSocketConnected(true);
        eventBusInstance.emit('system:websocket-connected', {
          timestamp: new Date().toISOString()
        });
      };

      const wsDisconnected = () => {
        setIsWebSocketConnected(false);
        eventBusInstance.emit('system:websocket-disconnected', {
          timestamp: new Date(),
          reason: 'Connection lost, falling back to polling'
        });
      };

      eventBusInstance.on('system:websocket-connected', wsConnected);
      eventBusInstance.on('system:websocket-disconnected', wsDisconnected);

      return () => {
        unsubscribe();
        eventBusInstance.off('system:websocket-connected', wsConnected);
        eventBusInstance.off('system:websocket-disconnected', wsDisconnected);
        if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
        if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
      };
    } catch {
      return () => {
        unsubscribe();
        if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
        if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
      };
    }
  }, [fetchInvestigations, handleInvestigationUpdate]);

  return {
    investigations,
    loading,
    error,
    refetch,
    lastUpdated,
    selectedStatus,
    setSelectedStatus,
    retryWithBackoff,
  };
}
