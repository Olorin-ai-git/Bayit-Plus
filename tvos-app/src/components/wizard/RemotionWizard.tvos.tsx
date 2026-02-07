/**
 * Remotion Wizard Component (tvOS - Apple TV)
 * Pre-rendered MP4 playback optimized for 10-foot UI
 * Platform: tvOS (Apple TV)
 */

import React, { useCallback, useEffect, useRef } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import Video, { VideoRef } from 'react-native-video';
import { logger } from '../../utils/logger';
import { useRemotionWizard } from '../../../../shared/hooks/useRemotionWizard';
import { AnimationSequence } from '../../../../shared/remotion/utils/sequencing';

/**
 * Map sequence IDs to pre-rendered MP4 file paths
 * Videos are rendered at build time and included in app bundle
 * tvOS uses higher resolution (480x480) for 10-foot viewing
 */
const SEQUENCE_VIDEOS: Record<AnimationSequence, any> = {
  process_command: require('../../../../web/public/assets/animations/process_command.mp4'),
  summon_wizard: require('../../../../web/public/assets/animations/summon_wizard.mp4'),
  dismiss_wizard: require('../../../../web/public/assets/animations/dismiss_wizard.mp4'),
  magical_reveal: require('../../../../web/public/assets/animations/magical_reveal.mp4'),
  error_shake: require('../../../../web/public/assets/animations/error_shake.mp4'),
  success: require('../../../../web/public/assets/animations/success.mp4'),
  acknowledge_new: require('../../../../web/public/assets/animations/acknowledge_new.mp4'),
};

export interface RemotionWizardProps {
  /** Optional size override (default: 480 for tvOS) */
  size?: number;
  /** Callback when animation sequence completes */
  onComplete?: () => void;
  /** Optional style overrides */
  style?: object;
  /** Whether wizard is focusable (for focus navigation) */
  focusable?: boolean;
}

/**
 * Remotion Wizard Component for tvOS
 *
 * Renders wizard animations using pre-rendered MP4 videos optimized for TV viewing.
 * Automatically syncs with global wizard state via useRemotionWizard hook.
 *
 * Features:
 * - Pre-rendered MP4s optimized for 10-foot UI
 * - Larger size for TV viewing (480x480 default)
 * - High-quality playback on Apple TV
 * - Playback speed control
 * - Effects intensity via opacity
 * - Focus navigation support
 *
 * @example
 * ```tsx
 * import { RemotionWizard } from './components/wizard/RemotionWizard.tvos';
 *
 * function VoiceModal() {
 *   const handleComplete = () => {
 *     logger.info('Animation complete', { module: 'RemotionWizard' });
 *   };
 *
 *   return <RemotionWizard onComplete={handleComplete} focusable={false} />;
 * }
 * ```
 */
export const RemotionWizard: React.FC<RemotionWizardProps> = ({
  size = 480, // Larger default for TV viewing
  onComplete,
  style,
  focusable = false,
}) => {
  const videoRef = useRef<VideoRef>(null);
  const {
    currentSequence,
    isPlaying,
    playbackSpeed,
    effectsIntensity,
  } = useRemotionWizard();

  // Handle animation completion
  const handleEnd = useCallback(() => {
    if (onComplete) {
      onComplete();
    }
  }, [onComplete]);

  // Handle video errors
  const handleError = useCallback((error: any) => {
    logger.error('Remotion video playback error', { module: 'RemotionWizard', error: error instanceof Error ? error.message : String(error) });
  }, []);

  // Update playback speed when it changes
  useEffect(() => {
    if (videoRef.current) {
      // tvOS (iOS) supports playback rate adjustment
      videoRef.current.setNativeProps({ rate: playbackSpeed });
    }
  }, [playbackSpeed]);

  // If no sequence is playing, render nothing
  if (!isPlaying || !currentSequence) {
    return null;
  }

  // Get video source for current sequence
  const videoSource = SEQUENCE_VIDEOS[currentSequence];

  if (!videoSource) {
    logger.warn('No video found for sequence', { module: 'RemotionWizard', sequence: currentSequence });
    return null;
  }

  return (
    <View
      focusable={focusable}
      style={[
        styles.container,
        {
          width: size,
          height: size,
          opacity: effectsIntensity, // Control effects intensity via opacity
        },
        style,
      ]}
    >
      <Video
        ref={videoRef}
        source={videoSource}
        style={styles.video}
        resizeMode="contain"
        repeat={false}
        paused={false}
        rate={playbackSpeed}
        volume={0} // Muted (no audio in wizard animations)
        muted
        playInBackground={false}
        playWhenInactive={false}
        onEnd={handleEnd}
        onError={handleError}
        // tvOS-specific optimizations
        allowsExternalPlayback={false}
        pictureInPicture={false}
        ignoreSilentSwitch="ignore"
        // Higher quality buffering for tvOS
        bufferConfig={{
          minBufferMs: 2000, // Larger buffer for TV
          maxBufferMs: 10000,
          bufferForPlaybackMs: 1000,
          bufferForPlaybackAfterRebufferMs: 2000,
        }}
        // tvOS hardware acceleration
        useTextureView={false} // Use SurfaceView for better performance
        disableFocus={!focusable}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  video: {
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
  },
});

export default RemotionWizard;
