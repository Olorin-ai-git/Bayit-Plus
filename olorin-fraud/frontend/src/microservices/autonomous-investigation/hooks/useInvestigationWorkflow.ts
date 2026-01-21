import { useState, useEffect, useCallback, useRef } from 'react';
import { useEventBus } from '../../shared/services/EventBus';
import { useWebSocket } from '../../shared/services/WebSocketService';
import { InvestigationOrchestrator, InvestigationMetrics } from '../services/InvestigationOrchestrator';
import {
  Investigation,
  InvestigationStatus,
  AgentProgress,
  InvestigationEvent
} from '../types/investigation';

export interface UseInvestigationWorkflowReturn {
  // State
  investigations: Investigation[];
  currentInvestigation: Investigation | null;
  isLoading: boolean;
  error: string | null;
  metrics: InvestigationMetrics;

  // Actions
  createInvestigation: (data: Partial<Investigation>) => Promise<Investigation>;
  startInvestigation: (id: string) => Promise<void>;
  pauseInvestigation: (id: string) => Promise<void>;
  resumeInvestigation: (id: string) => Promise<void>;
  stopInvestigation: (id: string) => Promise<void>;
  deleteInvestigation: (id: string) => Promise<void>;
  loadInvestigation: (id: string) => void;
  refreshInvestigations: () => void;

  // Real-time data
  getInvestigationEvents: (id: string) => InvestigationEvent[];
  getAgentProgress: (investigationId: string, agentId: string) => AgentProgress | undefined;
}

