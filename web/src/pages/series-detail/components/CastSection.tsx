/**
 * Cast Section Component
 * Displays series cast information
 */

import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, fontSize } from '@bayit/shared/theme';

interface CastSectionProps {
  cast?: string[];
  textAlign: 'left' | 'right' | 'center';
}

export function CastSection({ cast, textAlign }: CastSectionProps) {
  const { t } = useTranslation();

  if (!cast || cast.length === 0) {
    return null;
  }

  return (
    <View style={styles.castSection}>
      <Text style={styles.sectionTitle}>{t('content.cast')}</Text>
      <Text style={[styles.castText, { textAlign }]}>{cast.join(', ')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  castSection: {
    paddingHorizontal: 48,
    paddingVertical: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  castText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    lineHeight: 24,
  },
});
