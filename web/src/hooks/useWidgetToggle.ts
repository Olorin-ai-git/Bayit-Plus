/**
 * useWidgetToggle - Hook for managing widget toggle states
 *
 * Provides batch-checking of widget existence and optimistic toggle.
 * Used by WidgetToggleContext to provide state to deeply nested components.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import * as apiModule from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import logger from '@/utils/logger';

const widgetService = (apiModule as any).widgetService;

const log = logger.scope('useWidgetToggle');

interface ContentItem {
  content_type: string;
  content_id: string;
}

interface ToggleParams {
  content_type: string;
  content_id: string;
  title: string;
  description?: string;
  icon?: string;
  cover_url?: string;
}

interface UseWidgetToggleResult {
  widgetStates: Map<string, boolean>;
  toggle: (params: ToggleParams) => Promise<boolean>;
  isLoading: boolean;
}

function makeKey(contentType: string, contentId: string): string {
  return `${contentType}:${contentId}`;
}

export default function useWidgetToggle(
  items: ContentItem[]
): UseWidgetToggleResult {
  const [widgetStates, setWidgetStates] = useState<Map<string, boolean>>(
    new Map()
  );
  const [isLoading, setIsLoading] = useState(false);
  const lastItemsRef = useRef<string>('');

  // Batch-check on mount / when items change
  useEffect(() => {
    const { isAuthenticated } = useAuthStore.getState();
    if (!isAuthenticated || items.length === 0) return;

    // Deduplicate by serializing items list
    const serialized = JSON.stringify(
      items.map((i) => `${i.content_type}:${i.content_id}`).sort()
    );
    if (serialized === lastItemsRef.current) return;
    lastItemsRef.current = serialized;

    const checkBatch = async () => {
      setIsLoading(true);
      try {
        const response = await widgetService.checkBatch(items);
        const newStates = new Map<string, boolean>();
        const results = response.results || response;
        for (const [key, value] of Object.entries(results)) {
          newStates.set(key, Boolean(value));
        }
        setWidgetStates(newStates);
      } catch (error) {
        log.error('Failed to batch-check widget states', { error });
      } finally {
        setIsLoading(false);
      }
    };

    checkBatch();
  }, [items]);

  const toggle = useCallback(
    async (params: ToggleParams): Promise<boolean> => {
      const key = makeKey(params.content_type, params.content_id);
      const currentState = widgetStates.get(key) || false;
      const newState = !currentState;

      // Optimistic update
      setWidgetStates((prev) => {
        const next = new Map(prev);
        next.set(key, newState);
        return next;
      });

      try {
        const response = await widgetService.toggle({
          content_type: params.content_type,
          content_id: params.content_id,
          title: params.title,
          description: params.description,
          icon: params.icon,
          cover_url: params.cover_url,
        });

        // Reconcile with server response
        const serverState = response.exists ?? response;
        setWidgetStates((prev) => {
          const next = new Map(prev);
          next.set(key, Boolean(serverState));
          return next;
        });

        return Boolean(serverState);
      } catch (error) {
        // Revert optimistic update on failure
        setWidgetStates((prev) => {
          const next = new Map(prev);
          next.set(key, currentState);
          return next;
        });
        log.error('Failed to toggle widget', {
          contentType: params.content_type,
          contentId: params.content_id,
          error,
        });
        return currentState;
      }
    },
    [widgetStates]
  );

  return { widgetStates, toggle, isLoading };
}
