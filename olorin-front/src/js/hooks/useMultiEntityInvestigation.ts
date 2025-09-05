import { useState, useCallback, useRef } from 'react';
import { MultiEntityInvestigationClient, MultiEntityEventHandler } from '../services/MultiEntityInvestigationClient';
import {
  MultiEntityInvestigationRequest,
  MultiEntityInvestigationResult,
  MultiEntityInvestigationStatusUpdate,
  EntityDefinition
} from '../types/multiEntityInvestigation';
import { LogLevel } from '../types/RiskAssessment';

interface UseMultiEntityInvestigationOptions {
  apiBaseUrl?: string;
  wsBaseUrl?: string;
  autoStart?: boolean;
}

interface UseMultiEntityInvestigationReturn {
  // State
  isInvestigating: boolean;
  investigationId: string | null;
  investigationResult: MultiEntityInvestigationResult | null;
  progress: number;
  statusMessage: string;
  currentEntity: string | null;
  completedEntities: string[];
  error: string | null;
  
  // Actions
  startInvestigation: (request: MultiEntityInvestigationRequest) => Promise<string>;
  startQuickInvestigation: (entities: EntityDefinition[], booleanLogic?: string) => Promise<string>;
  stopInvestigation: () => void;
  getInvestigationStatus: () => Promise<MultiEntityInvestigationStatusUpdate | null>;
  getInvestigationResults: () => Promise<MultiEntityInvestigationResult | null>;
  clearError: () => void;
  reset: () => void;
}

