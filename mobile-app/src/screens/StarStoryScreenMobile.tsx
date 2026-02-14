/**
 * StarStoryScreenMobile
 *
 * Star Story hub for creating personalized episodes.
 * Shows user avatar, generation history, and episode creation.
 */

import React, { useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, SafeAreaView, RefreshControl, Image, TouchableOpacity } from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens';
import { GlassCard, GlassButton } from '@olorin/glass-ui/native';
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
  const { avatars, episodes, activeGeneration, isLoading, isGenerating, refresh } = useStarStory(profileId);

  const handleCreatePress = useCallback(() => { navigation.navigate('StarStoryCreate', { profileId }); }, [navigation, profileId]);

  const handleEpisodePress = useCallback((ep: StarStoryEpisode) => {
    if (ep.status === 'complete' && ep.videoUrl) navigation.navigate('Player', { id: ep.id, title: ep.title, type: 'star-story' });
  }, [navigation]);

  const renderEpisode = useCallback(({ item }: { item: StarStoryEpisode }) => {
    const isActive = item.status === 'processing' || item.status === 'pending';
    return (
      <TouchableOpacity style={styles.epCard} onPress={() => handleEpisodePress(item)} disabled={item.status !== 'complete'} activeOpacity={0.7}
        accessibilityLabel={`${item.title}, ${t(`starStory.status.${item.status}`)}`}
        accessibilityHint={item.status === 'complete' ? t('starStory.tapToWatch') : t('starStory.generationInProgress')} accessibilityRole="button">
        <View style={[styles.epRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          {item.thumbnail ? <Image source={{ uri: item.thumbnail }} style={styles.epThumb} resizeMode="cover" />
            : <View style={styles.epPlaceholder}><NativeIcon name={isActive ? 'loader' : 'video'} size="md" color={colors.primary} /></View>}
          <View style={styles.epInfo}>
            <Text style={[styles.epTitle, { textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={2}>{item.title}</Text>
            <Text style={[styles.epTheme, { textAlign: isRTL ? 'right' : 'left' }]}>{item.theme}</Text>
            <View style={[styles.statusBadge, isActive && styles.statusActive]}>
              <Text style={[styles.statusText, isActive && styles.statusTextActive]}>{t(`starStory.status.${item.status}`)}</Text>
            </View>
          </View>
        </View>
        {isActive && item.progress && <EpisodeProgress currentStep={item.progress.currentStep} progress={item.progress.progress} estimatedTimeRemaining={item.progress.estimatedTimeRemaining} />}
      </TouchableOpacity>
    );
  }, [handleEpisodePress, isRTL, t]);

  const renderHeader = useCallback(() => (
    <View>
      <View style={[styles.hdrRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <NativeIcon name="star" size="lg" color={colors.primary} />
        <Text style={styles.hdrTitle}>{t('starStory.title')}</Text>
      </View>
      {avatars.length > 0 && (
        <GlassCard style={styles.avatarSec}>
          <Text style={[styles.avatarLabel, { textAlign: isRTL ? 'right' : 'left' }]}>{t('starStory.yourAvatars')}</Text>
          <View style={styles.avatarRow}>
            {avatars.map((av) => (
              <View key={av.id} style={styles.avItem}>
                {av.thumbnail ? <Image source={{ uri: av.thumbnail }} style={styles.avImg} />
                  : <View style={styles.avPlaceholder}><NativeIcon name="user" size="lg" color={colors.primary} /></View>}
                <Text style={styles.avName} numberOfLines={1}>{av.name}</Text>
              </View>
            ))}
          </View>
        </GlassCard>
      )}
      {activeGeneration?.progress && (
        <GlassCard style={styles.activeCard}>
          <Text style={styles.activeTitle}>{t('starStory.currentGeneration')}</Text>
          <EpisodeProgress currentStep={activeGeneration.progress.currentStep} progress={activeGeneration.progress.progress} estimatedTimeRemaining={activeGeneration.progress.estimatedTimeRemaining} />
        </GlassCard>
      )}
      <GlassButton onPress={handleCreatePress} style={styles.createBtn} disabled={isGenerating}
        accessibilityLabel={t('starStory.createNewEpisode')} accessibilityHint={t('starStory.createNewEpisodeHint')} accessibilityRole="button">
        <View style={styles.createContent}>
          <NativeIcon name="plus" size="md" color={colors.text} />
          <Text style={styles.createText}>{t('starStory.createNewEpisode')}</Text>
        </View>
      </GlassButton>
      <Text style={[styles.secTitle, { textAlign: isRTL ? 'right' : 'left' }]}>{t('starStory.episodeHistory')}</Text>
    </View>
  ), [avatars, activeGeneration, isGenerating, handleCreatePress, isRTL, t]);

  if (isLoading) return (<SafeAreaView style={styles.loadWrap}><GlassLoadingSpinner size="large" /><Text style={styles.loadText}>{t('common.loading')}</Text></SafeAreaView>);

  return (
    <SafeAreaView style={styles.container}>
      <FlatList data={episodes} renderItem={renderEpisode} keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refresh} tintColor={colors.primary} colors={[colors.primary]} />}
        ListEmptyComponent={<View style={styles.emptyWrap}><NativeIcon name="video" size="xxxl" color={colors.textMuted} /><Text style={styles.emptyText}>{t('starStory.noEpisodes')}</Text><Text style={styles.emptyHint}>{t('starStory.createFirstEpisode')}</Text></View>}
        contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadWrap: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' },
  loadText: { color: colors.text, fontSize: fontSize.md, marginTop: spacing.md },
  listContent: { padding: spacing.md, paddingBottom: spacing.xxl },
  hdrRow: { alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg },
  hdrTitle: { fontSize: fontSize.xxl, fontWeight: '700', color: colors.text },
  avatarSec: { padding: spacing.md, marginBottom: spacing.md },
  avatarLabel: { fontSize: fontSize.sm, fontWeight: '600', color: colors.textSecondary, marginBottom: spacing.sm },
  avatarRow: { flexDirection: 'row', gap: spacing.md },
  avItem: { alignItems: 'center', width: 72 },
  avImg: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.backgroundElevated },
  avPlaceholder: { width: 56, height: 56, borderRadius: 28, backgroundColor: `${colors.primary}20`, justifyContent: 'center', alignItems: 'center' },
  avName: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: spacing.xs, textAlign: 'center' },
  activeCard: { padding: spacing.md, marginBottom: spacing.md },
  activeTitle: { fontSize: fontSize.md, fontWeight: '600', color: colors.text, marginBottom: spacing.sm },
  createBtn: { marginBottom: spacing.lg, paddingVertical: spacing.md },
  createContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  createText: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
  secTitle: { fontSize: fontSize.lg, fontWeight: '600', color: colors.text, marginBottom: spacing.sm },
  epCard: { marginBottom: spacing.md, padding: spacing.md, borderRadius: borderRadius.lg, backgroundColor: 'rgba(255, 255, 255, 0.06)' },
  epRow: { alignItems: 'center', gap: spacing.md },
  epThumb: { width: 80, height: 60, borderRadius: borderRadius.md, backgroundColor: colors.backgroundElevated },
  epPlaceholder: { width: 80, height: 60, borderRadius: borderRadius.md, backgroundColor: `${colors.primary}15`, justifyContent: 'center', alignItems: 'center' },
  epInfo: { flex: 1 },
  epTitle: { fontSize: fontSize.md, fontWeight: '600', color: colors.text, marginBottom: spacing.xs },
  epTheme: { fontSize: fontSize.xs, color: colors.textSecondary, marginBottom: spacing.xs },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: borderRadius.full, backgroundColor: 'rgba(255, 255, 255, 0.1)' },
  statusActive: { backgroundColor: `${colors.primary}25` },
  statusText: { fontSize: fontSize.xs, color: colors.textMuted, fontWeight: '500' },
  statusTextActive: { color: colors.primary },
  emptyWrap: { alignItems: 'center', paddingVertical: spacing.xxl },
  emptyText: { color: colors.textMuted, fontSize: fontSize.md, marginTop: spacing.md },
  emptyHint: { color: colors.textMuted, fontSize: fontSize.sm, marginTop: spacing.xs },
});

export default StarStoryScreenMobile;
