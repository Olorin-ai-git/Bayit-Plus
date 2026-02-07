/**
 * WindowRadioPlayer - Live radio stream player for multi-window system
 * Audio-only with station branding, no seek (live stream)
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Video, { VideoRef } from 'react-native-video';
import { Play, Pause, Radio } from 'lucide-react-native';
import { colors, spacing, borderRadius } from '@olorin/design-tokens';
import { logger } from '../../../utils/logger';
import { useTranslation } from 'react-i18next';
import config from '@/config/appConfig';

const PLAYER_CONFIG = config.tv.player;

interface WindowRadioPlayerProps {
  windowId: string;
  streamUrl: string;
  stationName: string;
  isAudioActive: boolean;
  onClose: () => void;
}

export function WindowRadioPlayer({
  windowId,
  streamUrl,
  stationName,
  isAudioActive,
  onClose,
}: WindowRadioPlayerProps) {
  const { t } = useTranslation();
  const videoRef = useRef<VideoRef>(null);
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef<NodeJS.Timeout>();

  const [isPlaying, setIsPlaying] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleLoad = useCallback(() => {
    retryCountRef.current = 0;
    setHasError(false);
    logger.info('Radio stream loaded', { windowId, stationName });
  }, [windowId, stationName]);

  const handleError = useCallback(
    (error: unknown) => {
      const attempt = retryCountRef.current;
      logger.error('Radio player error', {
        windowId,
        stationName,
        attempt,
        error: String(error),
      });
      if (attempt < PLAYER_CONFIG.errorRetryMaxAttempts) {
        const delay = PLAYER_CONFIG.errorRetryBaseDelayMs * Math.pow(2, attempt);
        retryCountRef.current = attempt + 1;
        retryTimerRef.current = setTimeout(() => setHasError(false), delay);
      } else {
        setHasError(true);
      }
    },
    [windowId, stationName],
  );

  useEffect(() => {
    return () => {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, []);

  if (hasError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>
          {t('tvos.player.stationUnavailable')}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Hidden audio player */}
      <Video
        ref={videoRef}
        source={{ uri: streamUrl }}
        audioOnly
        paused={!isPlaying}
        muted={!isAudioActive}
        volume={isAudioActive ? 1.0 : 0}
        onLoad={handleLoad}
        onError={handleError}
        ignoreSilentSwitch="ignore"
        playInBackground
      />

      {/* Station branding */}
      <View style={styles.brandingContainer}>
        <View style={styles.radioIcon}>
          <Radio size={48} color={colors.primary[400]} />
        </View>
        <Text style={styles.stationName} numberOfLines={2}>
          {stationName}
        </Text>
        <View style={styles.liveBadge}>
          <Text style={styles.liveText}>{t('tvos.player.live')}</Text>
        </View>
      </View>

      {/* Play/Pause control */}
      <Pressable
        style={({ focused }) => [
          styles.playButton,
          focused && styles.playButtonFocused,
        ]}
        onPress={() => setIsPlaying((p) => !p)}
      >
        {isPlaying ? (
          <Pause size={PLAYER_CONFIG.controlIconSize} color={colors.white} />
        ) : (
          <Play size={PLAYER_CONFIG.controlIconSize} color={colors.white} />
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.glassStrong,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  brandingContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  radioIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.glassPurpleLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: colors.glassBorder,
  },
  stationName: {
    fontSize: config.tv.minBodyTextSizePt,
    fontWeight: '700',
    color: colors.white,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  liveBadge: {
    backgroundColor: colors.live,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  liveText: {
    fontSize: config.tv.minButtonTextSizePt,
    fontWeight: '700',
    color: colors.white,
  },
  playButton: {
    width: PLAYER_CONFIG.controlButtonSize + 8,
    height: PLAYER_CONFIG.controlButtonSize + 8,
    borderRadius: (PLAYER_CONFIG.controlButtonSize + 8) / 2,
    backgroundColor: colors.primary[700],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.primary[500],
  },
  playButtonFocused: {
    borderColor: colors.primary[400],
    backgroundColor: colors.primary[600],
    transform: [{ scale: config.tv.focusScaleFactor }],
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.black,
    padding: spacing.lg,
  },
  errorText: {
    fontSize: config.tv.minBodyTextSizePt,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
