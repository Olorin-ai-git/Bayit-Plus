/**
 * useExperiments hook for experiment data fetching.
 * NO HARDCODED VALUES - All configuration from environment variables.
 */

import { useState, useEffect } from 'react';
import { analyticsService } from '../services/analyticsService';
import type { Experiment } from '../types/experiments';

export const useExperiments = (status?: string) => {
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await analyticsService.listExperiments(status);
        if (!cancelled) {
          setExperiments(result);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error('Failed to fetch experiments'));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [status]);

  return { experiments, loading, error, refetch: () => {
    setLoading(true);
    analyticsService.listExperiments(status).then(setExperiments).catch(setError).finally(() => setLoading(false));
  } };
};

export const useExperiment = (experimentId: string) => {
  const [experiment, setExperiment] = useState<Experiment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await analyticsService.getExperiment(experimentId);
        if (!cancelled) {
          setExperiment(result);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error('Failed to fetch experiment'));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    if (experimentId) {
      fetchData();
    }

    return () => {
      cancelled = true;
    };
  }, [experimentId]);

  return { experiment, loading, error, refetch: () => {
    setLoading(true);
    analyticsService.getExperiment(experimentId).then(setExperiment).catch(setError).finally(() => setLoading(false));
  } };
};

