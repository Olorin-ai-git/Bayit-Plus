/**
 * MovieDetailScreenMobile - Mobile-optimized movie detail screen
 *
 * Features:
 * - Vertical scroll layout
 * - Full-width hero with gradient overlay
 * - Bottom sticky "Watch Now" button
 * - Share/download actions in header
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
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { contentService } from '@bayit/shared-services';
import { getLocalizedName, getLocalizedDescription } from '@bayit/shared-utils';
import { useDirection } from '@bayit/shared-hooks';
import { spacing, colors, borderRadius } from '../theme';

// Type assertion for LinearGradient React component
const LinearGradientComponent = LinearGradient as any as React.FC<any>;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const HERO_HEIGHT = SCREEN_HEIGHT * 0.45;

type MovieDetailRouteParams = {
  MovieDetail: {
    movieId: string;
  };
};

interface MovieData {
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
  duration?: string;
  year?: number;
  rating?: string;
  genre?: string;
  cast?: string[];
  director?: string;
  trailer_url?: string;
  preview_url?: string;
  imdb_rating?: number;
  imdb_votes?: number;
}

interface CastMember {
  id: string;
  name: string;
  character: string;
  photo?: string;
}

const formatVotes = (votes?: number): string => {
  if (!votes) return '';
  if (votes >= 1000000) return `${(votes / 1000000).toFixed(1)}M`;
  if (votes >= 1000) return `${(votes / 1000).toFixed(0)}K`;
  return votes.toString();
};

export const MovieDetailScreenMobile: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { isRTL, textAlign } = useDirection();
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<MovieDetailRouteParams, 'MovieDetail'>>();
  const { movieId } = route.params;
  const currentLang = i18n.language;

  const [movie, setMovie] = useState<MovieData | null>(null);
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [castMembers, setCastMembers] = useState<CastMember[]>([]);
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [isInFavorites, setIsInFavorites] = useState(false);

  const getLocalizedText = useCallback((item: any, field: string): string => {
    if (field === 'title') return getLocalizedName(item, currentLang);
    if (field === 'description') return getLocalizedDescription(item, currentLang);
    if (currentLang === 'he') return item[field] || item.title || item.name;
    if (currentLang === 'es') return item[`${field}_es`] || item[`${field}_en`] || item[field];
    return item[`${field}_en`] || item[field];
  }, [currentLang]);

  useEffect(() => {
    loadMovieDetails();
  }, [movieId]);

  const loadMovieDetails = async () => {
    setLoading(true);
    try {
      const data = await contentService.getMovieDetails(movieId);
      setMovie(data);

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

      // Load recommendations in parallel
      try {
        const recs = await contentService.getRecommendations?.(movieId);
        if (recs && Array.isArray(recs)) {
          setRecommendations(recs);
        }
      } catch {
        // Non-blocking error - continue without recommendations
      }
    } catch (error) {
      console.error('Failed to load movie:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlay = useCallback(() => {
    if (movie) {
      ReactNativeHapticFeedback.trigger('impactMedium');
      navigation.navigate('Player', {
        id: movie.id,
        title: getLocalizedText(movie, 'title'),
        type: 'vod',
      });
    }
  }, [movie, navigation, getLocalizedText]);

  const handleShare = useCallback(async () => {
    if (movie) {
      ReactNativeHapticFeedback.trigger('impactLight');
      try {
        await Share.share({
          message: `${t('share.checkOut', 'Check out')} "${getLocalizedText(movie, 'title')}" ${t('share.onBayitPlus', 'on Bayit+')}`,
          title: getLocalizedText(movie, 'title'),
        });
      } catch (error) {
        console.error('Share failed:', error);
      }
    }
  }, [movie, t, getLocalizedText]);

  const handleToggleWatchlist = useCallback(() => {
    ReactNativeHapticFeedback.trigger('impactLight');
    setIsInWatchlist(!isInWatchlist);
    // Call API to add/remove from watchlist
  }, [isInWatchlist]);

  const handleToggleFavorites = useCallback(() => {
    ReactNativeHapticFeedback.trigger('impactLight');
    setIsInFavorites(!isInFavorites);
    // Call API to add/remove from favorites
  }, [isInFavorites]);

  const handleBack = useCallback(() => {
    ReactNativeHapticFeedback.trigger('impactLight');
    navigation.goBack();
  }, [navigation]);

  const handleRecommendationPress = useCallback((item: any) => {
    ReactNativeHapticFeedback.trigger('impactLight');
    navigation.push('MovieDetail', { movieId: item.id });
  }, [navigation]);

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (!movie) {
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
            source={{ uri: movie.backdrop || movie.thumbnail }}
            style={styles.heroImage}
            resizeMode="cover"
          />
          <LinearGradientComponent
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
            <Text style={[styles.movieTitle, { textAlign }]}>{getLocalizedText(movie, 'title')}</Text>

            {/* Metadata */}
            <View style={[styles.metadataRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              {movie.year && <Text style={styles.metadataText}>{movie.year}</Text>}
              {movie.rating && (
                <>
                  <Text style={styles.metadataDot}>•</Text>
                  <Text style={styles.metadataText}>{movie.rating}</Text>
                </>
              )}
              {movie.duration && (
                <>
                  <Text style={styles.metadataDot}>•</Text>
                  <Text style={styles.metadataText}>{movie.duration}</Text>
                </>
              )}
              {movie.genre && (
                <>
                  <Text style={styles.metadataDot}>•</Text>
                  <Text style={styles.metadataText}>{movie.genre}</Text>
                </>
              )}
            </View>

            {/* IMDb Rating */}
            {movie.imdb_rating && (
              <View style={[styles.imdbRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={styles.imdbBadge}>
                  <Text style={styles.imdbLabel}>IMDb</Text>
                  <Text style={styles.imdbRating}>{movie.imdb_rating.toFixed(1)}</Text>
                </View>
                {movie.imdb_votes && (
                  <Text style={styles.imdbVotes}>({formatVotes(movie.imdb_votes)} votes)</Text>
                )}
              </View>
            )}
          </View>
        </View>

        {/* Content Section */}
        <View style={styles.content}>
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
            <TouchableOpacity
              onPress={handleToggleFavorites}
              style={styles.quickActionButton}
            >
              <Text style={styles.quickActionIcon}>{isInFavorites ? '❤️' : '🤍'}</Text>
              <Text style={styles.quickActionLabel}>
                {t('content.favorite', 'Favorite')}
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
          {movie.description && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { textAlign }]}>
                {t('content.synopsis', 'Synopsis')}
              </Text>
              <Text style={[styles.synopsisText, { textAlign }]}>
                {getLocalizedText(movie, 'description')}
              </Text>
            </View>
          )}

          {/* Director */}
          {movie.director && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { textAlign }]}>
                {t('content.director', 'Director')}
              </Text>
              <Text style={[styles.directorName, { textAlign }]}>{movie.director}</Text>
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
        >
          <LinearGradientComponent
            colors={[colors.primary, colors.primaryDark]}
            style={styles.watchButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.watchButtonIcon}>▶</Text>
            <Text style={styles.watchButtonText}>
              {t('content.watchNow', 'Watch Now')}
            </Text>
          </LinearGradientComponent>
        </TouchableOpacity>
      </SafeAreaView>
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
  movieTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: spacing.sm,
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
  imdbRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  imdbBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5c518',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  imdbLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#000000',
  },
  imdbRating: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000000',
  },
  imdbVotes: {
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xl,
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  synopsisText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  directorName: {
    fontSize: 16,
    color: colors.text,
  },
  castContainer: {
    gap: spacing.md,
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
});

export default MovieDetailScreenMobile;
