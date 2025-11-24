/**
 * Investigation Status Hook
 * Feature: 006-hybrid-graph-integration
 *
 * Manages investigation status updates and notification triggers.
 * Handles status transitions, completion detection, and error notifications.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { InvestigationStatus } from '../types/hybridGraphTypes';

interface UseInvestigationStatusOptions {
  onStatusChange?: (status: InvestigationStatus) => void;
  onComplete?: (status: InvestigationStatus) => void;
  onFailed?: (status: InvestigationStatus) => void;
  onTimeout?: (status: InvestigationStatus) => void;
}

interface UseInvestigationStatusReturn {
  currentStatus: InvestigationStatus | null;
  previousStatus: InvestigationStatus | null;
  statusHistory: InvestigationStatus[];
  isTerminalStatus: boolean;
  updateStatus: (status: InvestigationStatus) => void;
  resetStatus: () => void;
}

const TERMINAL_STATUSES = ['completed', 'failed', 'timeout', 'cancelled'];

export function useInvestigationStatus({
  onStatusChange,
  onComplete,
  onFailed,
  onTimeout,
}: UseInvestigationStatusOptions = {}): UseInvestigationStatusReturn {
  const [currentStatus, setCurrentStatus] = useState<InvestigationStatus | null>(null);
  const [previousStatus, setPreviousStatus] = useState<InvestigationStatus | null>(null);
  const [statusHistory, setStatusHistory] = useState<InvestigationStatus[]>([]);

  const callbacksRef = useRef({ onStatusChange, onComplete, onFailed, onTimeout });

  useEffect(() => {
    callbacksRef.current = { onStatusChange, onComplete, onFailed, onTimeout };
  }, [onStatusChange, onComplete, onFailed, onTimeout]);

  const isTerminalStatus = currentStatus ? TERMINAL_STATUSES.includes(currentStatus.status) : false;

  const updateStatus = useCallback((status: InvestigationStatus) => {
    setCurrentStatus((prev) => {
      if (prev) {
        setPreviousStatus(prev);
      }
      return status;
    });

    setStatusHistory((prev) => [...prev, status]);

    callbacksRef.current.onStatusChange?.(status);

    if (status.status === 'completed') {
      callbacksRef.current.onComplete?.(status);
      showNotification('Investigation Completed', `Investigation completed successfully with ${status.progress_percentage.toFixed(0)}% progress`, 'success');
    }

    if (status.status === 'failed') {
      callbacksRef.current.onFailed?.(status);
      const errorMessage = status.error?.error_message || 'Investigation failed';
      showNotification('Investigation Failed', errorMessage, 'error');
    }

    if (status.status === 'timeout') {
      callbacksRef.current.onTimeout?.(status);
      showNotification('Investigation Timeout', 'Investigation exceeded maximum execution time', 'warning');
    }
  }, []);

  const resetStatus = useCallback(() => {
    setCurrentStatus(null);
    setPreviousStatus(null);
    setStatusHistory([]);
  }, []);

  return {
    currentStatus,
    previousStatus,
    statusHistory,
    isTerminalStatus,
    updateStatus,
    resetStatus,
  };
}

/**
 * Show browser notification (if permission granted)
 */
function showNotification(
  title: string,
  body: string,
  type: 'success' | 'error' | 'warning' | 'info'
): void {
  if (!('Notification' in window)) {
    console.log(`[Notification] ${title}: ${body}`);
    return;
  }

  if (Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon: getNotificationIcon(type),
        badge: getNotificationIcon(type),
        requireInteraction: type === 'error',
      });
    } catch (error) {
      console.error('Failed to show notification:', error);
    }
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission().then((permission) => {
      if (permission === 'granted') {
        showNotification(title, body, type);
      }
    });
  }
}

/**
 * Get notification icon based on type
 */
function getNotificationIcon(type: 'success' | 'error' | 'warning' | 'info'): string {
  const icons = {
    success: '/icons/success.png',
    error: '/icons/error.png',
    warning: '/icons/warning.png',
    info: '/icons/info.png',
  };

  return icons[type] || icons.info;
}

/**
 * Extended hook with risk score tracking
 */
interface UseInvestigationStatusWithRiskReturn extends UseInvestigationStatusReturn {
  riskScoreHistory: Array<{ timestamp: string; score: number }>;
  currentRiskScore?: number;
}

export function useInvestigationStatusWithRisk(
  options: UseInvestigationStatusOptions = {}
): UseInvestigationStatusWithRiskReturn {
  const baseHook = useInvestigationStatus(options);
  const [riskScoreHistory, setRiskScoreHistory] = useState<Array<{ timestamp: string; score: number }>>([]);

  useEffect(() => {
    if (baseHook.currentStatus?.risk_score !== undefined) {
      setRiskScoreHistory((prev) => [
        ...prev,
        {
          timestamp: new Date().toISOString(),
          score: baseHook.currentStatus.risk_score!,
        },
      ]);
    }
  }, [baseHook.currentStatus?.risk_score]);

  return {
    ...baseHook,
    riskScoreHistory,
    currentRiskScore: baseHook.currentStatus?.risk_score,
  };
}
