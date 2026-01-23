/**
 * Content Actions Component
 * Action buttons for adding to list, liking, and sharing content
 */

import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Plus, ThumbsUp, Share2 } from 'lucide-react-native';
import { GlassButton } from '@bayit/shared/ui';
import { colors, spacing, fontSize } from '@bayit/shared/theme';

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
        variant="secondary"
        style={styles.actionButton}
      />
      <GlassButton
        title={likeLabel}
        icon={<ThumbsUp size={18} color={colors.text} />}
        variant="secondary"
        style={styles.actionButton}
      />
      <Pressable style={styles.shareButton}>
        <Share2 size={18} color={colors.textMuted} />
        <Text style={styles.shareText}>{shareLabel}</Text>
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
  actionButton: {
    minWidth: 140,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  shareText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
});
