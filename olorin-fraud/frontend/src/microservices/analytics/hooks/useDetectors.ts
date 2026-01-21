/**
 * useDetectors Hook - Fetch and manage detectors
 */

import { useState, useEffect, useCallback } from 'react';
import { AnomalyApiService } from '../services/anomalyApi';
import type { Detector } from '../types/anomaly';

export function useDetectors() {
  const [detectors, setDetectors] = useState<Detector[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchDetectors = useCallback(async () => {
    const apiService = new AnomalyApiService();
    try {
      setLoading(true);
      setError(null);
      const result = await apiService.listDetectors();
      setDetectors(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch detectors'));
      // Don't retry on CORS errors to prevent infinite loops
      if (err instanceof Error && err.message.includes('CORS')) {
        console.error('CORS error detected - check backend CORS configuration');
      }
    } finally {
      setLoading(false);
    }
  }, []); // Empty dependency array - only fetch once on mount

  useEffect(() => {
    fetchDetectors();
  }, [fetchDetectors]);

  const createDetector = useCallback(
    async (detector: Omit<Detector, 'id' | 'created_at' | 'updated_at'>) => {
      const apiService = new AnomalyApiService();
      try {
        const newDetector = await apiService.createDetector(detector);
        setDetectors((prev) => [newDetector, ...prev]);
        return newDetector;
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to create detector'));
        throw err;
      }
    },
    []
  );

  const deleteDetector = useCallback(
    async (id: string) => {
      const apiService = new AnomalyApiService();
      try {
        await apiService.deleteDetector(id);
        setDetectors((prev) => prev.filter((d) => d.id !== id));
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to delete detector'));
        throw err;
      }
    },
    []
  );

  const bulkDeleteDetectors = useCallback(
    async (ids: string[]) => {
      const apiService = new AnomalyApiService();
      try {
        const result = await apiService.bulkDeleteDetectors(ids);
        setDetectors((prev) => prev.filter((d) => !ids.includes(d.id)));
        return result;
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to bulk delete detectors'));
        throw err;
      }
    },
    []
  );

  const updateDetector = useCallback(
    async (id: string, updates: Partial<Detector>) => {
      const apiService = new AnomalyApiService();
      try {
        const updated = await apiService.updateDetector(id, updates);
        setDetectors((prev) =>
          prev.map((d) => (d.id === id ? updated : d))
        );
        return updated;
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to update detector'));
        throw err;
      }
    },
    []
  );

  const getDetector = useCallback(
    async (id: string) => {
      const apiService = new AnomalyApiService();
      try {
        return await apiService.getDetector(id);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to get detector'));
        throw err;
      }
    },
    []
  );

  return {
    detectors,
    loading,
    error,
    fetchDetectors,
    createDetector,
    updateDetector,
    deleteDetector,
    bulkDeleteDetectors,
    getDetector,
  };
}

