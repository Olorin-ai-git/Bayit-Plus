import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import logger from '@bayit/shared-utils/logger';
import { useZehAniStore } from '@/stores/zehAniStore';
import type { FeedbackEntry } from '@/stores/zehAniStore.types';

const inboxLogger = logger.scope('FeedbackInbox');

interface FeedbackInboxProps {
  profileId: string;
}

interface VoiceNotePlayerProps {
  src: string;
  entryId: string;
}

function VoiceNotePlayer({ src, entryId }: VoiceNotePlayerProps) {
  const { t } = useTranslation();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  const handleToggle = useCallback(() => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
      inboxLogger.info('Voice note playback started', { entryId });
    }
    setPlaying(!playing);
  }, [playing, entryId]);

  return (
    <div className="flex items-center gap-2 mt-2">
      <audio
        ref={audioRef}
        src={src}
        onEnded={() => setPlaying(false)}
        preload="none"
      />
      <button type="button" onClick={handleToggle}
        className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center flex-shrink-0 transition-colors"
        aria-label={playing ? t('common.pause') : t('common.play')}>
        {playing ? (
          <div className="flex gap-0.5">
            <div className="w-1 h-3 bg-white/70 rounded-sm" />
            <div className="w-1 h-3 bg-white/70 rounded-sm" />
          </div>
        ) : (
          <div className="w-0 h-0 border-t-[5px] border-t-transparent border-b-[5px] border-b-transparent border-l-[8px] border-l-white/70 ml-0.5" />
        )}
      </button>
      <span className="text-xs text-white/40">
        {playing ? t('zehAni.feedback.playing') : t('zehAni.feedback.tapToPlay')}
      </span>
    </div>
  );
}

function formatTimestamp(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function FeedbackInbox({ profileId }: FeedbackInboxProps) {
  const { t } = useTranslation();
  const { feedback, loading, error, fetchFeedback, clearError } = useZehAniStore();

  useEffect(() => {
    fetchFeedback(profileId);
  }, [profileId, fetchFeedback]);

  if (loading && feedback.length === 0) {
    return (
      <div className="rounded-2xl bg-white/5 border border-white/10 p-5 backdrop-blur-md">
        <h3 className="text-lg font-semibold text-white/90 mb-4">
          {t('zehAni.feedback.title')}
        </h3>
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-5 backdrop-blur-md">
      <h3 className="text-lg font-semibold text-white/90 mb-4">
        {t('zehAni.feedback.title')}
      </h3>

      {error && (
        <div className="flex items-center gap-2 mb-3">
          <p className="text-sm text-red-400 flex-1">{error}</p>
          <button type="button" onClick={clearError}
            className="text-xs text-white/50 underline hover:text-white/80 transition-colors">
            {t('common.dismiss')}
          </button>
        </div>
      )}

      {feedback.length === 0 && (
        <p className="text-sm text-white/40 text-center py-6">
          {t('zehAni.feedback.empty')}
        </p>
      )}

      <div className="space-y-3">
        {feedback.map((entry) => (
          <div key={entry.id}
            className="p-3 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-white/80">
                {entry.contact_name}
              </span>
              <span className="text-xs text-white/30">
                {formatTimestamp(entry.created_at)}
              </span>
            </div>

            {entry.detected_language && (
              <span className="inline-block px-1.5 py-0.5 rounded-md bg-white/10 text-xs text-white/40 mb-1">
                {entry.detected_language}
              </span>
            )}

            {entry.transcript && (
              <p className="text-sm text-white/60 mt-1 leading-relaxed">
                {entry.transcript}
              </p>
            )}

            {entry.voice_note_gcs_path && (
              <VoiceNotePlayer
                src={entry.voice_note_gcs_path}
                entryId={entry.id}
              />
            )}

            {!entry.transcript && !entry.voice_note_gcs_path && (
              <p className="text-xs text-white/30 mt-1 italic">
                {t('zehAni.feedback.noContent')}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
