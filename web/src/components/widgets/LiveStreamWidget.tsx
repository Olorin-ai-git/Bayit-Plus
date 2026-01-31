/**
 * LiveStreamWidget Component
 *
 * A specialized widget that renders a YouTube iframe in a floating PiP window.
 * User can resize, drag, minimize/expand, and close the widget.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, Pressable } from 'react-native';
import { X, Minimize2, Volume2, VolumeX } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { colors } from '@olorin/design-tokens';
import logger from '@/utils/logger';
import { MinimizedLiveStream } from './MinimizedLiveStream';
import { styles, TOUCH_TARGET_SIZE } from './LiveStreamWidget.styles';

interface LiveStreamWidgetProps {
  streamUrl: string;
  title: string;
  channelName?: string;
  attribution?: string;
  onClose: () => void;
  initialMuted?: boolean;
}

export function LiveStreamWidget({
  streamUrl, title, channelName, attribution, onClose, initialMuted = false,
}: LiveStreamWidgetProps) {
  const { t } = useTranslation();
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMuted, setIsMuted] = useState(initialMuted);

  const handleToggleMinimize = useCallback(() => {
    setIsMinimized((prev) => !prev);
    logger.debug('LiveStreamWidget minimized state toggled', 'LiveStreamWidget', { isMinimized: !isMinimized });
  }, [isMinimized]);

  const handleToggleMute = useCallback(() => setIsMuted((prev) => !prev), []);

  const handleClose = useCallback(() => {
    logger.info('LiveStreamWidget closed', 'LiveStreamWidget', { title });
    onClose();
  }, [onClose, title]);

  const iframeUrl = useMemo(() => {
    const url = new URL(streamUrl);
    url.searchParams.set('mute', isMuted ? '1' : '0');
    url.searchParams.set('autoplay', '1');
    url.searchParams.set('enablejsapi', '1');
    return url.toString();
  }, [streamUrl, isMuted]);

  if (isMinimized) {
    return (
      <MinimizedLiveStream
        title={title} channelName={channelName} isMuted={isMuted}
        onToggleMute={handleToggleMute} onExpand={handleToggleMinimize} onClose={handleClose}
      />
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerInfo}>
          <View style={styles.liveBadge}><Text style={styles.liveBadgeText}>LIVE</Text></View>
          <Text style={styles.headerTitle} numberOfLines={1}>{channelName || title}</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable onPress={handleToggleMute} style={styles.actionButton} accessibilityRole="button"
            accessibilityLabel={isMuted ? t('common.unmute') : t('common.mute')}>
            {isMuted ? <VolumeX size={18} color={colors.text} /> : <Volume2 size={18} color={colors.text} />}
          </Pressable>
          <Pressable onPress={handleToggleMinimize} style={styles.actionButton} accessibilityRole="button"
            accessibilityLabel={t('widgets.minimize')}>
            <Minimize2 size={18} color={colors.text} />
          </Pressable>
          <Pressable onPress={handleClose} style={styles.actionButton} accessibilityRole="button"
            accessibilityLabel={t('common.close')}>
            <X size={18} color={colors.text} />
          </Pressable>
        </View>
      </View>
      <View style={styles.videoContainer}>
        <iframe src={iframeUrl} style={{ width: '100%', height: '100%', border: 'none' }} title={title}
          allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
          sandbox="allow-scripts allow-same-origin allow-presentation" allowFullScreen />
      </View>
      <View style={styles.nowPlayingBar}><Text style={styles.nowPlayingTitle} numberOfLines={1}>{title}</Text></View>
      {attribution && <View style={styles.attributionFooter}><Text style={styles.attributionText}>{attribution}</Text></View>}
    </View>
  );
}

export default LiveStreamWidget;
