/**
 * SeriesDetailScreenMobile - Mobile-optimized series detail screen
 *
 * Features:
 * - Collapsible season selector (modal/bottom sheet)
 * - Horizontal scrollable episode list
 * - Optimized episode thumbnails
 * - RTL support
 * - Haptic feedback
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  SafeAreaView,
  Share,
  Dimensions,
  StatusBar,
  Modal,
  FlatList,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { contentService } from '@bayit/shared-services';
import { getLocalizedName, getLocalizedDescription } from '@bayit/shared-utils';
import { useDirection } from '@bayit/shared-hooks';
import { spacing, colors, borderRadius } from '../theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const HERO_HEIGHT = SCREEN_HEIGHT * 0.4;
const EPISODE_CARD_WIDTH = 280;

type SeriesDetailRouteParams = {
  SeriesDetail: {
    seriesId: string;
  };
};

interface Season {
  season_number: number;
  episode_count: number;
}

interface Episode {
  id: string;
  title: string;
  title_en?: string;
  title_es?: string;
  description?: string;
  description_en?: string;
  description_es?: string;
  thumbnail?: string;
  episode_number: number;
  duration?: string;
  preview_url?: string;
}

interface SeriesData {
  id: string;
  title: string;
  title_en?: string;
  title_es?: string;
  description?: string;
  description_en?: string;
  description_es?: string;
  thumbnail?: string;
  backdrop?: string;
  category?: string;
  year?: number;
  rating?: string;
  genre?: string;
  cast?: string[];
  total_seasons: number;
  total_episodes: number;
  trailer_url?: string;
  preview_url?: string;
  seasons: Season[];
}

interface CastMember {
  id: string;
  name: string;
  character: string;
  photo?: string;
}

interface EpisodeCardProps {
  episode: Episode;
  onPress: () => void;
  isSelected: boolean;
  getLocalizedText: (item: any, field: string) => string;
}

const EpisodeCard: React.FC<EpisodeCardProps> = ({
  episode,
  onPress,
  isSelected,
  getLocalizedText,
}) => {
  const { textAlign } = useDirection();

  return (
    <TouchableOpacity
      onPress={() => {
        ReactNativeHapticFeedback.trigger('impactLight');
        onPress();
      }}
      style={[styles.episodeCard, isSelected && styles.episodeCardSelected]}
      activeOpacity={0.8}
    >
      <Image
        source={{ uri: episode.thumbnail }}
        style={styles.episodeImage}
        resizeMode="cover"
      />
      <View style={styles.episodeOverlay}>
        <View style={styles.episodeNumberBadge}>
          <Text style={styles.episodeNumber}>{episode.episode_number}</Text>
        </View>
        <TouchableOpacity style={styles.episodePlayButton} onPress={onPress}>
          <Text style={styles.episodePlayIcon}>▶</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.episodeInfo}>
        <Text style={[styles.episodeTitle, { textAlign }]} numberOfLines={1}>
          {getLocalizedText(episode, 'title')}
        </Text>
        {episode.duration && (
          <Text style={[styles.episodeDuration, { textAlign }]}>{episode.duration}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

export const SeriesDetailScreenMobile: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { isRTL, textAlign } = useDirection();
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<SeriesDetailRouteParams, 'SeriesDetail'>>();
  const { seriesId } = route.params;
  const currentLang = i18n.language;

  const [series, setSeries] = useState<SeriesData | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null);
  const [loading, setLoading] = useState(true);
  const [episodesLoading, setEpisodesLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [castMembers, setCastMembers] = useState<CastMember[]>([]);
  const [showSeasonPicker, setShowSeasonPicker] = useState(false);
  const [isInWatchlist, setIsInWatchlist] = useState(false);

  const getLocalizedText = useCallback((item: any, field: string): string => {
    if (field === 'title') return getLocalizedName(item, currentLang);
    if (field === 'description') return getLocalizedDescription(item, currentLang);
    if (currentLang === 'he') return item[field] || item.title || item.name;
    if (currentLang === 'es') return item[`${field}_es`] || item[`${field}_en`] || item[field];
    return item[`${field}_en`] || item[field];
  }, [currentLang]);

  useEffect(() => {
    loadSeriesDetails();
  }, [seriesId]);

  useEffect(() => {
    if (selectedSeason) {
      loadSeasonEpisodes();
    }
  }, [seriesId, selectedSeason]);

  const loadSeriesDetails = async () => {
    setLoading(true);
    try {
      const data = await contentService.getSeriesDetails(seriesId);
      setSeries(data);
      if (data.seasons && data.seasons.length > 0) {
        setSelectedSeason(data.seasons[0].season_number);
      }

      // Format cast data if available
      if (data.cast && Array.isArray(data.cast)) {
        const formattedCast = data.cast.map((name: string, index: number) => ({
          id: `cast-${index}`,
          name,
          character: '',
          photo: undefined,
        }));
        setCastMembers(formattedCast);
      }

      // Load recommendations
      try {
        const recs = await contentService.getRecommendations?.(seriesId);
        if (recs && Array.isArray(recs)) {
          setRecommendations(recs);
        }
      } catch {
        // Non-blocking error
      }
    } catch (error) {
      console.error('Failed to load series:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSeasonEpisodes = async () => {
    setEpisodesLoading(true);
    try {
      const data = await contentService.getSeasonEpisodes(seriesId, selectedSeason);
      setEpisodes(data.episodes || []);
      if (data.episodes && data.episodes.length > 0 && !selectedEpisode) {
        setSelectedEpisode(data.episodes[0]);
      }
    } catch (error) {
      console.error('Failed to load episodes:', error);
    } finally {
      setEpisodesLoading(false);
    }
  };

  const handlePlay = useCallback(() => {
    if (selectedEpisode) {
      ReactNativeHapticFeedback.trigger('impactMedium');
      navigation.navigate('Player', {
        id: selectedEpisode.id,
        title: getLocalizedText(selectedEpisode, 'title'),
        type: 'vod',
      });
    }
  }, [selectedEpisode, navigation, getLocalizedText]);

  const handleEpisodePlay = useCallback((episode: Episode) => {
    ReactNativeHapticFeedback.trigger('impactMedium');
    navigation.navigate('Player', {
      id: episode.id,
      title: getLocalizedText(episode, 'title'),
      type: 'vod',
    });
  }, [navigation, getLocalizedText]);

  const handleEpisodeSelect = useCallback((episode: Episode) => {
    setSelectedEpisode(episode);
  }, []);

  const handleSeasonChange = useCallback((seasonNumber: number) => {
    ReactNativeHapticFeedback.trigger('selection');
    setSelectedSeason(seasonNumber);
    setSelectedEpisode(null);
    setShowSeasonPicker(false);
  }, []);

  const handleShare = useCallback(async () => {
    if (series) {
      ReactNativeHapticFeedback.trigger('impactLight');
      try {
        await Share.share({
          message: `${t('share.checkOut', 'Check out')} "${getLocalizedText(series, 'title')}" ${t('share.onBayitPlus', 'on Bayit+')}`,
          title: getLocalizedText(series, 'title'),
        });
      } catch (error) {
        console.error('Share failed:', error);
      }
    }
  }, [series, t, getLocalizedText]);

  const handleBack = useCallback(() => {
    ReactNativeHapticFeedback.trigger('impactLight');
    navigation.goBack();
  }, [navigation]);

  const handleRecommendationPress = useCallback((item: any) => {
    ReactNativeHapticFeedback.trigger('impactLight');
    navigation.push('SeriesDetail', { seriesId: item.id });
  }, [navigation]);

  const handleToggleWatchlist = useCallback(() => {
    ReactNativeHapticFeedback.trigger('impactLight');
    setIsInWatchlist(!isInWatchlist);
  }, [isInWatchlist]);

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (!series) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Text style={styles.errorText}>{t('content.notFound', 'Content not found')}</Text>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>{t('common.goBack', 'Go Back')}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <View style={styles.heroContainer}>
          <Image
            source={{ uri: selectedEpisode?.thumbnail || series.backdrop || series.thumbnail }}
            style={styles.heroImage}
            resizeMode="cover"
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.7)', colors.background]}
            locations={[0.3, 0.7, 1]}
            style={styles.heroGradient}
          />

          {/* Header Actions */}
          <SafeAreaView style={styles.headerActions}>
            <TouchableOpacity onPress={handleBack} style={styles.headerButton}>
              <Text style={styles.headerButtonIcon}>←</Text>
            </TouchableOpacity>
            <View style={styles.headerRightActions}>
              <TouchableOpacity onPress={handleShare} style={styles.headerButton}>
                <Text style={styles.headerButtonIcon}>⤴</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>

          {/* Hero Content */}
          <View style={styles.heroContent}>
            <Text style={[styles.seriesTitle, { textAlign }]}>{getLocalizedText(series, 'title')}</Text>

            {/* Metadata */}
            <View style={[styles.metadataRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              {series.year && <Text style={styles.metadataText}>{series.year}</Text>}
              {series.rating && (
                <>
                  <Text style={styles.metadataDot}>•</Text>
                  <Text style={styles.metadataText}>{series.rating}</Text>
                </>
              )}
              {series.total_seasons > 0 && (
                <>
                  <Text style={styles.metadataDot}>•</Text>
                  <Text style={styles.metadataText}>
                    {series.total_seasons} {t('content.seasons', 'Seasons')}
                  </Text>
                </>
              )}
            </View>
          </View>
        </View>

        {/* Content Section */}
        <View style={styles.content}>
          {/* Season Selector */}
          <TouchableOpacity
            style={styles.seasonSelector}
            onPress={() => {
              ReactNativeHapticFeedback.trigger('impactLight');
              setShowSeasonPicker(true);
            }}
          >
            <Text style={styles.seasonSelectorLabel}>
              {t('content.season', 'Season')} {selectedSeason}
            </Text>
            <Text style={styles.seasonSelectorArrow}>▼</Text>
          </TouchableOpacity>

          {/* Episodes */}
          <View style={styles.episodesSection}>
            <Text style={[styles.sectionTitle, { textAlign }]}>
              {t('content.episodes', 'Episodes')}
            </Text>
            {episodesLoading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <FlatList
                data={episodes}
                keyExtractor={(item) => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={[
                  styles.episodesList,
                  { flexDirection: isRTL ? 'row-reverse' : 'row' },
                ]}
                renderItem={({ item }) => (
                  <EpisodeCard
                    episode={item}
                    onPress={() => handleEpisodePlay(item)}
                    isSelected={selectedEpisode?.id === item.id}
                    getLocalizedText={getLocalizedText}
                  />
                )}
              />
            )}
          </View>

          {/* Quick Actions */}
          <View style={[styles.quickActions, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <TouchableOpacity
              onPress={handleToggleWatchlist}
              style={styles.quickActionButton}
            >
              <Text style={styles.quickActionIcon}>{isInWatchlist ? '✓' : '+'}</Text>
              <Text style={styles.quickActionLabel}>
                {t('content.myList', 'My List')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleShare} style={styles.quickActionButton}>
              <Text style={styles.quickActionIcon}>⤴</Text>
              <Text style={styles.quickActionLabel}>
                {t('content.share', 'Share')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Synopsis */}
          {series.description && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { textAlign }]}>
                {t('content.synopsis', 'Synopsis')}
              </Text>
              <Text style={[styles.synopsisText, { textAlign }]}>
                {getLocalizedText(series, 'description')}
              </Text>
            </View>
          )}

          {/* Cast */}
          {castMembers.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { textAlign }]}>
                {t('content.cast', 'Cast')}
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={[
                  styles.castContainer,
                  { flexDirection: isRTL ? 'row-reverse' : 'row' },
                ]}
              >
                {castMembers.map((member) => (
                  <View key={member.id} style={styles.castCard}>
                    <View style={styles.castAvatar}>
                      <Text style={styles.castInitial}>
                        {member.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.castName} numberOfLines={1}>
                      {member.name}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Recommendations */}
          {recommendations.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { textAlign }]}>
                {t('content.moreLikeThis', 'More Like This')}
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={[
                  styles.recommendationsContainer,
                  { flexDirection: isRTL ? 'row-reverse' : 'row' },
                ]}
              >
                {recommendations.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.recommendationCard}
                    onPress={() => handleRecommendationPress(item)}
                    activeOpacity={0.7}
                  >
                    <Image
                      source={{ uri: item.thumbnail }}
                      style={styles.recommendationImage}
                      resizeMode="cover"
                    />
                    <Text style={styles.recommendationTitle} numberOfLines={2}>
                      {getLocalizedText(item, 'title')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Bottom spacing for fixed button */}
          <View style={styles.bottomSpacer} />
        </View>
      </ScrollView>

      {/* Fixed Watch Button */}
      <SafeAreaView style={styles.fixedButtonContainer}>
        <TouchableOpacity
          onPress={handlePlay}
          style={styles.watchButton}
          activeOpacity={0.8}
          disabled={!selectedEpisode}
        >
          <LinearGradient
            colors={selectedEpisode ? [colors.primary, colors.primaryDark] : [colors.textSecondary, colors.textSecondary]}
            style={styles.watchButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.watchButtonIcon}>▶</Text>
            <Text style={styles.watchButtonText}>
              {selectedEpisode
                ? `${t('content.play', 'Play')} S${selectedSeason}:E${selectedEpisode.episode_number}`
                : t('content.selectEpisode', 'Select Episode')}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </SafeAreaView>

      {/* Season Picker Modal */}
      <Modal
        visible={showSeasonPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSeasonPicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowSeasonPicker(false)}
        >
          <View style={styles.seasonPickerContainer}>
            <View style={styles.seasonPickerHeader}>
              <Text style={styles.seasonPickerTitle}>
                {t('content.selectSeason', 'Select Season')}
              </Text>
              <TouchableOpacity onPress={() => setShowSeasonPicker(false)}>
                <Text style={styles.seasonPickerClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.seasonList}>
              {series.seasons.map((season) => (
                <TouchableOpacity
                  key={season.season_number}
                  style={[
                    styles.seasonItem,
                    selectedSeason === season.season_number && styles.seasonItemSelected,
                  ]}
                  onPress={() => handleSeasonChange(season.season_number)}
                >
                  <Text
                    style={[
                      styles.seasonItemText,
                      selectedSeason === season.season_number && styles.seasonItemTextSelected,
                    ]}
                  >
                    {t('content.season', 'Season')} {season.season_number}
                  </Text>
                  <Text style={styles.seasonItemEpisodes}>
                    {season.episode_count} {t('content.episodes', 'episodes')}
                  </Text>
                  {selectedSeason === season.season_number && (
                    <Text style={styles.seasonItemCheck}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  errorText: {
    fontSize: 18,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  backButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
  },
  backButtonText: {
    color: colors.text,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  heroContainer: {
    height: HERO_HEIGHT,
    position: 'relative',
  },
  heroImage: {
    width: SCREEN_WIDTH,
    height: HERO_HEIGHT,
    position: 'absolute',
  },
  heroGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: HERO_HEIGHT,
  },
  headerActions: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerButtonIcon: {
    fontSize: 20,
    color: colors.text,
  },
  headerRightActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  heroContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  seriesTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  metadataText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  metadataDot: {
    fontSize: 14,
    color: colors.textSecondary,
    marginHorizontal: spacing.xs,
  },
  content: {
    paddingTop: spacing.md,
  },
  seasonSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundLight,
    marginHorizontal: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
  },
  seasonSelectorLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginRight: spacing.sm,
  },
  seasonSelectorArrow: {
    fontSize: 12,
    color: colors.primary,
  },
  episodesSection: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  episodesList: {
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  episodeCard: {
    width: EPISODE_CARD_WIDTH,
    marginRight: spacing.md,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    backgroundColor: colors.backgroundLight,
  },
  episodeCardSelected: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  episodeImage: {
    width: EPISODE_CARD_WIDTH,
    height: 157,
    backgroundColor: colors.backgroundElevated,
  },
  episodeOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 157,
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: spacing.sm,
  },
  episodeNumberBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 4,
  },
  episodeNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  episodePlayButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -20,
    marginLeft: -20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(126, 34, 206, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  episodePlayIcon: {
    fontSize: 16,
    color: colors.text,
    marginLeft: 2,
  },
  episodeInfo: {
    padding: spacing.sm,
  },
  episodeTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 4,
  },
  episodeDuration: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xl,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  quickActionButton: {
    alignItems: 'center',
    minWidth: 60,
  },
  quickActionIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  quickActionLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  section: {
    marginTop: spacing.lg,
  },
  synopsisText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 22,
    paddingHorizontal: spacing.md,
  },
  castContainer: {
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  castCard: {
    alignItems: 'center',
    width: 70,
  },
  castAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.backgroundLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  castInitial: {
    fontSize: 22,
    fontWeight: '600',
    color: colors.primary,
  },
  castName: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  recommendationsContainer: {
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  recommendationCard: {
    width: 120,
  },
  recommendationImage: {
    width: 120,
    height: 68,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
    backgroundColor: colors.backgroundLight,
  },
  recommendationTitle: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  bottomSpacer: {
    height: 100,
  },
  fixedButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  watchButton: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  watchButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  watchButtonIcon: {
    fontSize: 18,
    color: colors.text,
  },
  watchButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  seasonPickerContainer: {
    backgroundColor: colors.backgroundLight,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: SCREEN_HEIGHT * 0.5,
  },
  seasonPickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  seasonPickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  seasonPickerClose: {
    fontSize: 20,
    color: colors.textSecondary,
    padding: spacing.sm,
  },
  seasonList: {
    padding: spacing.md,
  },
  seasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.backgroundElevated,
  },
  seasonItemSelected: {
    backgroundColor: 'rgba(126, 34, 206, 0.2)',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  seasonItemText: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
  seasonItemTextSelected: {
    color: colors.primary,
  },
  seasonItemEpisodes: {
    fontSize: 14,
    color: colors.textSecondary,
    marginRight: spacing.md,
  },
  seasonItemCheck: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '600',
  },
});

export default SeriesDetailScreenMobile;
