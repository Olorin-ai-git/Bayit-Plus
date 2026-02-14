/**
 * LiveSubtitleOverlay - Real-time captions for live streams
 *
 * Connects via WebSocket to receive live caption data for a channel
 * and displays auto-scrolling subtitle text at the bottom of the player.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { spacing, borderRadius } from '@olorin/design-tokens';
import { logger } from '../../../utils/logger';
import Colors from '../../../theme/colors';
import { config } from '../../../config/appConfig';

const log = logger.scope('LiveSubtitleOverlay');

const RECONNECT_DELAY_MS = 3000;
const MAX_VISIBLE_LINES = 3;
const RTL_LANGUAGES = ['he', 'ar', 'fa', 'ur'];

interface LiveSubtitleOverlayProps {
  channelId: string;
  language: string;
}

export const LiveSubtitleOverlay: React.FC<LiveSubtitleOverlayProps> = ({
  channelId,
  language,
}) => {
  const { t } = useTranslation();
  const [currentText, setCurrentText] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRTL = RTL_LANGUAGES.includes(language);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const wsUrl = `${config.api.enabled ? 'wss' : 'ws'}://${
      process.env.BAYIT_WS_HOST ?? 'api.bayit.tv'
    }/ws/subtitles/${channelId}?language=${language}`;

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setIsConnected(true);
      log.info('Live subtitle WebSocket connected', { channelId, language });
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'subtitle' && data.text) {
          setCurrentText(data.text);
        }
      } catch (err) {
        log.error('Failed to parse subtitle message', { error: err });
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      log.info('Live subtitle WebSocket closed', { channelId });
      reconnectTimerRef.current = setTimeout(connect, RECONNECT_DELAY_MS);
    };

    ws.onerror = () => {
      log.error('Live subtitle WebSocket error', { channelId });
      ws.close();
    };

    wsRef.current = ws;
  }, [channelId, language]);

  useEffect(() => {
    connect();
    return () => {
      wsRef.current?.close();
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
    };
  }, [connect]);

  if (!currentText) return null;

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(200)}
      style={styles.container}
      pointerEvents="none"
      accessibilityLabel={t('subtitles.liveOverlay.label')}
      accessibilityRole="text"
    >
      <View style={styles.background}>
        <Text
          style={[styles.text, isRTL && styles.rtlText]}
          numberOfLines={MAX_VISIBLE_LINES}
        >
          {currentText}
        </Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: spacing.xxl,
    left: spacing.md,
    right: spacing.md,
    alignItems: 'center',
  },
  background: {
    backgroundColor: Colors.Glass.bgStrong,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    maxWidth: '90%',
  },
  text: {
    fontSize: 16,
    color: Colors.Text.primary,
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '500',
  },
  rtlText: {
    writingDirection: 'rtl',
    textAlign: 'right',
  },
});
