/**
 * Custom hook to check if user is a Beta 500 user
 *
 * Determines beta status by checking if user has a credit record.
 * Beta users have credit records, non-beta users return 404.
 */
import { useState, useEffect } from 'react';

interface BetaUserStatus {
  isBetaUser: boolean;
  isLoading: boolean;
  remainingCredits: number;
  totalCredits: number;
}

/**
 * Check if current user is a Beta 500 user
 *
 * @param userId - User ID to check
 * @returns Beta user status with credit information
 */
export function useBetaUser(userId: string | undefined): BetaUserStatus {
  const [status, setStatus] = useState<BetaUserStatus>({
    isBetaUser: false,
    isLoading: true,
    remainingCredits: 0,
    totalCredits: 0,
  });

  useEffect(() => {
    if (!userId) {
      setStatus({
        isBetaUser: false,
        isLoading: false,
        remainingCredits: 0,
        totalCredits: 0,
      });
      return;
    }

    const checkBetaStatus = async () => {
      try {
        const response = await fetch(`/api/v1/beta/credits/balance/${userId}`);

        if (response.ok) {
          // User has credit record - is a beta user
          const data = await response.json();
          setStatus({
            isBetaUser: true,
            isLoading: false,
            remainingCredits: data.remaining_credits,
            totalCredits: data.total_credits,
          });
        } else if (response.status === 404) {
          // No credit record - not a beta user
          setStatus({
            isBetaUser: false,
            isLoading: false,
            remainingCredits: 0,
            totalCredits: 0,
          });
        } else {
          // Other error - assume not beta user
          setStatus({
            isBetaUser: false,
            isLoading: false,
            remainingCredits: 0,
            totalCredits: 0,
          });
        }
      } catch (error) {
        // Network error - assume not beta user
        setStatus({
          isBetaUser: false,
          isLoading: false,
          remainingCredits: 0,
          totalCredits: 0,
        });
      }
    };

    checkBetaStatus();
  }, [userId]);

  return status;
}
