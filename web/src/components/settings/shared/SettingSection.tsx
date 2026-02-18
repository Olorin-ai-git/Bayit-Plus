/**
 * SettingSection Component
 * Glass-styled container for a group of related settings.
 */

import { View, Text, StyleSheet } from 'react-native';
import { GlassView } from '@bayit/shared/ui';
import { colors, spacing, fontSize } from '@olorin/design-tokens';

interface SettingSectionProps {
  title: string;
  isRTL?: boolean;
  children: React.ReactNode;
}

export function SettingSection({ title, isRTL = false, children }: SettingSectionProps) {
  return (
    <GlassView style={styles.section}>
      <Text style={[styles.header, isRTL && styles.textRight]}>
        {title}
      </Text>
      <View>{children}</View>
    </GlassView>
  );
}

const styles = StyleSheet.create({
  section: {
    padding: spacing.md,
    marginBottom: spacing.md,
    borderRadius: 12,
  },
  header: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.5)',
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  textRight: {
    textAlign: 'right',
  },
});
