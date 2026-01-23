/**
 * LoadingState - Highly visible loading state component
 * Used across all content pages for consistent loading experience
 */

import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassCard } from '@bayit/shared/ui';
import { colors, spacing } from '@bayit/shared/theme';

interface LoadingStateProps {
  message?: string;
  spinnerColor?: string;
  backgroundColor?: string;
  testID?: string;
}

export function LoadingState({
  message,
  spinnerColor = colors.primary,
  backgroundColor,
  testID = 'loading-state',
}: LoadingStateProps) {
  const { t } = useTranslation();

  return (
    <View
      style={styles.container}
      testID={testID}
      accessibilityLabel={message || t('common.loading')}
      accessibilityRole="progressbar"
      accessibilityState={{ busy: true }}
    >
      <GlassCard style={[styles.card, backgroundColor && { backgroundColor }]}>
        <ActivityIndicator size="large" color={spinnerColor} />
        <Text style={styles.text}>
          {message || t('common.loading')}
        </Text>
      </GlassCard>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 500,
    paddingVertical: 80,
  },
  card: {
    padding: 48,
    alignItems: 'center',
    gap: 24,
    minWidth: 300,
  },
  text: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '500',
    textAlign: 'center',
  },
});
