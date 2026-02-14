/**
 * TriviaScreenMobile - Mobile trivia hub screen
 *
 * Features:
 * - Active quizzes, category selection, difficulty picker
 * - Leaderboard preview, recent scores
 * - Pull-to-refresh, RTL support, accessibility
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  Pressable,
  SafeAreaView,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@bayit/shared-hooks';
import { GlassLoadingSpinner } from '@bayit/shared/ui';
import { NativeIcon } from '@olorin/shared-icons/native';
import { useTriviaStore } from '@bayit/shared/stores/triviaStore';
import { triviaApi } from '@bayit/shared-services/api';
import { TRIVIA_CATEGORIES } from '@bayit/shared/types/trivia';
import { Colors } from '../theme/colors';
import { styles } from './TriviaScreenMobile.styles';
import logger from '@/utils/logger';

const triviaLogger = logger.scope('TriviaScreenMobile');

interface RouteParams {
  contentId?: string;
}

interface LeaderboardEntry {
  rank: number;
  user_name: string;
  score: number;
}

const DIFFICULTIES = [
  { id: 'easy', labelKey: 'trivia.difficulty.easy' },
  { id: 'medium', labelKey: 'trivia.difficulty.medium' },
  { id: 'hard', labelKey: 'trivia.difficulty.hard' },
] as const;

export const TriviaScreenMobile: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { t, i18n } = useTranslation();
  const { isRTL, textAlign } = useDirection();
  const { contentId } = (route.params as RouteParams) || {};

  const { isLoading: storeLoading, loadTrivia, facts } = useTriviaStore();
  const [refreshing, setRefreshing] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('medium');

  useEffect(() => {
    if (contentId) {
      loadTrivia(contentId, i18n.language);
    }
  }, [contentId, i18n.language, loadTrivia]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (contentId) { await loadTrivia(contentId, i18n.language); }
    setRefreshing(false);
  }, [contentId, i18n.language, loadTrivia]);

  const handleCategoryPress = useCallback((categoryId: string) => {
    navigation.navigate('TriviaCategory', { categoryId, difficulty: selectedDifficulty });
    triviaLogger.info('Category selected', { categoryId, difficulty: selectedDifficulty });
  }, [navigation, selectedDifficulty]);

  const handleStartQuiz = useCallback(() => {
    navigation.navigate('TriviaQuiz', { contentId, difficulty: selectedDifficulty });
    triviaLogger.info('Quiz started', { contentId, difficulty: selectedDifficulty });
  }, [navigation, contentId, selectedDifficulty]);

  if (storeLoading && facts.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <GlassLoadingSpinner size="large" />
          <Text style={styles.loadingText}>{t('trivia.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh}
            tintColor={Colors.Primary.default} colors={[Colors.Primary.default]} />
        }
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.screenTitle, { textAlign }]} accessibilityRole="header"
          accessibilityLabel={t('trivia.title')}>
          {t('trivia.title')}
        </Text>

        {contentId && (
          <Pressable style={styles.startQuizCard} onPress={handleStartQuiz}
            accessibilityRole="button" accessibilityLabel={t('trivia.startQuiz')}
            accessibilityHint={t('trivia.startQuizHint')}>
            <NativeIcon name="play" size="lg" color={Colors.Text.primary} />
            <View style={styles.startQuizTextContainer}>
              <Text style={[styles.startQuizTitle, { textAlign }]}>{t('trivia.startQuiz')}</Text>
              <Text style={[styles.startQuizSubtitle, { textAlign }]}>
                {t('trivia.factsAvailable', { count: facts.length })}
              </Text>
            </View>
          </Pressable>
        )}

        <Text style={[styles.sectionTitle, { textAlign }]}>{t('trivia.difficulty.label')}</Text>
        <View style={[styles.difficultyRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          {DIFFICULTIES.map((diff) => (
            <Pressable key={diff.id}
              style={[styles.difficultyChip, selectedDifficulty === diff.id && styles.difficultyChipActive]}
              onPress={() => setSelectedDifficulty(diff.id)}
              accessibilityRole="button" accessibilityLabel={t(diff.labelKey)}
              accessibilityHint={t('trivia.selectDifficultyHint')}
              accessibilityState={{ selected: selectedDifficulty === diff.id }}>
              <Text style={[styles.difficultyText, selectedDifficulty === diff.id && styles.difficultyTextActive]}>
                {t(diff.labelKey)}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={[styles.sectionTitle, { textAlign }]}>{t('trivia.categories')}</Text>
        <View style={styles.categoriesGrid}>
          {TRIVIA_CATEGORIES.map((cat) => (
            <Pressable key={cat.id} style={styles.categoryCard}
              onPress={() => handleCategoryPress(cat.id)}
              accessibilityRole="button"
              accessibilityLabel={i18n.language === 'he' ? cat.label_he : cat.label_en}
              accessibilityHint={t('trivia.selectCategoryHint')}>
              <NativeIcon name={cat.icon} size="lg" color={Colors.Primary.p400} />
              <Text style={styles.categoryLabel}>
                {i18n.language === 'he' ? cat.label_he : cat.label_en}
              </Text>
            </Pressable>
          ))}
        </View>

        {leaderboard.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { textAlign }]}>{t('trivia.leaderboard')}</Text>
            {leaderboard.slice(0, 5).map((entry) => (
              <View key={`lb-${entry.rank}`}
                style={[styles.leaderboardRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                accessibilityLabel={t('trivia.leaderboardEntry', {
                  rank: entry.rank, name: entry.user_name, score: entry.score,
                })}>
                <Text style={styles.leaderboardRank}>{entry.rank}</Text>
                <Text style={[styles.leaderboardName, { textAlign }]}>{entry.user_name}</Text>
                <Text style={styles.leaderboardScore}>{entry.score}</Text>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default TriviaScreenMobile;
