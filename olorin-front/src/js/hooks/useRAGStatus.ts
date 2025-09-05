import { useState, useCallback, useRef, useEffect } from 'react';
import { RAGStatusData, UseRAGStatusReturn } from '../types/RAGTypes';

/**
 * Hook for managing RAG status state
 * Provides real-time RAG enhancement status tracking
 */
export const useRAGStatus = (): UseRAGStatusReturn => {
  const [status, setStatus] = useState<RAGStatusData>({
    isEnabled: false,
    processingState: 'idle',
    lastUpdate: new Date().toISOString(),
  });

  const statusRef = useRef(status);
  
  // Keep ref in sync with state
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  // Update status with timestamp
  const updateStatus = useCallback((updates: Partial<RAGStatusData>) => {
    setStatus(prev => ({
      ...prev,
      ...updates,
      lastUpdate: new Date().toISOString(),
    }));
  }, []);

  // Computed values
  const isProcessing = status.processingState !== 'idle';

  return {
    status,
    updateStatus,
    isProcessing,
  };
};

export default useRAGStatus;
