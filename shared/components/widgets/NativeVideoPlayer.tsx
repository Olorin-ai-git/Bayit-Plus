/**
 * Native Video Player Component
 * react-native-video with textTracks for captions
 */

import React from 'react';
import Video, { TextTrackType, SelectedTrackType } from 'react-native-video';
import { CaptionUrls } from './WidgetsIntroVideo.types';
import { styles } from './WidgetsIntroVideo.styles';

interface NativeVideoPlayerProps {
  videoUrl: string;
  captionUrls: CaptionUrls;
  autoPlay: boolean;
  onLoad: () => void;
  onEnd: () => void;
  onError: () => void;
  enableCast?: boolean;
}

export const NativeVideoPlayer: React.FC<NativeVideoPlayerProps> = ({
  videoUrl,
  captionUrls,
  autoPlay,
  onLoad,
  onEnd,
  onError,
  enableCast = false,
}) => {
  // Note: Cast functionality placeholder
  // Intro videos use native controls, so custom cast button would require
  // disabling native controls and building full control overlay.
  // For simplicity, cast is managed at the MobileVideoPlayer component level.

  return (
    <Video
      source={{ uri: videoUrl }}
      style={styles.nativeVideo}
      controls
      resizeMode="contain"
      paused={!autoPlay}
      onLoad={onLoad}
      onEnd={onEnd}
      onError={onError}
      // Captions for native - derived from video URL
      textTracks={[
        {
          title: 'English',
          language: 'en',
          type: TextTrackType.VTT,
          uri: captionUrls.en,
        },
        {
          title: 'Español',
          language: 'es',
          type: TextTrackType.VTT,
          uri: captionUrls.es,
        },
        {
          title: 'עברית',
          language: 'he',
          type: TextTrackType.VTT,
          uri: captionUrls.he,
        },
      ]}
      selectedTextTrack={{ type: SelectedTrackType.LANGUAGE, value: 'en' }}
    />
  );
};

export default NativeVideoPlayer;
