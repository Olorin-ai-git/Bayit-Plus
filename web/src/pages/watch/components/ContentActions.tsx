/**
 * Content Actions Component
 * Action buttons for adding to list, liking, and sharing content
 */

import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Plus, ThumbsUp, Share2 } from 'lucide-react';
import { GlassButton } from '@bayit/shared/ui';
import { colors, spacing } from '@bayit/shared/theme';

interface ContentActionsProps {
  addToListLabel: string;
  likeLabel: string;
  shareLabel: string;
}

export function ContentActions({
  addToListLabel,
  likeLabel,
  shareLabel,
}: ContentActionsProps) {
  return (
    <View style={styles.container}>
      <GlassButton
        title={addToListLabel}
        icon={<Plus size={18} color={colors.text} />}
      />
      <GlassButton
        title={likeLabel}
        icon={<ThumbsUp size={18} color={colors.text} />}
      />
      <Pressable style={styles.ghostButton}>
        <Share2 size={18} color={colors.textMuted} />
        <Text style={styles.ghostButtonText}>{shareLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  ghostButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  ghostButtonText: {
    fontSize: 14,
    color: colors.textMuted,
  },
});
