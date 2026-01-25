import { View, Text, StyleSheet } from 'react-native';
import { Circle } from 'lucide-react';
import { colors, spacing, fontSize, borderRadius } from '@olorin/design-tokens';
import { useTranslation } from 'react-i18next';
import { formatDistanceToNow } from 'date-fns';

interface LiveStatusBadgeProps {
  isLive: boolean;
  lastPolledAt: Date | null;
  isRTL: boolean;
}

export const LiveStatusBadge = ({ isLive, lastPolledAt, isRTL }: LiveStatusBadgeProps) => {
  const { t } = useTranslation();

  if (!isLive) return null;

  const timeAgo = lastPolledAt
    ? formatDistanceToNow(lastPolledAt, { addSuffix: false, includeSeconds: true })
    : t('admin.librarian.logs.justNow', 'just now');

  return (
    <View style={[styles.container, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
      <View style={styles.pulsingDot}>
        <Circle size={8} color={colors.success.DEFAULT} fill={colors.success.DEFAULT} />
      </View>
      <Text style={styles.text}>
        {t('admin.librarian.logs.live', 'Live')} • {t('admin.librarian.logs.updatedAgo', 'Updated {{time}} ago', { time: timeAgo })}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: `${colors.success.DEFAULT}20`,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: `${colors.success.DEFAULT}40`,
  },
  pulsingDot: {
    // Animation will be handled by CSS in web context
  },
  text: {
    fontSize: fontSize.xs,
    fontWeight: '500',
    color: colors.success.DEFAULT,
  },
});
