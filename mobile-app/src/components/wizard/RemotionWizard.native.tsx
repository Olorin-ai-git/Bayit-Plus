/**
 * Remotion Wizard Component (React Native - iOS/Android)
 * Pre-rendered MP4 playback of multi-gesture wizard animations
 * Platform: iOS, Android
 */

import React, { useCallback, useEffect, useRef } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import Video, { VideoRef } from 'react-native-video';
import { useRemotionWizard } from '../../../../shared/hooks/useRemotionWizard';
import { AnimationSequence } from '../../../../shared/remotion/utils/sequencing';
import { logger } from '../../utils/logger';

/**
 * Map sequence IDs to pre-rendered MP4 file paths
 * Videos are rendered at build time and included in app bundle
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
  /** Optional size override (default: 330) */
  size?: number;
  /** Callback when animation sequence completes */
  onComplete?: () => void;
  /** Optional style overrides */
  style?: object;
}

/**
 * Remotion Wizard Component for React Native
 *
 * Renders wizard animations using pre-rendered MP4 videos for optimal performance.
 * Automatically syncs with global wizard state via useRemotionWizard hook.
 *
 * Features:
 * - Pre-rendered MP4s for smooth playback
 * - Low memory footprint
 * - Playback speed control
 * - Effects intensity via opacity
 * - Platform-optimized (iOS/Android)
 *
 * @example
 * ```tsx
 * import { RemotionWizard } from './components/wizard/RemotionWizard.native';
 *
 * function VoiceModal() {
 *   const handleComplete = () => {
 *     console.log('Animation complete');
 *   };
 *
 *   return <RemotionWizard onComplete={handleComplete} />;
 * }
 * ```
 */
export const RemotionWizard: React.FC<RemotionWizardProps> = ({
  size = 330,
  onComplete,
  style,
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
    logger.error('Remotion video playback error', 'RemotionWizard', error);
  }, []);

  // Update playback speed when it changes
  useEffect(() => {
    if (videoRef.current && Platform.OS === 'ios') {
      // iOS supports playback rate adjustment
      videoRef.current.setNativeProps({ rate: playbackSpeed });
    }
    // Android has limited rate control support, may not work on all devices
  }, [playbackSpeed]);

  // If no sequence is playing, render nothing
  if (!isPlaying || !currentSequence) {
    return null;
  }

  // Get video source for current sequence
  const videoSource = SEQUENCE_VIDEOS[currentSequence];

  if (!videoSource) {
    logger.warn(`No video found for sequence: ${currentSequence}`, 'RemotionWizard');
    return null;
  }

  return (
    <View
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
        // iOS-specific optimizations
        allowsExternalPlayback={false}
        pictureInPicture={false}
        // Android-specific optimizations
        poster="" // Disable poster for faster start
        bufferConfig={{
          minBufferMs: 1000,
          maxBufferMs: 5000,
          bufferForPlaybackMs: 500,
          bufferForPlaybackAfterRebufferMs: 1000,
        }}
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
