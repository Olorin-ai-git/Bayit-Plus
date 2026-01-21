/**
 * useDetectorPreview Hook - Real backend preview for Detector Studio
 * Uses actual detection API with real data from Snowflake
 */

import { useState, useCallback } from 'react';
import { AnomalyApiService } from '../services/anomalyApi';
import { useToast } from './useToast';
import type { AnomalyEvent, PreviewRequest } from '../types/anomaly';

export interface UseDetectorPreviewOptions {
  detectorId?: string;
}

export function useDetectorPreview(options: UseDetectorPreviewOptions = {}) {
  const { detectorId } = options;
  const [anomalies, setAnomalies] = useState<AnomalyEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { showToast } = useToast();

  const runPreview = useCallback(
    async (request: PreviewRequest): Promise<AnomalyEvent[]> => {
      if (!request.detector_id) {
        const err = new Error('Detector ID is required for preview');
        setError(err);
        showToast('error', 'Preview Failed', err.message);
        throw err;
      }

      setLoading(true);
      setError(null);

      try {
        const apiService = new AnomalyApiService();
        const response = await apiService.previewDetector(request);
        setAnomalies(response.anomalies || []);
        return response.anomalies || [];
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to run preview');
        setError(error);
        showToast('error', 'Preview Failed', error.message);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [showToast]
  );

  const clearPreview = useCallback(() => {
    setAnomalies([]);
    setError(null);
  }, []);

  return {
    anomalies,
    loading,
    error,
    runPreview,
    clearPreview,
  };
}

