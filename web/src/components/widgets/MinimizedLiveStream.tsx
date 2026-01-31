/**
 * MinimizedLiveStream Component
 *
 * Compact display for minimized live stream widget.
 * Shows LIVE badge, channel name, and control actions.
 */

import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { X, Maximize2, Volume2, VolumeX } from 'lucide-react';
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens';

const TOUCH_TARGET_SIZE = 44;

interface MinimizedLiveStreamProps {
  title: string;
  channelName?: string;
  isMuted: boolean;
  onToggleMute: () => void;
  onExpand: () => void;
  onClose: () => void;
}

export function MinimizedLiveStream({
  title,
  channelName,
  isMuted,
  onToggleMute,
  onExpand,
  onClose,
}: MinimizedLiveStreamProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <Pressable
        onPress={onExpand}
        style={styles.content}
        accessibilityRole="button"
        accessibilityLabel={t('widgets.expandWidget', 'Expand widget')}
      >
        <View style={styles.info}>
          <View style={styles.liveBadge}>
            <Text style={styles.liveBadgeText}>LIVE</Text>
          </View>
          <Text style={styles.title} numberOfLines={1}>
            {channelName || title}
          </Text>
        </View>
        <View style={styles.actions}>
          <Pressable
            onPress={onToggleMute}
            style={styles.actionButton}
            accessibilityRole="button"
            accessibilityLabel={isMuted ? t('common.unmute') : t('common.mute')}
          >
            {isMuted ? (
              <VolumeX size={18} color={colors.text} />
            ) : (
              <Volume2 size={18} color={colors.text} />
            )}
          </Pressable>
          <Maximize2 size={18} color={colors.text} />
        </View>
      </Pressable>
      <Pressable
        onPress={onClose}
        style={styles.closeButton}
        accessibilityRole="button"
        accessibilityLabel={t('common.close')}
      >
        <X size={16} color={colors.text} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
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
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: TOUCH_TARGET_SIZE,
  },
  info: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm,
  },
  title: {
    fontSize: fontSize.sm,
    color: colors.text,
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
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
  actionButton: {
    width: TOUCH_TARGET_SIZE,
    height: TOUCH_TARGET_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: TOUCH_TARGET_SIZE / 2,
  },
  closeButton: {
    width: TOUCH_TARGET_SIZE,
    height: TOUCH_TARGET_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: TOUCH_TARGET_SIZE / 2,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginLeft: spacing.xs,
  },
});

export default MinimizedLiveStream;
