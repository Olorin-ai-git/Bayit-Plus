/**
 * Flow Header Component
 * Displays flow information and navigation controls
 */

import { View, Text, Pressable, StyleSheet } from 'react-native';
import { ListMusic, SkipBack, SkipForward, X } from 'lucide-react';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';

interface FlowHeaderProps {
  flowName: string;
  playlistIndex: number;
  playlistLength: number;
  hasPrevItem: boolean;
  hasNextItem: boolean;
  isRTL: boolean;
  onTogglePlaylist: () => void;
  onPlayPrev: () => void;
  onPlayNext: () => void;
  onExit: () => void;
}

export function FlowHeader({
  flowName,
  playlistIndex,
  playlistLength,
  hasPrevItem,
  hasNextItem,
  isRTL,
  onTogglePlaylist,
  onPlayPrev,
  onPlayNext,
  onExit,
}: FlowHeaderProps) {
  return (
    <View style={[styles.container, isRTL && styles.containerRTL]}>
      <View style={[styles.left, isRTL && styles.leftRTL]}>
        <Pressable onPress={onTogglePlaylist} style={styles.iconButton}>
          <ListMusic size={20} color={colors.primary} />
        </Pressable>
        <View>
          <Text style={styles.name}>{flowName}</Text>
          <Text style={styles.progress}>
            {playlistIndex + 1} / {playlistLength}
          </Text>
        </View>
      </View>
      <View style={[styles.controls, isRTL && styles.controlsRTL]}>
        <Pressable
          onPress={onPlayPrev}
          style={[styles.navButton, !hasPrevItem && styles.navButtonDisabled]}
          disabled={!hasPrevItem}
        >
          <SkipBack size={20} color={hasPrevItem ? colors.text : colors.textMuted} />
        </Pressable>
        <Pressable
          onPress={onPlayNext}
          style={[styles.navButton, !hasNextItem && styles.navButtonDisabled]}
          disabled={!hasNextItem}
        >
          <SkipForward size={20} color={hasNextItem ? colors.text : colors.textMuted} />
        </Pressable>
        <Pressable onPress={onExit} style={styles.exitButton}>
          <X size={18} color={colors.textMuted} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
    maxWidth: 1400,
    marginHorizontal: 'auto',
    width: '100%',
    backgroundColor: colors.glass,
    borderRadius: borderRadius.md,
  },
  containerRTL: {
    flexDirection: 'row-reverse',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  leftRTL: {
    flexDirection: 'row-reverse',
  },
  iconButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: borderRadius.md,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  progress: {
    fontSize: 12,
    color: colors.textMuted,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  controlsRTL: {
    flexDirection: 'row-reverse',
  },
  navButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.glass,
    borderRadius: borderRadius.md,
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  exitButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
});
