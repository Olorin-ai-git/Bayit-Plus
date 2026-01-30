import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import api from '@/services/api';
import logger from '@/utils/logger';

interface BetaCreditsResponse {
  balance: number;
  is_beta_user: boolean;
}

export function useBetaCredits() {
  const { user, isAuthenticated } = useAuthStore();
  const [credits, setCredits] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setCredits(null);
      return;
    }

    fetchBetaCredits();
  }, [isAuthenticated, user]);

  const fetchBetaCredits = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await api.get<BetaCreditsResponse>('/beta/credits/balance');

      if (response.data.is_beta_user) {
        setCredits(response.data.balance);
      } else {
        setCredits(null);
      }
    } catch (err: any) {
      // If user is not a beta tester, the API returns 404
      if (err.response?.status === 404) {
        setCredits(null);
      } else {
        logger.error('Failed to fetch beta credits', 'useBetaCredits', err);
        setError(err.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return {
    credits,
    isLoading,
    error,
    refetch: fetchBetaCredits,
  };
}
