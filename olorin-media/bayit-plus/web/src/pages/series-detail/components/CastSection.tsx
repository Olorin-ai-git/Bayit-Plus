/**
 * Cast Section Component
 * Displays series cast information
 */

import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '@bayit/shared/theme';

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
    <View style={styles.container}>
      <Text style={styles.title}>{t('content.cast')}</Text>
      <Text style={[styles.castText, { textAlign }]}>{cast.join(', ')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 48,
    paddingVertical: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 16,
  },
  castText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 24,
  },
});