export const useInvestigationWorkflow = (): UseInvestigationWorkflowReturn => {
  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [currentInvestigation, setCurrentInvestigation] = useState<Investigation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<InvestigationMetrics>({
    totalInvestigations: 0,
    activeInvestigations: 0,
    completedInvestigations: 0,
    failedInvestigations: 0,
    averageExecutionTime: 0,
    successRate: 0
  });

  const eventBus = useEventBus();
  const webSocket = useWebSocket();
  const orchestratorRef = useRef<InvestigationOrchestrator | null>(null);

  // Initialize orchestrator
  useEffect(() => {
    if (eventBus && webSocket.isConnected) {
      orchestratorRef.current = new InvestigationOrchestrator(eventBus, webSocket);
      refreshInvestigations();
    }
  }, [eventBus, webSocket.isConnected]);

  // Setup event listeners
  useEffect(() => {
    if (!eventBus) return;

    const handleInvestigationCreated = (event: any) => {
      if (orchestratorRef.current) {
        const investigation = orchestratorRef.current.getInvestigation(event.id);
        if (investigation) {
          setInvestigations(prev => [investigation, ...prev]);
          updateMetrics();
        }
      }
    };

    const handleInvestigationUpdated = (event: any) => {
      setInvestigations(prev =>
        prev.map(inv => inv.id === event.id ? { ...inv, ...event.data } : inv)
      );

      if (currentInvestigation?.id === event.id) {
        setCurrentInvestigation(prev => prev ? { ...prev, ...event.data } : null);
      }

      updateMetrics();
    };

    const handleInvestigationDeleted = (event: any) => {
      setInvestigations(prev => prev.filter(inv => inv.id !== event.id));

      if (currentInvestigation?.id === event.id) {
        setCurrentInvestigation(null);
      }

      updateMetrics();
    };

    const handleInvestigationProgress = (event: any) => {
      setInvestigations(prev =>
        prev.map(inv =>
          inv.id === event.id
            ? { ...inv, progress: event.progress, updatedAt: event.timestamp }
            : inv
        )
      );

      if (currentInvestigation?.id === event.id) {
        setCurrentInvestigation(prev =>
          prev ? { ...prev, progress: event.progress, updatedAt: event.timestamp } : null
        );
      }
    };

    const handleInvestigationCompleted = (event: any) => {
      // Show completion notification
      eventBus.emit('system:notification', {
        type: 'success',
        message: `Investigation ${event.id} completed successfully`,
        duration: 5000
      });
    };

    const handleInvestigationError = (event: any) => {
      // Show error notification
      eventBus.emit('system:notification', {
        type: 'error',
        message: `Investigation ${event.id} failed: ${event.error}`,
        persistent: true
      });
    };

    // Register event listeners
    eventBus.on('investigation:created', handleInvestigationCreated);
    eventBus.on('investigation:updated', handleInvestigationUpdated);
    eventBus.on('investigation:deleted', handleInvestigationDeleted);
    eventBus.on('investigation:progress', handleInvestigationProgress);
    eventBus.on('investigation:completed', handleInvestigationCompleted);
    eventBus.on('investigation:error', handleInvestigationError);

    // Cleanup
    return () => {
      eventBus.off('investigation:created', handleInvestigationCreated);
      eventBus.off('investigation:updated', handleInvestigationUpdated);
      eventBus.off('investigation:deleted', handleInvestigationDeleted);
      eventBus.off('investigation:progress', handleInvestigationProgress);
      eventBus.off('investigation:completed', handleInvestigationCompleted);
      eventBus.off('investigation:error', handleInvestigationError);
    };
  }, [eventBus, currentInvestigation?.id]);

  const updateMetrics = useCallback(() => {
    if (orchestratorRef.current) {
      const newMetrics = orchestratorRef.current.getInvestigationMetrics();
      setMetrics(newMetrics);
    }
  }, []);

  const createInvestigation = useCallback(async (data: Partial<Investigation>): Promise<Investigation> => {
    if (!orchestratorRef.current) {
      throw new Error('Orchestrator not initialized');
    }

    setIsLoading(true);
    setError(null);

    try {
      const investigation = await orchestratorRef.current.createInvestigation(data);
      return investigation;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create investigation';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const startInvestigation = useCallback(async (id: string): Promise<void> => {
    if (!orchestratorRef.current) {
      throw new Error('Orchestrator not initialized');
    }

    setIsLoading(true);
    setError(null);

    try {
      await orchestratorRef.current.startInvestigation(id);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start investigation';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const pauseInvestigation = useCallback(async (id: string): Promise<void> => {
    if (!orchestratorRef.current) {
      throw new Error('Orchestrator not initialized');
    }

    setIsLoading(true);
    setError(null);

    try {
      await orchestratorRef.current.pauseInvestigation(id);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to pause investigation';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const resumeInvestigation = useCallback(async (id: string): Promise<void> => {
    if (!orchestratorRef.current) {
      throw new Error('Orchestrator not initialized');
    }

    setIsLoading(true);
    setError(null);

    try {
      await orchestratorRef.current.resumeInvestigation(id);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to resume investigation';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const stopInvestigation = useCallback(async (id: string): Promise<void> => {
    if (!orchestratorRef.current) {
      throw new Error('Orchestrator not initialized');
    }

    setIsLoading(true);
    setError(null);

    try {
      await orchestratorRef.current.stopInvestigation(id);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to stop investigation';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteInvestigation = useCallback(async (id: string): Promise<void> => {
    if (!orchestratorRef.current) {
      throw new Error('Orchestrator not initialized');
    }

    setIsLoading(true);
    setError(null);

    try {
      await orchestratorRef.current.deleteInvestigation(id);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete investigation';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadInvestigation = useCallback((id: string): void => {
    if (!orchestratorRef.current) return;

    const investigation = orchestratorRef.current.getInvestigation(id);
    setCurrentInvestigation(investigation || null);
  }, []);

  const refreshInvestigations = useCallback((): void => {
    if (!orchestratorRef.current) return;

    setIsLoading(true);
    try {
      const allInvestigations = orchestratorRef.current.getAllInvestigations();
      setInvestigations(allInvestigations);
      updateMetrics();
    } catch (err) {
      setError('Failed to refresh investigations');
    } finally {
      setIsLoading(false);
    }
  }, [updateMetrics]);

  const getInvestigationEvents = useCallback((id: string): InvestigationEvent[] => {
    if (!orchestratorRef.current) return [];
    return orchestratorRef.current.getInvestigationEvents(id);
  }, []);

  const getAgentProgress = useCallback((investigationId: string, agentId: string): AgentProgress | undefined => {
    const investigation = investigations.find(inv => inv.id === investigationId);
    return investigation?.progress.agents.find(agent => agent.agentId === agentId);
  }, [investigations]);

  return {
    // State
    investigations,
    currentInvestigation,
    isLoading,
    error,
    metrics,

    // Actions
    createInvestigation,
    startInvestigation,
    pauseInvestigation,
    resumeInvestigation,
    stopInvestigation,
    deleteInvestigation,
    loadInvestigation,
    refreshInvestigations,

    // Real-time data
    getInvestigationEvents,
    getAgentProgress
  };
};