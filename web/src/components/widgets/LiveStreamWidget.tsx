/**
 * LiveStreamWidget Component
 *
 * A specialized widget that renders a YouTube iframe in a floating PiP window.
 * User can resize, drag, minimize/expand, and close the widget.
 * Used for watching Kan Educational while browsing other content.
 */

import React, { useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { X, Minimize2, Maximize2, Volume2, VolumeX } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens';
import logger from '@/utils/logger';

interface LiveStreamWidgetProps {
  streamUrl: string;
  title: string;
  channelName?: string;
  attribution?: string;
  onClose: () => void;
  initialMuted?: boolean;
}

export function LiveStreamWidget({
  streamUrl,
  title,
  channelName,
  attribution,
  onClose,
  initialMuted = false,
}: LiveStreamWidgetProps) {
  const { t } = useTranslation();
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMuted, setIsMuted] = useState(initialMuted);

  const handleToggleMinimize = useCallback(() => {
    setIsMinimized((prev) => !prev);
    logger.debug('LiveStreamWidget minimized state toggled', 'LiveStreamWidget', { isMinimized: !isMinimized });
  }, [isMinimized]);

  const handleToggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
  }, []);

  const handleClose = useCallback(() => {
    logger.info('LiveStreamWidget closed', 'LiveStreamWidget', { title });
    onClose();
  }, [onClose, title]);

  // Build iframe URL with mute parameter
  const iframeUrl = React.useMemo(() => {
    const url = new URL(streamUrl);
    url.searchParams.set('mute', isMuted ? '1' : '0');
    url.searchParams.set('autoplay', '1');
    url.searchParams.set('enablejsapi', '1');
    return url.toString();
  }, [streamUrl, isMuted]);

  if (isMinimized) {
    return (
      <View style={styles.minimizedContainer}>
        <Pressable onPress={handleToggleMinimize} style={styles.minimizedContent}>
          <View style={styles.minimizedInfo}>
            <View style={styles.liveBadge}>
              <Text style={styles.liveBadgeText}>LIVE</Text>
            </View>
            <Text style={styles.minimizedTitle} numberOfLines={1}>
              {channelName || title}
            </Text>
          </View>
          <View style={styles.minimizedActions}>
            <Pressable onPress={handleToggleMute} style={styles.actionButton}>
              {isMuted ? (
                <VolumeX size={14} color={colors.text} />
              ) : (
                <Volume2 size={14} color={colors.text} />
              )}
            </Pressable>
            <Maximize2 size={14} color={colors.text} />
          </View>
        </Pressable>
        <Pressable onPress={handleClose} style={styles.closeButtonSmall}>
          <X size={12} color={colors.text} />
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerInfo}>
          <View style={styles.liveBadge}>
            <Text style={styles.liveBadgeText}>LIVE</Text>
          </View>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {channelName || title}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable onPress={handleToggleMute} style={styles.actionButton}>
            {isMuted ? (
              <VolumeX size={16} color={colors.text} />
            ) : (
              <Volume2 size={16} color={colors.text} />
            )}
          </Pressable>
          <Pressable onPress={handleToggleMinimize} style={styles.actionButton}>
            <Minimize2 size={16} color={colors.text} />
          </Pressable>
          <Pressable onPress={handleClose} style={styles.actionButton}>
            <X size={16} color={colors.text} />
          </Pressable>
        </View>
      </View>

      {/* Video Content */}
      <View style={styles.videoContainer}>
        <iframe
          src={iframeUrl}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
          }}
          title={title}
          allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
          allowFullScreen
        />
      </View>

      {/* Now Playing */}
      <View style={styles.nowPlayingBar}>
        <Text style={styles.nowPlayingTitle} numberOfLines={1}>
          {title}
        </Text>
      </View>

      {/* Attribution Footer */}
      {attribution && (
        <View style={styles.attributionFooter}>
          <Text style={styles.attributionText}>{attribution}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(10, 10, 20, 0.95)',
    // @ts-ignore - Web CSS
    backdropFilter: 'blur(12px)',
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.glassBorderLight,
  } as any,
  minimizedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(10, 10, 20, 0.95)',
    // @ts-ignore - Web CSS
    backdropFilter: 'blur(12px)',
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.glassBorderLight,
    minWidth: 200,
  } as any,
  minimizedContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  minimizedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm,
  },
  minimizedTitle: {
    fontSize: fontSize.sm,
    color: colors.text,
    flex: 1,
  },
  minimizedActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  closeButtonSmall: {
    marginLeft: spacing.sm,
    padding: spacing.xs,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: borderRadius.full,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm,
  },
  headerTitle: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  actionButton: {
    padding: spacing.xs,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  liveBadge: {
    backgroundColor: colors.error.DEFAULT,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  liveBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  videoContainer: {
    flex: 1,
    backgroundColor: '#000',
    aspectRatio: 16 / 9,
  },
  nowPlayingBar: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  nowPlayingTitle: {
    fontSize: fontSize.xs,
    color: colors.text,
  },
  attributionFooter: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  attributionText: {
    fontSize: 9,
    color: colors.textMuted,
    textAlign: 'center',
  },
});

export default LiveStreamWidget;
