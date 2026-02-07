/**
 * WindowPodcastPlayer - Audio player with artwork display for podcasts
 * Uses react-native-video with poster image, skip forward/back controls
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import Video, { VideoRef, OnProgressData, OnLoadData } from 'react-native-video';
import { SkipBack, SkipForward, Play, Pause } from 'lucide-react-native';
import { colors, spacing, borderRadius } from '@olorin/design-tokens';
import { logger } from '../../../utils/logger';
import { useTranslation } from 'react-i18next';
import config from '@/config/appConfig';

const PC = config.tv.player;
const ARTWORK_SIZE = 180;

interface WindowPodcastPlayerProps {
  windowId: string;
  audioUrl: string;
  title: string;
  artworkUrl: string;
  isAudioActive: boolean;
  onClose: () => void;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function WindowPodcastPlayer({
  windowId, audioUrl, title, artworkUrl, isAudioActive, onClose,
}: WindowPodcastPlayerProps) {
  const { t } = useTranslation();
  const videoRef = useRef<VideoRef>(null);
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef<NodeJS.Timeout>();
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [hasError, setHasError] = useState(false);

  const handleLoad = useCallback((data: OnLoadData) => {
    setDuration(data.duration);
    retryCountRef.current = 0;
    setHasError(false);
    logger.info('Podcast loaded', { windowId, title, duration: data.duration });
  }, [windowId, title]);

  const handleProgress = useCallback((data: OnProgressData) => {
    setCurrentTime(data.currentTime);
  }, []);

  const handleSkip = useCallback((direction: 1 | -1) => {
    const newTime = Math.max(0, Math.min(currentTime + PC.seekStepSeconds * direction, duration));
    videoRef.current?.seek(newTime);
    setCurrentTime(newTime);
  }, [currentTime, duration]);

  const handleError = useCallback((error: unknown) => {
    const attempt = retryCountRef.current;
    logger.error('Podcast player error', { windowId, title, attempt, error: String(error) });
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
  }, []);

  const progress = duration > 0 ? currentTime / duration : 0;

  if (hasError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{t('tvos.player.podcastUnavailable')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Video
        ref={videoRef}
        source={{ uri: audioUrl }}
        audioOnly
        paused={!isPlaying}
        muted={!isAudioActive}
        volume={isAudioActive ? 1.0 : 0}
        onLoad={handleLoad}
        onProgress={handleProgress}
        onError={handleError}
        onEnd={() => setIsPlaying(false)}
        ignoreSilentSwitch="ignore"
        playInBackground
      />
      <Image source={{ uri: artworkUrl }} style={styles.artwork} />
      <Text style={styles.title} numberOfLines={2}>{title}</Text>
      <View style={styles.controlsRow}>
        <Pressable
          style={({ focused }) => [styles.ctrlBtn, focused && styles.ctrlBtnFocused]}
          onPress={() => handleSkip(-1)}
        >
          <SkipBack size={PC.controlIconSize} color={colors.white} />
        </Pressable>
        <Pressable
          style={({ focused }) => [styles.playBtn, focused && styles.ctrlBtnFocused]}
          onPress={() => setIsPlaying((p) => !p)}
        >
          {isPlaying
            ? <Pause size={PC.controlIconSize} color={colors.white} />
            : <Play size={PC.controlIconSize} color={colors.white} />}
        </Pressable>
        <Pressable
          style={({ focused }) => [styles.ctrlBtn, focused && styles.ctrlBtnFocused]}
          onPress={() => handleSkip(1)}
        >
          <SkipForward size={PC.controlIconSize} color={colors.white} />
        </Pressable>
      </View>
      <View style={styles.progressSection}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
        <View style={styles.timeRow}>
          <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
          <Text style={styles.timeText}>{formatTime(duration)}</Text>
        </View>
      </View>
    </View>
  );
}

const btnR = PC.controlButtonSize / 2;
const playR = (PC.controlButtonSize + 8) / 2;
const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: colors.glassStrong,
    alignItems: 'center', justifyContent: 'center', padding: spacing.lg,
  },
  artwork: {
    width: ARTWORK_SIZE, height: ARTWORK_SIZE,
    borderRadius: borderRadius.lg, marginBottom: spacing.md, backgroundColor: colors.glassMedium,
  },
  title: {
    fontSize: config.tv.minButtonTextSizePt, fontWeight: '600',
    color: colors.white, textAlign: 'center', marginBottom: spacing.md,
  },
  controlsRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, marginBottom: spacing.md },
  ctrlBtn: {
    width: PC.controlButtonSize, height: PC.controlButtonSize, borderRadius: btnR,
    backgroundColor: colors.glassMedium, justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: colors.glassBorderLight,
  },
  playBtn: {
    width: PC.controlButtonSize + 8, height: PC.controlButtonSize + 8, borderRadius: playR,
    backgroundColor: colors.primary[700], justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: colors.primary[500],
  },
  ctrlBtnFocused: {
    borderColor: colors.primary[500], backgroundColor: colors.glassPurpleLight,
    transform: [{ scale: config.tv.focusScaleFactor }],
  },
  progressSection: { width: '100%', paddingHorizontal: spacing.sm },
  progressTrack: {
    height: PC.progressBarHeight, backgroundColor: colors.glassBorderLight,
    borderRadius: PC.progressBarHeight / 2, overflow: 'hidden',
  },
  progressFill: {
    height: '100%', backgroundColor: colors.primary[500],
    borderRadius: PC.progressBarHeight / 2,
  },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xs },
  timeText: { fontSize: config.tv.minButtonTextSizePt, color: colors.textMuted },
  errorContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: colors.black, padding: spacing.lg,
  },
  errorText: { fontSize: config.tv.minBodyTextSizePt, color: colors.textMuted, textAlign: 'center' },
});
