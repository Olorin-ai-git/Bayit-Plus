/**
 * WindowLivePlayer - Live TV player for multi-window system
 * Wraps react-native-video for HLS streams with auto-retry on error
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Video, { VideoRef } from 'react-native-video';
import { colors, spacing } from '@olorin/design-tokens';
import { logger } from '../../../utils/logger';
import { useTranslation } from 'react-i18next';
import config from '@/config/appConfig';
import { WindowPlayerControls } from './WindowPlayerControls';

const PC = config.tv.player;

interface WindowLivePlayerProps {
  windowId: string;
  channelUrl: string;
  channelName: string;
  isAudioActive: boolean;
  onClose: () => void;
}

export function WindowLivePlayer({
  windowId, channelUrl, channelName, isAudioActive, onClose,
}: WindowLivePlayerProps) {
  const { t } = useTranslation();
  const videoRef = useRef<VideoRef>(null);
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef<NodeJS.Timeout>();
  const hideTimerRef = useRef<NodeJS.Timeout>();
  const [isPlaying, setIsPlaying] = useState(true);
  const [controlsVisible, setControlsVisible] = useState(false);
  const [hasError, setHasError] = useState(false);

  const showControls = useCallback(() => {
    setControlsVisible(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setControlsVisible(false), PC.controlsAutoHideMs);
  }, []);

  const handlePlayPause = useCallback(() => {
    setIsPlaying((prev) => !prev);
    showControls();
  }, [showControls]);

  const handleError = useCallback((error: unknown) => {
    const attempt = retryCountRef.current;
    logger.error('Live player error', { windowId, channelName, attempt, error: String(error) });
    if (attempt < PC.errorRetryMaxAttempts) {
      retryCountRef.current = attempt + 1;
      retryTimerRef.current = setTimeout(
        () => setHasError(false),
        PC.errorRetryBaseDelayMs * Math.pow(2, attempt),
      );
    } else {
      setHasError(true);
    }
  }, [windowId, channelName]);

  const handleLoad = useCallback(() => {
    retryCountRef.current = 0;
    setHasError(false);
    logger.info('Live stream loaded', { windowId, channelName });
  }, [windowId, channelName]);

  useEffect(() => () => {
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
  }, []);

  if (hasError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{t('tvos.player.streamUnavailable')}</Text>
        <Text style={styles.channelLabel}>{channelName}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container} onTouchStart={showControls}>
      <Video
        ref={videoRef}
        source={{ uri: channelUrl }}
        style={styles.video}
        resizeMode="contain"
        paused={!isPlaying}
        muted={!isAudioActive}
        volume={isAudioActive ? 1.0 : 0}
        repeat={false}
        onLoad={handleLoad}
        onError={handleError}
        allowsExternalPlayback={false}
        pictureInPicture={false}
        ignoreSilentSwitch="ignore"
        bufferConfig={{
          minBufferMs: PC.bufferMinMs, maxBufferMs: PC.bufferMaxMs,
          bufferForPlaybackMs: PC.bufferPlaybackMs,
          bufferForPlaybackAfterRebufferMs: PC.bufferRebufferMs,
        }}
        useTextureView={false}
        disableFocus
      />
      <View style={styles.channelOverlay}>
        <Text style={styles.channelName} numberOfLines={1}>{channelName}</Text>
        <View style={styles.liveBadge}>
          <Text style={styles.liveText}>{t('tvos.player.live')}</Text>
        </View>
      </View>
      <WindowPlayerControls
        isPlaying={isPlaying}
        onPlayPause={handlePlayPause}
        onClose={onClose}
        visible={controlsVisible}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.black },
  video: { flex: 1, width: '100%', height: '100%' },
  channelOverlay: {
    position: 'absolute', top: spacing.sm, left: spacing.md,
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
  },
  channelName: { fontSize: config.tv.minButtonTextSizePt, fontWeight: '600', color: colors.white },
  liveBadge: {
    backgroundColor: colors.live,
    paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: 6,
  },
  liveText: { fontSize: config.tv.minButtonTextSizePt, fontWeight: '700', color: colors.white },
  channelLabel: { fontSize: config.tv.minBodyTextSizePt, color: colors.textSecondary, marginTop: spacing.sm },
  errorContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: colors.black, padding: spacing.lg,
  },
  errorText: { fontSize: config.tv.minBodyTextSizePt, color: colors.textMuted, textAlign: 'center' },
});
