/**
 * useActivityLog Hook
 * Fetches activity log entries for an investigation
 */

import { useState, useEffect } from 'react';
import { ActivityLogEntry } from '../types/investigations';
import { investigationsManagementService } from '../services/investigationsManagementService';

interface UseActivityLogReturn {
  entries: ActivityLogEntry[];
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

export const useActivityLog = (investigationId: string | null): UseActivityLogReturn => {
  const [entries, setEntries] = useState<ActivityLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadActivityLog = async () => {
    if (!investigationId) {
      setEntries([]);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      // TODO: Implement activity log API endpoint
      // For now, return empty array
      // const data = await investigationsManagementService.getActivityLog(investigationId);
      // setEntries(data);
      setEntries([]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load activity log';
      setError(errorMessage);
      console.error('[useActivityLog] Error loading activity log:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadActivityLog();
  }, [investigationId]);

  return {
    entries,
    isLoading,
    error,
    reload: loadActivityLog
  };
};

