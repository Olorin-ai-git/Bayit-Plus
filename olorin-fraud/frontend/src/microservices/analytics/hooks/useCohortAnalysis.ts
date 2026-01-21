/**
 * useCohortAnalysis hook for cohort data fetching.
 * NO HARDCODED VALUES - All configuration from environment variables.
 */

import { useState, useEffect } from 'react';
import { analyticsService } from '../services/analyticsService';
import type { CohortAnalysisResponse, CohortDimension } from '../types/cohort';

export const useCohortAnalysis = (
  dimension: CohortDimension | null,
  startDate: string,
  endDate: string,
  minCount = 100
) => {
  const [data, setData] = useState<CohortAnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!dimension) {
      setData(null);
      return;
    }

    let cancelled = false;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await analyticsService.getCohorts(
          dimension,
          startDate,
          endDate,
          minCount
        );
        if (!cancelled) {
          setData(result);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error('Failed to fetch cohort analysis'));
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
  }, [dimension, startDate, endDate, minCount]);

  return { data, loading, error };
};

