/**
 * WindowVODPlayer - VOD player for multi-window system
 * On-demand content with progress tracking, seek support, resume from position
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Video, { VideoRef, OnProgressData, OnLoadData } from 'react-native-video';
import { SkipBack, SkipForward } from 'lucide-react-native';
import { colors, spacing } from '@olorin/design-tokens';
import { logger } from '../../../utils/logger';
import { useTranslation } from 'react-i18next';
import config from '@/config/appConfig';
import { WindowPlayerControls } from './WindowPlayerControls';

const PC = config.tv.player;

interface WindowVODPlayerProps {
  windowId: string;
  contentUrl: string;
  title: string;
  isAudioActive: boolean;
  startPosition?: number;
  onClose: () => void;
}

function formatTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const pad = (n: number) => String(n).padStart(2, '0');
  return hrs > 0 ? `${pad(hrs)}:${pad(mins)}:${pad(secs)}` : `${pad(mins)}:${pad(secs)}`;
}

export function WindowVODPlayer({
  windowId, contentUrl, title, isAudioActive, startPosition = 0, onClose,
}: WindowVODPlayerProps) {
  const { t } = useTranslation();
  const videoRef = useRef<VideoRef>(null);
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef<NodeJS.Timeout>();
  const hideTimerRef = useRef<NodeJS.Timeout>();
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
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

  const handleLoad = useCallback((data: OnLoadData) => {
    setDuration(data.duration);
    retryCountRef.current = 0;
    setHasError(false);
    if (startPosition > 0) videoRef.current?.seek(startPosition);
    logger.info('VOD content loaded', { windowId, title, duration: data.duration });
  }, [windowId, title, startPosition]);

  const handleProgress = useCallback((data: OnProgressData) => {
    setCurrentTime(data.currentTime);
  }, []);

  const handleSeekStep = useCallback((direction: 1 | -1) => {
    const newTime = Math.max(0, Math.min(currentTime + PC.seekStepSeconds * direction, duration));
    videoRef.current?.seek(newTime);
    setCurrentTime(newTime);
    showControls();
  }, [currentTime, duration, showControls]);

  const handleError = useCallback((error: unknown) => {
    const attempt = retryCountRef.current;
    logger.error('VOD player error', { windowId, title, attempt, error: String(error) });
    if (attempt < PC.errorRetryMaxAttempts) {
      retryCountRef.current = attempt + 1;
      retryTimerRef.current = setTimeout(
        () => setHasError(false),
        PC.errorRetryBaseDelayMs * Math.pow(2, attempt),
      );
    } else {
      setHasError(true);
    }
  }, [windowId, title]);

  useEffect(() => () => {
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
  }, []);

  const progress = duration > 0 ? currentTime / duration : 0;

  if (hasError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{t('tvos.player.contentUnavailable')}</Text>
        <Text style={styles.titleLabel}>{title}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container} onTouchStart={showControls}>
      <Video
        ref={videoRef}
        source={{ uri: contentUrl }}
        style={styles.video}
        resizeMode="contain"
        paused={!isPlaying}
        muted={!isAudioActive}
        volume={isAudioActive ? 1.0 : 0}
        onLoad={handleLoad}
        onProgress={handleProgress}
        onError={handleError}
        onEnd={() => setIsPlaying(false)}
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
      <View style={styles.titleOverlay}>
        <Text style={styles.titleText} numberOfLines={1}>{title}</Text>
      </View>
      {controlsVisible && (
        <View style={styles.seekRow}>
          <Pressable
            style={({ focused }) => [styles.seekButton, focused && styles.seekBtnFocused]}
            onPress={() => handleSeekStep(-1)}
          >
            <SkipBack size={PC.controlIconSize} color={colors.white} />
          </Pressable>
          <Pressable
            style={({ focused }) => [styles.seekButton, focused && styles.seekBtnFocused]}
            onPress={() => handleSeekStep(1)}
          >
            <SkipForward size={PC.controlIconSize} color={colors.white} />
          </Pressable>
        </View>
      )}
      {controlsVisible && (
        <View style={styles.timeDisplay}>
          <Text style={styles.timeText}>
            {formatTime(currentTime)} / {formatTime(duration)}
          </Text>
        </View>
      )}
      <WindowPlayerControls
        isPlaying={isPlaying}
        onPlayPause={handlePlayPause}
        onClose={onClose}
        showSeek
        progress={progress}
        visible={controlsVisible}
      />
    </View>
  );
}

const btnR = PC.controlButtonSize / 2;
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.black },
  video: { flex: 1, width: '100%', height: '100%' },
  titleOverlay: { position: 'absolute', top: spacing.sm, left: spacing.md, right: spacing.md },
  titleText: { fontSize: config.tv.minButtonTextSizePt, fontWeight: '600', color: colors.white },
  seekRow: {
    position: 'absolute', top: '40%', left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.md,
  },
  seekButton: {
    width: PC.controlButtonSize, height: PC.controlButtonSize, borderRadius: btnR,
    backgroundColor: colors.glassMedium, justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: colors.glassBorderLight,
  },
  seekBtnFocused: {
    borderColor: colors.primary[500], backgroundColor: colors.glassPurpleLight,
    transform: [{ scale: config.tv.focusScaleFactor }],
  },
  timeDisplay: { position: 'absolute', bottom: spacing[14], left: 0, right: 0, alignItems: 'center' },
  timeText: { fontSize: config.tv.minButtonTextSizePt, color: colors.textSecondary, fontWeight: '500' },
  errorContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: colors.black, padding: spacing.lg,
  },
  errorText: { fontSize: config.tv.minBodyTextSizePt, color: colors.textMuted, textAlign: 'center' },
  titleLabel: { fontSize: config.tv.minBodyTextSizePt, color: colors.textSecondary, marginTop: spacing.sm },
});
