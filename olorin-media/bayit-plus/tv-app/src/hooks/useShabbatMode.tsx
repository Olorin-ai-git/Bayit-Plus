import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { zmanService } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import logger from '../utils/logger';

const shabbatLogger = logger.scope('ShabbatMode');

/**
 * Shabbat Mode Context and Hook
 * Provides application-wide Shabbat state and auto-switches UI mode.
 */

interface ShabbatTimes {
  candleLighting?: string;
  havdalah?: string;
}

interface ShabbatState {
  isShabbat: boolean;
  isErevShabbat: boolean;
  shabbatModeActive: boolean;
  shabbatTimes: ShabbatTimes | null;
  countdown: string | null;
  countdownLabel: string | null;
  parasha: string | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

const ShabbatModeContext = createContext<ShabbatState | null>(null);

interface ShabbatModeProviderProps {
  children: React.ReactNode;
}

export const ShabbatModeProvider: React.FC<ShabbatModeProviderProps> = ({ children }) => {
  const { user } = useAuthStore();
  const [state, setState] = useState({
    isShabbat: false,
    isErevShabbat: false,
    shabbatModeActive: false,
    shabbatTimes: null as ShabbatTimes | null,
    countdown: null as string | null,
    countdownLabel: null as string | null,
    parasha: null as string | null,
    loading: true,
  });

  // Check if user has Shabbat mode enabled in preferences
  // Cast user to any since preferences may not be in the type yet
  const shabbatModeEnabled = (user as any)?.preferences?.shabbat_mode_enabled !== false;

  const fetchShabbatStatus = useCallback(async () => {
    try {
      const data = await zmanService.getTime() as {
        shabbat: {
          is_shabbat: boolean;
          is_erev_shabbat: boolean;
          candle_lighting?: string;
          havdalah?: string;
          countdown?: string;
          countdown_label?: string;
          parasha_hebrew?: string;
        };
      };

      const isShabbat = data.shabbat.is_shabbat;
      const isErevShabbat = data.shabbat.is_erev_shabbat;

      setState(prev => ({
        ...prev,
        isShabbat,
        isErevShabbat,
        shabbatModeActive: shabbatModeEnabled && isShabbat,
        shabbatTimes: {
          candleLighting: data.shabbat.candle_lighting,
          havdalah: data.shabbat.havdalah,
        },
        countdown: data.shabbat.countdown || null,
        countdownLabel: data.shabbat.countdown_label || null,
        parasha: data.shabbat.parasha_hebrew || null,
        loading: false,
      }));
    } catch (err) {
      shabbatLogger.error('Failed to fetch Shabbat status', err);
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [shabbatModeEnabled]);

  useEffect(() => {
    fetchShabbatStatus();
    // Check every 5 minutes for Shabbat transitions
    const interval = setInterval(fetchShabbatStatus, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchShabbatStatus]);

  const value: ShabbatState = {
    ...state,
    refresh: fetchShabbatStatus,
  };

  return (
    <ShabbatModeContext.Provider value={value}>
      {children}
    </ShabbatModeContext.Provider>
  );
};

/**
 * Hook to access Shabbat mode state
 */
export function useShabbatMode(): ShabbatState {
  const context = useContext(ShabbatModeContext);
  if (!context) {
    throw new Error('useShabbatMode must be used within a ShabbatModeProvider');
  }
  return context;
}

/**
 * Hook for components that need to know if they should show Shabbat content
 */
export function useShabbatContent() {
  const { shabbatModeActive, isShabbat, isErevShabbat, loading } = useShabbatMode();

  return {
    shouldShowShabbatContent: shabbatModeActive || isShabbat,
    shouldShowErevShabbatContent: isErevShabbat,
    loading,
  };
}

export default useShabbatMode;
