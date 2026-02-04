/**
 * useBetaUser - tvOS-compatible Beta 500 enrollment check
 *
 * Checks if the current user is enrolled in the Beta 500 program
 * by querying the authenticated beta credits endpoint.
 * Uses httpClient (AsyncStorage-based auth) instead of web localStorage.
 */

import { useState, useEffect } from 'react';
import { httpClient } from '../services/httpClient';
import { logger } from '../utils/logger';

interface BetaUserStatus {
  isBetaUser: boolean;
  isLoading: boolean;
  remainingCredits: number;
  totalCredits: number;
}

const DEFAULT_STATUS: BetaUserStatus = {
  isBetaUser: false,
  isLoading: false,
  remainingCredits: 0,
  totalCredits: 0,
};

/**
 * Check if current user is a Beta 500 user via authenticated API call
 */
export function useBetaUser(userId: string | undefined): BetaUserStatus {
  const [status, setStatus] = useState<BetaUserStatus>({
    ...DEFAULT_STATUS,
    isLoading: !!userId,
  });

  useEffect(() => {
    if (!userId) {
      setStatus(DEFAULT_STATUS);
      return;
    }

    let cancelled = false;

    const checkBetaStatus = async () => {
      try {
        const response = await httpClient.get<{
          remaining_credits: number;
          total_credits: number;
        }>('/beta/credits/balance');

        if (cancelled) return;

        setStatus({
          isBetaUser: true,
          isLoading: false,
          remainingCredits: response.data.remaining_credits,
          totalCredits: response.data.total_credits,
        });
      } catch (error) {
        if (cancelled) return;

        logger.debug('Beta status check: user is not a beta user', {
          userId,
        });
        setStatus(DEFAULT_STATUS);
      }
    };

    checkBetaStatus();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return status;
}
