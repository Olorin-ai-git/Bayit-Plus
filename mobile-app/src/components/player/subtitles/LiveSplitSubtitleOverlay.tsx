/**
 * LiveSplitSubtitleOverlay - Real-time bilingual subtitles for live content
 *
 * Uses WebSocket to receive live subtitle feeds in two languages
 * simultaneously, displaying them in a split (top/bottom) layout.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { spacing } from '@olorin/design-tokens';
import { SubtitlePane } from './SubtitlePane';
import { logger } from '../../../utils/logger';
import Colors from '../../../theme/colors';

const log = logger.scope('LiveSplitSubtitleOverlay');

const RECONNECT_DELAY_MS = 3000;

interface LiveSplitSubtitleOverlayProps {
  channelId: string;
  primaryLang: string;
  secondaryLang: string;
}

export const LiveSplitSubtitleOverlay: React.FC<
  LiveSplitSubtitleOverlayProps
> = ({ channelId, primaryLang, secondaryLang }) => {
  const { t } = useTranslation();
  const [primaryText, setPrimaryText] = useState('');
  const [secondaryText, setSecondaryText] = useState('');
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const wsUrl = `wss://${
      process.env.BAYIT_WS_HOST ?? 'api.bayit.tv'
    }/ws/subtitles/${channelId}?primary=${primaryLang}&secondary=${secondaryLang}`;

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      log.info('Live split subtitle WebSocket connected', {
        channelId,
        primaryLang,
        secondaryLang,
      });
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'subtitle') {
          if (data.language === primaryLang) {
            setPrimaryText(data.text || '');
          } else if (data.language === secondaryLang) {
            setSecondaryText(data.text || '');
          }
        }
        if (data.type === 'bilingual_subtitle') {
          setPrimaryText(data.primary_text || '');
          setSecondaryText(data.secondary_text || '');
        }
      } catch (err) {
        log.error('Failed to parse split subtitle message', { error: err });
      }
    };

    ws.onclose = () => {
      log.info('Live split subtitle WebSocket closed', { channelId });
      reconnectTimerRef.current = setTimeout(connect, RECONNECT_DELAY_MS);
    };

    ws.onerror = () => {
      log.error('Live split subtitle WebSocket error', { channelId });
      ws.close();
    };

    wsRef.current = ws;
  }, [channelId, primaryLang, secondaryLang]);

  useEffect(() => {
    connect();
    return () => {
      wsRef.current?.close();
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
    };
  }, [connect]);

  if (!primaryText && !secondaryText) return null;

  return (
    <View
      style={styles.container}
      pointerEvents="none"
      accessibilityLabel={t('subtitles.liveSplitOverlay.label')}
      accessibilityRole="text"
    >
      {primaryText ? (
        <SubtitlePane
          text={primaryText}
          language={primaryLang}
          position="top"
        />
      ) : null}
      {secondaryText ? (
        <SubtitlePane
          text={secondaryText}
          language={secondaryLang}
          position="bottom"
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    paddingVertical: spacing.xxl,
  },
});
