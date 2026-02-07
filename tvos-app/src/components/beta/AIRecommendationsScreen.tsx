/**
 * AI Recommendations Screen - tvOS Beta
 *
 * Full AI-powered recommendations screen with category sections,
 * horizontal content shelves, credit tracking, and TV focus navigation.
 */

import React, { useState, useCallback } from 'react';
import { View, ScrollView, Text, StyleSheet, SafeAreaView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing } from '@olorin/design-tokens';
import { logger } from '../../utils/logger';
import {
  useAIRecommendations,
  RECOMMENDATION_CATEGORIES,
} from '../../hooks/useAIRecommendations';
import type { RecommendationItem } from '../../hooks/useAIRecommendations';
import { RecommendationsHeader } from './recommendations/RecommendationsHeader';
import { CategoryTabs } from './recommendations/CategoryTabs';
import { RecommendationSection } from './recommendations/RecommendationSection';
import { InsufficientCreditsModal } from './InsufficientCreditsModal';

interface AIRecommendationsScreenProps {
  isEnrolled: boolean;
  onBack: () => void;
  userId?: string;
}

const SECTION_KEYS = ['live_tv', 'vod', 'radio', 'podcasts'] as const;

export const AIRecommendationsScreen: React.FC<
  AIRecommendationsScreenProps
> = ({ isEnrolled, onBack, userId = '' }) => {
  const { t } = useTranslation();
  const [showCreditsModal, setShowCreditsModal] = useState(false);

  const {
    recommendations,
    isLoading,
    error,
    refresh,
    activeCategory,
    setActiveCategory,
    creditsRemaining,
    isOutOfCredits,
  } = useAIRecommendations(isEnrolled);

  const handleRefresh = useCallback(async () => {
    if (isOutOfCredits) {
      setShowCreditsModal(true);
      return;
    }
    await refresh();
  }, [isOutOfCredits, refresh]);

  const handleItemPress = useCallback(
    (item: RecommendationItem) => {
      if (isOutOfCredits) {
        setShowCreditsModal(true);
        return;
      }
      logger.info('Recommendation item selected', {
        itemId: item.id,
        contentType: item.content_type,
        relevanceScore: item.relevance_score,
      });
    },
    [isOutOfCredits]
  );

  const getSectionTitle = useCallback(
    (key: string): string => {
      return t(`tvos.aiRecommendations.sections.${key}`);
    },
    [t]
  );

  const getSectionItems = useCallback(
    (key: string): RecommendationItem[] => {
      return recommendations[key] || [];
    },
    [recommendations]
  );

  // Filter sections based on active category
  const visibleSections =
    activeCategory === 'all'
      ? SECTION_KEYS
      : SECTION_KEYS.filter((key) => key === activeCategory);

  if (!isEnrolled) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.notEnrolledContainer}>
          <Text style={styles.notEnrolledTitle}>
            {t('tvos.aiRecommendations.notEnrolled')}
          </Text>
          <Text style={styles.notEnrolledText}>
            {t('tvos.aiRecommendations.enrollPrompt')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <RecommendationsHeader
        userId={userId}
        onBack={onBack}
        onRefresh={handleRefresh}
        isRefreshing={isLoading}
      />

      <CategoryTabs
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
        categories={[...RECOMMENDATION_CATEGORIES]}
      />

      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            {t('tvos.aiRecommendations.error')}
          </Text>
          <Text style={styles.errorDetail}>{error}</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {visibleSections.map((sectionKey) => (
            <RecommendationSection
              key={sectionKey}
              title={getSectionTitle(sectionKey)}
              items={getSectionItems(sectionKey)}
              onItemPress={handleItemPress}
              isLoading={isLoading}
            />
          ))}
        </ScrollView>
      )}

      <InsufficientCreditsModal
        visible={showCreditsModal}
        onClose={() => setShowCreditsModal(false)}
        requiredCredits={1}
        currentBalance={creditsRemaining}
        featureName={t('tvos.aiRecommendations.featureName')}
      />
    </SafeAreaView>
  );
};

const centeredSection = {
  flex: 1,
  justifyContent: 'center' as const,
  alignItems: 'center' as const,
  padding: spacing[10],
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  scrollView: { flex: 1 },
  scrollContent: { paddingVertical: spacing[6] },
  notEnrolledContainer: { ...centeredSection },
  notEnrolledTitle: {
    fontSize: 48, fontWeight: 'bold', color: colors.white,
    marginBottom: spacing[4], textAlign: 'center',
  },
  notEnrolledText: {
    fontSize: 28, color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center', lineHeight: 38,
  },
  errorContainer: { ...centeredSection },
  errorText: {
    fontSize: 36, fontWeight: '600', color: '#F87171',
    marginBottom: spacing[4], textAlign: 'center',
  },
  errorDetail: { fontSize: 24, color: 'rgba(255, 255, 255, 0.5)', textAlign: 'center' },
});
