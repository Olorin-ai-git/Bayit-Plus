/**
 * Accessible Video Player Component
 * Implements WCAG 2.1 AA compliance with keyboard controls and ARIA labels
 */

import React, { useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { usePlatformDetection } from '../../hooks/usePlatformDetection';
import { useVideoPlayer } from '../../hooks/useVideoPlayer';
import { useScreenReaderAnnouncements } from '../../hooks/useScreenReaderAnnouncements';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { VideoControls } from './VideoControls';
import { GlassButton } from './GlassButton';
import { GlassModal } from './GlassModal';
import { glassTokens } from '../../styles/glass-tokens';

interface VideoSource {
  src: string;
  type: 'video/webm' | 'video/mp4';
}

interface CaptionTrack {
  src: string;
  lang: string;
  label: string;
}

interface AccessibleVideoPlayerProps {
  src: string | VideoSource[];
  posterSrc: string;
  captions?: CaptionTrack[];
  autoplay?: boolean;
  loop?: boolean;
  muted?: boolean;
  className?: string;
}

export const AccessibleVideoPlayer: React.FC<AccessibleVideoPlayerProps> = React.memo(({
  src,
  posterSrc,
  captions,
  autoplay = false,
  loop = false,
  muted = true,
  className = '',
}) => {
  const { t, i18n } = useTranslation();
  const platform = usePlatformDetection();
  const isTvOS = platform === 'tvos';
  const { announce, AnnouncementRegion } = useScreenReaderAnnouncements();

  const {
    videoRef,
    isPlaying,
    isMuted,
    isFullscreen,
    isMobile,
    isLoading,
    hasError,
    showKeyboardHelp,
    setShowKeyboardHelp,
    togglePlay,
    toggleMute,
    toggleFullscreen,
    handleKeyDown,
  } = useVideoPlayer({ autoplay: isTvOS ? false : autoplay, muted });

  const focusTrapRef = useFocusTrap(showKeyboardHelp);

  // Validate autoplay policy compliance
  useEffect(() => {
    if (autoplay && !muted) {
      console.warn('Autoplay with sound will be blocked by browsers. Setting muted=true.');
    }
  }, [autoplay, muted]);

  // Announce state changes to screen readers (WCAG 4.1.3)
  useEffect(() => {
    if (isPlaying) {
      announce(String(t('a11y.videoPlaying')));
    } else {
      announce(String(t('a11y.videoPaused')));
    }
  }, [isPlaying, announce, t]);

  // Memoize tap handler
  const handleTap = useCallback(() => {
    if (isMobile) {
      togglePlay();
    }
  }, [isMobile, togglePlay]);

  // tvOS: Show static poster only (video autoplay not supported)
  if (isTvOS) {
    return (
      <div className={`relative ${className}`}>
        <img
          src={posterSrc}
          alt=""
          className="w-full h-full rounded-lg object-cover"
          aria-hidden="true"
        />
        <div className={`absolute inset-0 ${glassTokens.layers.tvos} rounded-lg flex items-center justify-center`}>
          <p className="text-white text-2xl font-semibold text-center px-6">
            {t('a11y.videoNotSupportedTvOS') || 'Video playback not supported on Apple TV'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative group focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 ${className}`}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="region"
      aria-label={String(t('a11y.videoPlayer'))}
    >
      <video
        ref={videoRef}
        poster={posterSrc}
        autoPlay={autoplay && muted}
        loop={loop}
        muted={muted}
        playsInline
        onClick={handleTap}
        preload="metadata"
        className="w-full h-full rounded-lg"
        aria-label={String(t('a11y.videoContent'))}
      >
        {Array.isArray(src) ? (
          src.map((source, index) => (
            <source key={index} src={source.src} type={source.type} />
          ))
        ) : (
          <source src={src} type="video/webm" />
        )}
        {captions && captions.length > 0 && captions.map((caption) => (
          <track
            key={caption.lang}
            kind="captions"
            src={caption.src}
            srcLang={caption.lang}
            label={caption.label}
            default={caption.lang === i18n.language}
          />
        ))}
      </video>

      <VideoControls
        isPlaying={isPlaying}
        isMuted={isMuted}
        isFullscreen={isFullscreen}
        isMobile={isMobile}
        onTogglePlay={togglePlay}
        onToggleMute={toggleMute}
        onToggleFullscreen={toggleFullscreen}
        showOverlay={false}
        keyboardHints={true}
        ariaLabels={{
          playVideo: String(t('a11y.playVideo')),
          pauseVideo: String(t('a11y.pauseVideo')),
          muteVideo: String(t('a11y.muteVideo')),
          unmuteVideo: String(t('a11y.unmuteVideo')),
          fullscreenVideo: String(t('a11y.fullscreenVideo')),
          exitFullscreen: String(t('a11y.exitFullscreen')),
          videoControls: String(t('a11y.videoControls')),
        }}
      />

      {/* Loading Spinner */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Error State */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <div className="text-center p-6">
            <p className="text-white text-lg mb-4">{t('errors.videoLoadFailed')}</p>
            <GlassButton onClick={() => window.location.reload()}>
              {t('actions.retry')}
            </GlassButton>
          </div>
        </div>
      )}

      {/* Screen Reader Announcements */}
      <AnnouncementRegion />

      {/* Keyboard Shortcuts Modal */}
      <GlassModal visible={showKeyboardHelp} onClose={() => setShowKeyboardHelp(false)}>
        <div ref={focusTrapRef} className="p-6">
          <h2 className="text-2xl font-bold text-white mb-4">{t('a11y.keyboardShortcuts')}</h2>
          <dl className="space-y-3 text-white">
            <div className="flex justify-between items-center">
              <dt className="font-semibold">{t('a11y.playPause')}</dt>
              <dd className="flex gap-2">
                <kbd className="px-3 py-1 bg-white/10 rounded-lg">Space</kbd>
                <kbd className="px-3 py-1 bg-white/10 rounded-lg">K</kbd>
                <kbd className="px-3 py-1 bg-white/10 rounded-lg">Enter</kbd>
              </dd>
            </div>
            <div className="flex justify-between items-center">
              <dt className="font-semibold">{t('a11y.mute')}</dt>
              <dd><kbd className="px-3 py-1 bg-white/10 rounded-lg">M</kbd></dd>
            </div>
            <div className="flex justify-between items-center">
              <dt className="font-semibold">{t('a11y.fullscreen')}</dt>
              <dd><kbd className="px-3 py-1 bg-white/10 rounded-lg">F</kbd></dd>
            </div>
            <div className="flex justify-between items-center">
              <dt className="font-semibold">{t('a11y.skipBackward')}</dt>
              <dd><kbd className="px-3 py-1 bg-white/10 rounded-lg">← 10s</kbd></dd>
            </div>
            <div className="flex justify-between items-center">
              <dt className="font-semibold">{t('a11y.skipForward')}</dt>
              <dd><kbd className="px-3 py-1 bg-white/10 rounded-lg">→ 10s</kbd></dd>
            </div>
            <div className="flex justify-between items-center">
              <dt className="font-semibold">{t('a11y.closeHelp')}</dt>
              <dd><kbd className="px-3 py-1 bg-white/10 rounded-lg">Escape</kbd></dd>
            </div>
          </dl>
          <div className="mt-6">
            <GlassButton onClick={() => setShowKeyboardHelp(false)} className="w-full">
              {t('actions.close')}
            </GlassButton>
          </div>
        </div>
      </GlassModal>

      {/* Keyboard Shortcuts Help */}
      <div className="sr-only" role="status" aria-live="polite">
        Press ? for keyboard shortcuts
      </div>
    </div>
  );
});

export default AccessibleVideoPlayer;
