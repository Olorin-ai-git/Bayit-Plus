import { useState, useEffect } from 'react';
import { CVServiceCore } from '../services/cv/CVServiceCore';

// Async mode hook for FinalResultsPage
export const useAsyncMode = (jobId?: string) => {
  const [asyncMode] = useState(CVServiceCore.isAsyncCVGenerationEnabled());
  const [isAsyncInitialization, setIsAsyncInitialization] = useState(false);

  useEffect(() => {
    if (!jobId) return;

    // Check if this is an async initialization from session storage
    const storedConfig = sessionStorage.getItem(`generation-config-${jobId}`);
    if (storedConfig) {
      try {
        const config = JSON.parse(storedConfig);
        if (config.asyncMode && config.initResponse) {
          logger.warn('🚀 [ASYNC DETECTION] Detected async CV generation initialization');
          setIsAsyncInitialization(true);
        }
      } catch (error) {
        logger.error('Error parsing stored config:', error);
      }
    }
  }, [jobId]);

  return {
    asyncMode,
    isAsyncInitialization,
    setIsAsyncInitialization
  };
};