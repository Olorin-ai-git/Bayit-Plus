import React, { useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAvatarMeshStore } from '@/stores/avatarMeshStore';
import logger from '@bayit/shared-utils/logger';

const progressLogger = logger.scope('MeshGenerationProgress');

const POLL_INTERVAL_MS = 5000;

const TERMINAL_STATUSES = ['ready', 'failed'] as const;
type TerminalStatus = typeof TERMINAL_STATUSES[number];

interface MeshGenerationProgressProps {
  avatarId: string;
  profileId: string;
  onReady: () => void;
}

const STATUS_ICON_MAP: Record<string, string> = {
  pending: '/icons/mesh-pending.svg',
  generating: '/icons/mesh-generating.svg',
  rigging: '/icons/mesh-rigging.svg',
  ready: '/icons/mesh-ready.svg',
  failed: '/icons/mesh-failed.svg',
};

export function MeshGenerationProgress({
  avatarId,
  profileId,
  onReady,
}: MeshGenerationProgressProps) {
  const { t } = useTranslation();
  const { mesh, loading, error, fetchMeshStatus, clearError } = useAvatarMeshStore();
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  const isTerminal = useCallback((status: string): status is TerminalStatus => {
    return TERMINAL_STATUSES.includes(status as TerminalStatus);
  }, []);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => {
    fetchMeshStatus(avatarId);

    pollRef.current = setInterval(() => {
      fetchMeshStatus(avatarId);
    }, POLL_INTERVAL_MS);

    progressLogger.info('Started mesh status polling', { avatarId, profileId });

    return () => {
      stopPolling();
      progressLogger.info('Stopped mesh status polling', { avatarId });
    };
  }, [avatarId, profileId, fetchMeshStatus, stopPolling]);

  useEffect(() => {
    if (!mesh) return;

    if (mesh.status === 'ready') {
      stopPolling();
      progressLogger.info('Mesh generation complete', {
        avatarId,
        vertexCount: String(mesh.vertex_count),
        boneCount: String(mesh.bone_count),
      });
      onReadyRef.current();
    }

    if (mesh.status === 'failed') {
      stopPolling();
      progressLogger.error('Mesh generation failed', {
        avatarId,
        errorMessage: mesh.error_message || 'unknown',
      });
    }
  }, [mesh, avatarId, stopPolling]);

  const currentStatus = mesh?.status || 'pending';
  const statusIcon = STATUS_ICON_MAP[currentStatus] || STATUS_ICON_MAP.pending;

  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-6 backdrop-blur-md">
      <div className="flex flex-col items-center gap-4">
        <img
          src={statusIcon}
          alt=""
          className="w-16 h-16 opacity-80"
          aria-hidden="true"
        />

        <h3 className="text-lg font-semibold text-white/90">
          {t(`zehAni.mesh.status.${currentStatus}`)}
        </h3>

        <p className="text-sm text-white/60 text-center">
          {t(`zehAni.mesh.statusDescription.${currentStatus}`)}
        </p>

        {!isTerminal(currentStatus) && (
          <div className="w-full max-w-xs">
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full animate-pulse w-2/3" />
            </div>
          </div>
        )}

        {currentStatus === 'failed' && mesh?.error_message && (
          <p className="text-sm text-red-400 text-center mt-2">
            {mesh.error_message}
          </p>
        )}

        {error && (
          <div className="flex items-center gap-2 mt-2">
            <p className="text-sm text-red-400">{error}</p>
            <button
              type="button"
              onClick={clearError}
              className="text-xs text-white/50 underline hover:text-white/80 transition-colors"
            >
              {t('common.dismiss')}
            </button>
          </div>
        )}

        {loading && !mesh && (
          <div className="w-6 h-6 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />
        )}
      </div>
    </div>
  );
}
