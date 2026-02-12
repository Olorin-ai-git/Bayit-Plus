/**
 * useChameleonAvatar Hook
 * Background style-matching for avatar + show combos via Chameleon Engine.
 * Checks cache, triggers preparation if needed, polls until ready.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import api from '@/services/api';
import logger from '@/utils/logger';

const log = logger.scope('ChameleonAvatar');

const POLL_INTERVAL_MS = parseInt(
  import.meta.env.VITE_CHAMELEON_POLL_INTERVAL_MS || '3000',
  10,
);

interface ChameleonAvatarState {
  avatarUrl: string | null;
  isReady: boolean;
  isLoading: boolean;
  error: string | null;
}

export function useChameleonAvatar(avatarId: string, showContentId: string): ChameleonAvatarState {
  const { t } = useTranslation();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const startPolling = useCallback((cacheId: string) => {
    clearPolling();
    pollRef.current = setInterval(async () => {
      try {
        const data = await api.get(`/chameleon/status/${cacheId}`) as any;
        if (!isMountedRef.current) return;
        if (data.status === 'ready') {
          const url = data.poses?.[0]?.gcs_path ?? null;
          setAvatarUrl(url);
          setIsReady(true);
          setIsLoading(false);
          clearPolling();
          log.info('Style transfer ready', { cacheId });
        } else if (data.status === 'failed') {
          setError(t('chameleon.failed'));
          setIsLoading(false);
          clearPolling();
          log.warn('Style transfer failed', { cacheId });
        }
      } catch (err: any) {
        if (!isMountedRef.current) return;
        setError(err?.detail || err?.message || t('chameleon.failed'));
        setIsLoading(false);
        clearPolling();
        log.error('Polling error', { cacheId, error: String(err) });
      }
    }, POLL_INTERVAL_MS);
  }, [clearPolling, t]);

  useEffect(() => {
    isMountedRef.current = true;
    if (!avatarId || !showContentId) return;

    const init = async () => {
      setIsLoading(true);
      setError(null);
      setIsReady(false);
      setAvatarUrl(null);

      try {
        const cached = await api.get('/chameleon/cached', {
          params: { avatar_id: avatarId, show_content_id: showContentId },
        }) as any;

        if (!isMountedRef.current) return;

        if (cached.cached && cached.cache?.status === 'ready') {
          const url = cached.cache.poses?.[0]?.gcs_path ?? null;
          setAvatarUrl(url);
          setIsReady(true);
          setIsLoading(false);
          log.info('Cached style found', { avatarId, showContentId });
          return;
        }

        const prepared = await api.post('/chameleon/prepare', {
          avatar_id: avatarId,
          show_content_id: showContentId,
        }) as any;

        if (!isMountedRef.current) return;

        if (prepared.status === 'ready') {
          setAvatarUrl(prepared.poses?.[0]?.gcs_path ?? null);
          setIsReady(true);
          setIsLoading(false);
          log.info('Prepare returned ready', { id: prepared.id });
        } else {
          startPolling(prepared.id);
        }
      } catch (err: any) {
        if (!isMountedRef.current) return;
        setError(err?.detail || err?.message || t('chameleon.failed'));
        setIsLoading(false);
        log.error('Init failed', { avatarId, showContentId, error: String(err) });
      }
    };

    init();

    return () => {
      isMountedRef.current = false;
      clearPolling();
    };
  }, [avatarId, showContentId, startPolling, clearPolling, t]);

  return { avatarUrl, isReady, isLoading, error };
}

export default useChameleonAvatar;
