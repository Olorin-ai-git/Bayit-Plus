/**
 * AISearchHeader - Header bar for the AI Search screen on tvOS
 *
 * Shows a back button, screen title, and CreditBalanceWidget.
 * Optimized for 10-foot UI with focus navigation support.
 */

import React, { useState } from 'react';
import { View, Text, Pressable, Animated, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing } from '@olorin/design-tokens';
import { CreditBalanceWidget } from '../CreditBalanceWidget';

interface AISearchHeaderProps {
  userId: string;
  onBack: () => void;
}

const TV_FOCUS_SCALE = 1.08;

export const AISearchHeader: React.FC<AISearchHeaderProps> = ({
  userId,
  onBack,
}) => {
  const { t } = useTranslation();
  const [backFocused, setBackFocused] = useState(false);

  return (
    <View style={styles.container}>
      <View style={styles.leftSection}>
        <Pressable
          onPress={onBack}
          onFocus={() => setBackFocused(true)}
          onBlur={() => setBackFocused(false)}
          style={[styles.backButton, backFocused && styles.backButtonFocused]}
          accessible
          accessibilityRole="button"
          accessibilityLabel={t('tvos.aiSearch.back')}
        >
          <Text style={styles.backText}>{'<'}</Text>
        </Pressable>
        <Text style={styles.title}>{t('tvos.aiSearch.title')}</Text>
      </View>
      <CreditBalanceWidget
        userId={userId}
        containerStyle={styles.creditWidget}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[8],
    paddingVertical: spacing[4],
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
  },
  backButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  backButtonFocused: {
    borderColor: '#A855F7',
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    transform: [{ scale: TV_FOCUS_SCALE }],
  },
  backText: {
    color: colors.white,
    fontSize: 28,
    fontWeight: 'bold',
  },
  title: {
    color: colors.white,
    fontSize: 42,
    fontWeight: 'bold',
  },
  creditWidget: {
    maxWidth: 280,
  },
});
