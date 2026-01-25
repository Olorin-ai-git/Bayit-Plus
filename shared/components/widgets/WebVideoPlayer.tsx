/**
 * Web Video Player Component
 * HTML5 video element with WebVTT captions for WCAG 2.1 AA compliance
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { colors } from '@olorin/design-tokens';
import { CaptionUrls } from './WidgetsIntroVideo.types';

interface WebVideoPlayerProps {
  videoUrl: string;
  captionUrls: CaptionUrls;
  videoRef: React.MutableRefObject<any>;
  isLoading: boolean;
  autoPlay: boolean;
  onLoadedData: () => void;
  onEnded: () => void;
  onError: () => void;
  enableCast?: boolean;
}

export const WebVideoPlayer: React.FC<WebVideoPlayerProps> = ({
  videoUrl,
  captionUrls,
  videoRef,
  isLoading,
  autoPlay,
  onLoadedData,
  onEnded,
  onError,
  enableCast = false,
}) => {
  const { t } = useTranslation();

  // Note: Cast functionality placeholder
  // Intro videos use native controls, so custom cast button would require
  // disabling native controls and building full control overlay.
  // For simplicity, cast is managed at the VideoPlayer component level.

  return (
    <video
      ref={videoRef}
      src={videoUrl}
      aria-label={t('widgets.intro.title')}
      title={t('widgets.intro.title')}
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'contain',
        backgroundColor: colors.background,
        display: isLoading ? 'none' : 'block',
      } as React.CSSProperties}
      playsInline
      autoPlay={autoPlay}
      controls
      onLoadedData={onLoadedData}
      onEnded={onEnded}
      onError={onError}
    >
      {/* WebVTT caption tracks for WCAG 2.1 AA compliance */}
      <track
        kind="captions"
        src={captionUrls.en}
        srcLang="en"
        label="English"
        default
      />
      <track
        kind="captions"
        src={captionUrls.es}
        srcLang="es"
        label="Español"
      />
      <track
        kind="captions"
        src={captionUrls.he}
        srcLang="he"
        label="עברית"
      />
    </video>
  );
};

export default WebVideoPlayer;
