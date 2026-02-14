/**
 * StarStoryScreenMobile
 *
 * Star Story hub for creating personalized episodes.
 * Shows user avatar, generation history, and episode creation.
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SafeAreaView,
  RefreshControl,
  Image,
  TouchableOpacity,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens';
import { GlassCard } from '@olorin/glass-ui/native';
import { GlassButton } from '@olorin/glass-ui/native';
import { GlassLoadingSpinner } from '@bayit/shared/ui';
import { NativeIcon } from '@olorin/shared-icons/native';
import { useDirection } from '@bayit/shared-hooks';
import { useStarStory, StarStoryEpisode } from '../hooks/useStarStory';
import { EpisodeProgress } from '../components/star-story/EpisodeProgress';
import logger from '@/utils/logger';

const moduleLogger = logger.scope('StarStoryScreenMobile');

type RouteParams = { profileId: string };

export const StarStoryScreenMobile: React.FC = () => {
  const { t } = useTranslation();
  const route = useRoute<RouteProp<Record<string, RouteParams>, string>>();
  const navigation = useNavigation<any>();
  const { isRTL } = useDirection();
  const { profileId } = route.params;

  const {
    avatars,
    episodes,
    activeGeneration,
    isLoading,
    isGenerating,
    error,
    generateEpisode,
    refresh,
  } = useStarStory(profileId);

  const handleCreatePress = useCallback(() => {
    navigation.navigate('StarStoryCreate', { profileId });
  }, [navigation, profileId]);

  const handleEpisodePress = useCallback((episode: StarStoryEpisode) => {
    if (episode.status === 'complete' && episode.videoUrl) {
      navigation.navigate('Player', {
        id: episode.id,
        title: episode.title,
        type: 'star-story',
      });
    }
  }, [navigation]);

  const renderEpisode = useCallback(({ item }: { item: StarStoryEpisode }) => {
    const isActive = item.status === 'processing' || item.status === 'pending';

    return (
      <TouchableOpacity
        style={styles.episodeCard}
        onPress={() => handleEpisodePress(item)}
        disabled={item.status !== 'complete'}
        activeOpacity={0.7}
        accessibilityLabel={`${item.title}, ${t(`starStory.status.${item.status}`)}`}
        accessibilityHint={
          item.status === 'complete'
            ? t('starStory.tapToWatch')
            : t('starStory.generationInProgress')
        }
        accessibilityRole="button"
      >
        <View style={[styles.episodeRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          {item.thumbnail ? (
            <Image
              source={{ uri: item.thumbnail }}
              style={styles.episodeThumbnail}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.episodePlaceholder}>
              <NativeIcon
                name={isActive ? 'loader' : 'video'}
                size="md"
                color={colors.primary}
              />
            </View>
          )}

          <View style={styles.episodeInfo}>
            <Text
              style={[styles.episodeTitle, { textAlign: isRTL ? 'right' : 'left' }]}
              numberOfLines={2}
            >
              {item.title}
            </Text>
            <Text style={[styles.episodeTheme, { textAlign: isRTL ? 'right' : 'left' }]}>
              {item.theme}
            </Text>
            <View style={[styles.statusBadge, isActive && styles.statusBadgeActive]}>
              <Text style={[styles.statusText, isActive && styles.statusTextActive]}>
                {t(`starStory.status.${item.status}`)}
              </Text>
            </View>
          </View>
        </View>

        {isActive && item.progress && (
          <EpisodeProgress
            currentStep={item.progress.currentStep}
            progress={item.progress.progress}
            estimatedTimeRemaining={item.progress.estimatedTimeRemaining}
          />
        )}
      </TouchableOpacity>
    );
  }, [handleEpisodePress, isRTL, t]);

  const renderHeader = useCallback(() => (
    <View>
      <View style={[styles.headerRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <NativeIcon name="star" size="lg" color={colors.primary} />
        <Text style={styles.headerTitle}>{t('starStory.title')}</Text>
      </View>

      {avatars.length > 0 && (
        <GlassCard style={styles.avatarSection}>
          <Text style={[styles.avatarLabel, { textAlign: isRTL ? 'right' : 'left' }]}>
            {t('starStory.yourAvatars')}
          </Text>
          <View style={styles.avatarRow}>
            {avatars.map((avatar) => (
              <View key={avatar.id} style={styles.avatarItem}>
                {avatar.thumbnail ? (
                  <Image source={{ uri: avatar.thumbnail }} style={styles.avatarImage} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <NativeIcon name="user" size="lg" color={colors.primary} />
                  </View>
                )}
                <Text style={styles.avatarName} numberOfLines={1}>{avatar.name}</Text>
              </View>
            ))}
          </View>
        </GlassCard>
      )}

      {activeGeneration && activeGeneration.progress && (
        <GlassCard style={styles.activeGenerationCard}>
          <Text style={styles.activeGenerationTitle}>
            {t('starStory.currentGeneration')}
          </Text>
          <EpisodeProgress
            currentStep={activeGeneration.progress.currentStep}
            progress={activeGeneration.progress.progress}
            estimatedTimeRemaining={activeGeneration.progress.estimatedTimeRemaining}
          />
        </GlassCard>
      )}

      <GlassButton
        onPress={handleCreatePress}
        style={styles.createButton}
        disabled={isGenerating}
        accessibilityLabel={t('starStory.createNewEpisode')}
        accessibilityHint={t('starStory.createNewEpisodeHint')}
        accessibilityRole="button"
      >
        <View style={styles.createButtonContent}>
          <NativeIcon name="plus" size="md" color={colors.text} />
          <Text style={styles.createButtonText}>
            {t('starStory.createNewEpisode')}
          </Text>
        </View>
      </GlassButton>

      <Text style={[styles.sectionTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
        {t('starStory.episodeHistory')}
      </Text>
    </View>
  ), [avatars, activeGeneration, isGenerating, handleCreatePress, isRTL, t]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <GlassLoadingSpinner size="large" />
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={episodes}
        renderItem={renderEpisode}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={refresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <NativeIcon name="video" size="xxxl" color={colors.textMuted} />
            <Text style={styles.emptyText}>{t('starStory.noEpisodes')}</Text>
            <Text style={styles.emptyHint}>{t('starStory.createFirstEpisode')}</Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: colors.text, fontSize: fontSize.md, marginTop: spacing.md },
  listContent: { padding: spacing.md, paddingBottom: spacing.xxl },
  headerRow: { alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg },
  headerTitle: { fontSize: fontSize.xxl, fontWeight: '700', color: colors.text },
  avatarSection: { padding: spacing.md, marginBottom: spacing.md },
  avatarLabel: { fontSize: fontSize.sm, fontWeight: '600', color: colors.textSecondary, marginBottom: spacing.sm },
  avatarRow: { flexDirection: 'row', gap: spacing.md },
  avatarItem: { alignItems: 'center', width: 72 },
  avatarImage: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.backgroundElevated },
  avatarPlaceholder: { width: 56, height: 56, borderRadius: 28, backgroundColor: `${colors.primary}20`, justifyContent: 'center', alignItems: 'center' },
  avatarName: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: spacing.xs, textAlign: 'center' },
  activeGenerationCard: { padding: spacing.md, marginBottom: spacing.md },
  activeGenerationTitle: { fontSize: fontSize.md, fontWeight: '600', color: colors.text, marginBottom: spacing.sm },
  createButton: { marginBottom: spacing.lg, paddingVertical: spacing.md },
  createButtonContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  createButtonText: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: '600', color: colors.text, marginBottom: spacing.sm },
  episodeCard: { marginBottom: spacing.md, padding: spacing.md, borderRadius: borderRadius.lg, backgroundColor: 'rgba(255, 255, 255, 0.06)' },
  episodeRow: { alignItems: 'center', gap: spacing.md },
  episodeThumbnail: { width: 80, height: 60, borderRadius: borderRadius.md, backgroundColor: colors.backgroundElevated },
  episodePlaceholder: { width: 80, height: 60, borderRadius: borderRadius.md, backgroundColor: `${colors.primary}15`, justifyContent: 'center', alignItems: 'center' },
  episodeInfo: { flex: 1 },
  episodeTitle: { fontSize: fontSize.md, fontWeight: '600', color: colors.text, marginBottom: spacing.xs },
  episodeTheme: { fontSize: fontSize.xs, color: colors.textSecondary, marginBottom: spacing.xs },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: borderRadius.full, backgroundColor: 'rgba(255, 255, 255, 0.1)' },
  statusBadgeActive: { backgroundColor: `${colors.primary}25` },
  statusText: { fontSize: fontSize.xs, color: colors.textMuted, fontWeight: '500' },
  statusTextActive: { color: colors.primary },
  emptyContainer: { alignItems: 'center', paddingVertical: spacing.xxl },
  emptyText: { color: colors.textMuted, fontSize: fontSize.md, marginTop: spacing.md },
  emptyHint: { color: colors.textMuted, fontSize: fontSize.sm, marginTop: spacing.xs },
});

export default StarStoryScreenMobile;
