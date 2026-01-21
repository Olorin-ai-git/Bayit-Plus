/**
 * useDriftDetection hook for drift detection data fetching.
 * NO HARDCODED VALUES - All configuration from environment variables.
 */

import { useState, useEffect } from 'react';
import { analyticsService } from '../services/analyticsService';

export const useDriftDetection = (
  feature: string,
  referenceStart: string,
  referenceEnd: string,
  currentStart: string,
  currentEnd: string
) => {
  const [driftData, setDriftData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await analyticsService.detectDrift(
          feature,
          referenceStart,
          referenceEnd,
          currentStart,
          currentEnd
        );
        if (!cancelled) {
          setDriftData(result);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error('Failed to fetch drift data'));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    if (feature && referenceStart && referenceEnd && currentStart && currentEnd) {
      fetchData();
    }

    return () => {
      cancelled = true;
    };
  }, [feature, referenceStart, referenceEnd, currentStart, currentEnd]);

  return { driftData, loading, error, refetch: () => {
    setLoading(true);
    analyticsService.detectDrift(feature, referenceStart, referenceEnd, currentStart, currentEnd)
      .then(setDriftData)
      .catch(setError)
      .finally(() => setLoading(false));
  } };
};

