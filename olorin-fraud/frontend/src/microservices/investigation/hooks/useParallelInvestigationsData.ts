/**
 * useParallelInvestigationsData Hook
 * Feature: 001-startup-analysis-flow
 *
 * Fetches and manages parallel investigations data with auto-refresh.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { investigationService } from '../services/investigationService';
import type { ParallelInvestigationRow } from '../components/parallel/InvestigationTableColumns';

interface UseParallelInvestigationsDataResult {
  investigations: ParallelInvestigationRow[];
  loading: boolean;
  error: string | null;
  lastRefreshed: Date;
  refetch: () => Promise<void>;
}

const REFRESH_INTERVAL_MS = 10000;

export function useParallelInvestigationsData(): UseParallelInvestigationsDataResult {
  const [investigations, setInvestigations] = useState<ParallelInvestigationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const isInitialLoad = useRef(true);

  const fetchInvestigations = useCallback(async () => {
    if (isInitialLoad.current) {
      setLoading(true);
    }

    try {
      const response = await investigationService.getInvestigations({}, 1, 50);
      const mappedData: ParallelInvestigationRow[] = response.investigations.map((inv: Record<string, unknown>) => {
        const settings = (inv.settings || {}) as Record<string, unknown>;
        const metadata = (settings.metadata || {}) as Record<string, unknown>;
        const merchantName = (metadata.merchantName || metadata.merchant_name || 'N/A') as string;
        const fraudTxCount = (metadata.fraudTxCount || metadata.fraud_tx_count || 0) as number;
        const totalTxCount = (metadata.totalTxCount || metadata.total_tx_count || 0) as number;
        const fraudPercent = totalTxCount > 0 ? (fraudTxCount / totalTxCount) * 100 : null;

        const entities = (settings.entities || []) as Array<Record<string, unknown>>;
        const entityValue = entities.length > 0
          ? ((entities[0].entityValue || entities[0].entity_value || 'Unknown') as string)
          : 'Unknown';

        const progress = (inv.progress || {}) as Record<string, unknown>;
        const riskScore = (progress.riskScore || progress.risk_score || 0.0) as number;
        const progressPercent = (
          progress.progressPercentage ||
          progress.percentComplete ||
          progress.percentage ||
          ((progress.progress as number) ? (progress.progress as number) * 100 : 0) ||
          0
        ) as number;

        const isTerminal = ['COMPLETED', 'ERROR', 'FAILED', 'CANCELLED'].includes(inv.status as string);
        const updatedAt = (inv.updatedAt || inv.updated_at) as string | undefined;
        const restartedToId = (metadata.restarted_to || metadata.restartedTo) as string | undefined;

        return {
          id: (inv.investigationId || inv.id) as string,
          entityValue,
          merchantName,
          status: inv.status as ParallelInvestigationRow['status'],
          riskScore: typeof riskScore === 'number' ? riskScore : 0,
          progressPercent: Math.round(typeof progressPercent === 'number' ? progressPercent : 0),
          fraudTxCount: typeof fraudTxCount === 'number' ? fraudTxCount : 0,
          fraudPercent: typeof fraudPercent === 'number' ? fraudPercent : null,
          startTime: (inv.createdAt || inv.created_at) as string,
          endTime: isTerminal ? updatedAt : undefined,
          updatedAt,
          restartedToId,
        };
      });

      setInvestigations(mappedData);
      setLastRefreshed(new Date());
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load investigation data';
      setError(message);
    } finally {
      setLoading(false);
      isInitialLoad.current = false;
    }
  }, []);

  useEffect(() => {
    fetchInvestigations();
  }, [fetchInvestigations]);

  useEffect(() => {
    const intervalId = setInterval(fetchInvestigations, REFRESH_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [fetchInvestigations]);

  return {
    investigations,
    loading,
    error,
    lastRefreshed,
    refetch: fetchInvestigations,
  };
}