export const useMultiEntityInvestigation = (
  options: UseMultiEntityInvestigationOptions = {}
): UseMultiEntityInvestigationReturn => {
  const clientRef = useRef<MultiEntityInvestigationClient | null>(null);
  
  // State
  const [isInvestigating, setIsInvestigating] = useState(false);
  const [investigationId, setInvestigationId] = useState<string | null>(null);
  const [investigationResult, setInvestigationResult] = useState<MultiEntityInvestigationResult | null>(null);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [currentEntity, setCurrentEntity] = useState<string | null>(null);
  const [completedEntities, setCompletedEntities] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Initialize client if not already done
  const getClient = useCallback(() => {
    if (!clientRef.current) {
      clientRef.current = new MultiEntityInvestigationClient({
        apiBaseUrl: options.apiBaseUrl || '/api',
        wsBaseUrl: options.wsBaseUrl || 'ws://localhost:8090'
      });
    }
    return clientRef.current;
  }, [options.apiBaseUrl, options.wsBaseUrl]);

  // Event handlers
  const eventHandlers: MultiEntityEventHandler = {
    onEntityStarted: useCallback((entityId: string) => {
      setCurrentEntity(entityId);
      setStatusMessage(`Starting investigation for ${entityId}...`);
    }, []),

    onEntityCompleted: useCallback((entityId: string, result: any) => {
      setCompletedEntities(prev => [...prev, entityId]);
      setStatusMessage(`Completed investigation for ${entityId}`);
    }, []),

    onEntityFailed: useCallback((entityId: string, errorMsg: string) => {
      setStatusMessage(`Failed to investigate ${entityId}: ${errorMsg}`);
      setError(`Entity investigation failed: ${entityId} - ${errorMsg}`);
    }, []),

    onCrossAnalysisStarted: useCallback(() => {
      setStatusMessage('Performing cross-entity analysis...');
      setCurrentEntity(null);
    }, []),

    onInvestigationCompleted: useCallback((result: MultiEntityInvestigationResult) => {
      setInvestigationResult(result);
      setIsInvestigating(false);
      setStatusMessage('Investigation completed successfully');
      setProgress(100);
    }, []),

    onStatusUpdate: useCallback((update: MultiEntityInvestigationStatusUpdate) => {
      setProgress(update.progress_percentage);
      setStatusMessage(update.message);
      setCompletedEntities(update.entities_completed);
      setCurrentEntity(update.current_entity || null);
    }, []),

    onError: useCallback((errorMsg: string) => {
      setError(errorMsg);
      setStatusMessage(`Error: ${errorMsg}`);
      setIsInvestigating(false);
    }, []),

    onLog: useCallback((message: string, level: LogLevel) => {
      console.log(`[MultiEntityInvestigation] ${level.toUpperCase()}: ${message}`);
    }, [])
  };

  // Start investigation with full request
  const startInvestigation = useCallback(async (request: MultiEntityInvestigationRequest): Promise<string> => {
    setError(null);
    setIsInvestigating(true);
    setProgress(0);
    setStatusMessage('Initializing investigation...');
    setCompletedEntities([]);
    setCurrentEntity(null);
    setInvestigationResult(null);

    try {
      const client = getClient();
      const id = await client.startInvestigation(request, eventHandlers);
      setInvestigationId(id);
      setStatusMessage('Investigation started successfully');
      return id;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMsg);
      setIsInvestigating(false);
      setStatusMessage(`Failed to start investigation: ${errorMsg}`);
      throw err;
    }
  }, [getClient, eventHandlers]);

  // Start quick investigation with just entities and logic
  const startQuickInvestigation = useCallback(async (
    entities: EntityDefinition[], 
    booleanLogic: string = 'AND'
  ): Promise<string> => {
    setError(null);
    setIsInvestigating(true);
    setProgress(0);
    setStatusMessage('Initializing quick investigation...');
    setCompletedEntities([]);
    setCurrentEntity(null);
    setInvestigationResult(null);

    try {
      const client = getClient();
      const id = await client.startQuickInvestigation(entities, booleanLogic, eventHandlers);
      setInvestigationId(id);
      setStatusMessage('Quick investigation started successfully');
      return id;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMsg);
      setIsInvestigating(false);
      setStatusMessage(`Failed to start investigation: ${errorMsg}`);
      throw err;
    }
  }, [getClient, eventHandlers]);

  // Stop investigation
  const stopInvestigation = useCallback(() => {
    const client = getClient();
    client.stopInvestigation();
    setIsInvestigating(false);
    setStatusMessage('Investigation stopped by user');
    setInvestigationId(null);
    setCurrentEntity(null);
  }, [getClient]);

  // Get investigation status
  const getInvestigationStatus = useCallback(async (): Promise<MultiEntityInvestigationStatusUpdate | null> => {
    try {
      const client = getClient();
      const status = await client.getInvestigationStatus();
      return status;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to get investigation status';
      setError(errorMsg);
      return null;
    }
  }, [getClient]);

  // Get investigation results
  const getInvestigationResults = useCallback(async (): Promise<MultiEntityInvestigationResult | null> => {
    try {
      const client = getClient();
      const result = await client.getInvestigationResults();
      setInvestigationResult(result);
      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to get investigation results';
      setError(errorMsg);
      return null;
    }
  }, [getClient]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Reset all state
  const reset = useCallback(() => {
    const client = getClient();
    client.stopInvestigation();
    
    setIsInvestigating(false);
    setInvestigationId(null);
    setInvestigationResult(null);
    setProgress(0);
    setStatusMessage('');
    setCurrentEntity(null);
    setCompletedEntities([]);
    setError(null);
  }, [getClient]);

  return {
    // State
    isInvestigating,
    investigationId,
    investigationResult,
    progress,
    statusMessage,
    currentEntity,
    completedEntities,
    error,
    
    // Actions
    startInvestigation,
    startQuickInvestigation,
    stopInvestigation,
    getInvestigationStatus,
    getInvestigationResults,
    clearError,
    reset
  };
};

// Export a simplified version for quick use
export const useSimpleMultiEntityInvestigation = () => {
  return useMultiEntityInvestigation({
    apiBaseUrl: '/api',
    wsBaseUrl: 'ws://localhost:8090'
  });
};