/**
 * RecommendationsHeader - tvOS AI Recommendations header bar
 *
 * Displays back button, title, credit balance, and refresh control.
 * Optimized for 10-foot UI with focus navigation.
 */

import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassView } from '@bayit/shared';
import { colors, spacing } from '@olorin/design-tokens';
import { CreditBalanceWidget } from '../CreditBalanceWidget';

interface RecommendationsHeaderProps {
  userId: string;
  onBack: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export const RecommendationsHeader: React.FC<RecommendationsHeaderProps> = ({
  userId,
  onBack,
  onRefresh,
  isRefreshing,
}) => {
  const { t } = useTranslation();
  const [backFocused, setBackFocused] = useState(false);
  const [refreshFocused, setRefreshFocused] = useState(false);

  return (
    <GlassView style={styles.container}>
      <View style={styles.leftSection}>
        <Pressable
          onPress={onBack}
          onFocus={() => setBackFocused(true)}
          onBlur={() => setBackFocused(false)}
          style={[styles.backButton, backFocused && styles.buttonFocused]}
          accessible
          accessibilityRole="button"
          accessibilityLabel={t('tvos.aiRecommendations.back')}
        >
          <Text style={styles.backButtonText}>
            {t('tvos.aiRecommendations.back')}
          </Text>
        </Pressable>

        <Text style={styles.title}>
          {t('tvos.aiRecommendations.title')}
        </Text>
      </View>

      <View style={styles.rightSection}>
        <CreditBalanceWidget userId={userId} containerStyle={styles.creditWidget} />

        <Pressable
          onPress={onRefresh}
          onFocus={() => setRefreshFocused(true)}
          onBlur={() => setRefreshFocused(false)}
          disabled={isRefreshing}
          style={[styles.refreshButton, refreshFocused && styles.buttonFocused]}
          accessible
          accessibilityRole="button"
          accessibilityLabel={t('tvos.aiRecommendations.refresh')}
        >
          {isRefreshing ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Text style={styles.refreshButtonText}>
              {t('tvos.aiRecommendations.refresh')}
            </Text>
          )}
        </Pressable>
      </View>
    </GlassView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[8],
    paddingVertical: spacing[6],
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[6],
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[6],
  },
  backButton: {
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[5],
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  backButtonText: {
    color: colors.white,
    fontSize: 26,
    fontWeight: '500',
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: colors.white,
  },
  creditWidget: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  refreshButton: {
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[6],
    borderRadius: 12,
    backgroundColor: '#7C3AED',
    borderWidth: 2,
    borderColor: 'transparent',
    minWidth: 120,
    alignItems: 'center',
  },
  refreshButtonText: {
    color: colors.white,
    fontSize: 26,
    fontWeight: '600',
  },
  buttonFocused: {
    borderColor: '#A855F7',
    transform: [{ scale: 1.05 }],
    backgroundColor: 'rgba(168, 85, 247, 0.3)',
  },
});
