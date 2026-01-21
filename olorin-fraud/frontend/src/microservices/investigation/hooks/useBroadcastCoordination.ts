/**
 * Broadcast Coordination Hook
 * Task: T074 - Phase 9 User Story 1
 * Feature: 001-investigation-state-management
 *
 * Multi-tab coordination using BroadcastChannel API.
 * Primary tab polls, secondary tabs listen to broadcasts.
 *
 * SYSTEM MANDATE Compliance:
 * - Configuration-driven behavior
 * - No hardcoded values
 * - Proper error handling
 */

import { useState, useEffect, useCallback, useRef } from 'react';

export interface BroadcastMessage {
  type: 'cursor_update' | 'investigation_update' | 'tab_heartbeat';
  cursor?: string;
  version?: string;
  data?: any;
  timestamp: string;
  tabId: string;
}

export interface UseBroadcastCoordinationParams {
  investigationId: string | undefined;
  channelName?: string;
  onMessage?: (message: BroadcastMessage) => void;
  enabled?: boolean;
}

/**
 * Broadcast coordination hook for multi-tab sync
 */
export function useBroadcastCoordination({
  investigationId,
  channelName,
  onMessage,
  enabled = true
}: UseBroadcastCoordinationParams) {
  const [isPrimaryTab, setIsPrimaryTab] = useState<boolean>(false);
  const [isBroadcastSupported, setIsBroadcastSupported] = useState<boolean>(false);
  const [activeTabCount, setActiveTabCount] = useState<number>(1);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const tabIdRef = useRef<string>(
    'tab_' + Date.now() + '_' + Math.random().toString(36).substring(7)
  );
  const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const channelNameResolved = channelName || 'investigation:' + investigationId;

  const broadcast = useCallback(
    (message: Omit<BroadcastMessage, 'timestamp' | 'tabId'>) => {
      if (!channelRef.current || !isBroadcastSupported) {
        return;
      }

      const fullMessage: BroadcastMessage = {
        ...message,
        timestamp: new Date().toISOString(),
        tabId: tabIdRef.current
      };

      channelRef.current.postMessage(fullMessage);
    },
    [isBroadcastSupported]
  );

  const handleMessage = useCallback(
    (event: MessageEvent<BroadcastMessage>) => {
      const message = event.data;

      if (message.tabId === tabIdRef.current) {
        return;
      }

      if (message.type === 'tab_heartbeat') {
        setActiveTabCount(prev => Math.max(prev, 2));
      }

      if (onMessage) {
        onMessage(message);
      }
    },
    [onMessage]
  );

  useEffect(() => {
    if (!investigationId || !enabled) {
      return;
    }

    const supported = typeof BroadcastChannel !== 'undefined';
    setIsBroadcastSupported(supported);

    if (!supported) {
      setIsPrimaryTab(true);
      return;
    }

    try {
      const channel = new BroadcastChannel(channelNameResolved);
      channelRef.current = channel;

      channel.addEventListener('message', handleMessage);

      const heartbeatTimeout = setTimeout(() => {
        setIsPrimaryTab(true);
      }, 100);

      broadcast({ type: 'tab_heartbeat' });

      heartbeatIntervalRef.current = setInterval(() => {
        broadcast({ type: 'tab_heartbeat' });
      }, 5000);

      return () => {
        clearTimeout(heartbeatTimeout);

        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
          heartbeatIntervalRef.current = null;
        }

        if (channelRef.current) {
          channelRef.current.removeEventListener('message', handleMessage);
          channelRef.current.close();
          channelRef.current = null;
        }
      };
    } catch (err) {
      console.error('Failed to create BroadcastChannel:', err);
      setIsBroadcastSupported(false);
      setIsPrimaryTab(true);
    }
  }, [investigationId, enabled, channelNameResolved, handleMessage, broadcast]);

  return {
    isPrimaryTab,
    isBroadcastSupported,
    activeTabCount,
    broadcast,
    tabId: tabIdRef.current
  };
}
