import React, { useRef, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import logger from '@bayit/shared-utils/logger';
import type { HighlightReel } from '@/stores/zehAniStore.types';

const playerLogger = logger.scope('HighlightReelPlayer');

interface HighlightReelPlayerProps {
  reel: HighlightReel;
}

const SHARE_URL_PREFIX = import.meta.env.VITE_SHARE_BASE_URL || '';

export function HighlightReelPlayer({ reel }: HighlightReelPlayerProps) {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareUrl = `${SHARE_URL_PREFIX}/share/reel/${reel.share_token}`;

  const handlePlayToggle = useCallback(() => {
    if (!videoRef.current) return;
    if (playing) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setPlaying(!playing);
  }, [playing]);

  const handleCopyShareLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      playerLogger.info('Share link copied', { reelId: reel.id });
      const timer = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timer);
    } catch (copyError) {
      playerLogger.error('Failed to copy share link', copyError);
    }
  }, [shareUrl, reel.id]);

  const formattedDate = new Date(reel.created_at).toLocaleDateString(
    undefined,
    { year: 'numeric', month: 'short', day: 'numeric' },
  );

  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden backdrop-blur-md">
      <div className="relative aspect-video bg-black">
        {reel.video_gcs_path ? (
          <>
            <video
              ref={videoRef}
              src={reel.video_gcs_path}
              poster={reel.thumbnail_gcs_path || undefined}
              className="w-full h-full object-contain"
              onEnded={() => setPlaying(false)}
            />
            <button type="button" onClick={handlePlayToggle}
              className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/20 transition-colors"
              aria-label={playing ? t('common.pause') : t('common.play')}>
              {!playing && (
                <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                  <div className="w-0 h-0 border-t-[10px] border-t-transparent border-b-[10px] border-b-transparent border-l-[16px] border-l-white ml-1" />
                </div>
              )}
            </button>
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-white/20 border-t-white/80 rounded-full animate-spin mx-auto" />
              <p className="text-sm text-white/50 mt-3">
                {t('zehAni.highlights.generating')}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-white/40">{formattedDate}</span>
          <span className="text-xs text-white/40">
            {t('zehAni.highlights.credits', { count: reel.credits_charged })}
          </span>
        </div>

        {reel.moments.length > 0 && (
          <div className="mb-3">
            <p className="text-xs text-white/50 mb-2">
              {t('zehAni.highlights.moments', { count: reel.moments.length })}
            </p>
            <div className="space-y-1.5 max-h-32 overflow-y-auto">
              {reel.moments.map((moment, index) => (
                <div key={`${moment.source_id}-${index}`}
                  className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-white/5">
                  <span className="text-xs text-white/60 font-hebrew truncate flex-1" dir="rtl">
                    {moment.transcript_he}
                  </span>
                  <span className="text-xs font-medium text-white/70 ml-2">
                    {moment.score.toFixed(0)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <button type="button" onClick={handleCopyShareLink}
          className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors">
          {copied
            ? t('zehAni.highlights.linkCopied')
            : t('zehAni.highlights.shareLink')}
        </button>
      </div>
    </div>
  );
}
