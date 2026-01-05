import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { GlassView } from '../components/ui';
import { podcastService } from '../services/api';
import { colors, spacing, borderRadius } from '../theme';
import { isTV } from '../utils/platform';
import { useDirection } from '../hooks/useDirection';

interface PodcastShow {
  id: string;
  title: string;
  author?: string;
  cover?: string;
  episodeCount?: number;
  latestEpisode?: string;
  category?: string;
}

interface Category {
  id: string;
  name: string;
}

const PodcastCard: React.FC<{
  show: PodcastShow;
  onPress: () => void;
  index: number;
}> = ({ show, onPress, index }) => {
  const [isFocused, setIsFocused] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handleFocus = () => {
    setIsFocused(true);
    Animated.spring(scaleAnim, {
      toValue: 1.08,
      friction: 5,
      useNativeDriver: true,
    }).start();
  };

  const handleBlur = () => {
    setIsFocused(false);
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 5,
      useNativeDriver: true,
    }).start();
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      onFocus={handleFocus}
      onBlur={handleBlur}
      activeOpacity={1}
      style={styles.cardTouchable}
      // @ts-ignore
      hasTVPreferredFocus={index === 0}
    >
      <Animated.View
        style={[
          styles.card,
          { transform: [{ scale: scaleAnim }] },
          isFocused && styles.cardFocused,
        ]}
      >
        {/* Cover Image */}
        {show.cover ? (
          <Image
            source={{ uri: show.cover }}
            style={styles.cardImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.cardImagePlaceholder}>
            <Text style={styles.placeholderIcon}>🎙️</Text>
          </View>
        )}

        {/* Content */}
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {show.title}
          </Text>
          {show.author && (
            <Text style={styles.cardAuthor} numberOfLines={1}>
              {show.author}
            </Text>
          )}
          <View style={styles.cardMeta}>
            {show.episodeCount !== undefined && (
              <View style={styles.metaItem}>
                <Text style={styles.metaIcon}>🎧</Text>
                <Text style={styles.metaText}>{show.episodeCount} {t('content.episodes')}</Text>
              </View>
            )}
            {show.latestEpisode && (
              <View style={styles.metaItem}>
                <Text style={styles.metaIcon}>🕐</Text>
                <Text style={styles.metaText}>{show.latestEpisode}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Play Overlay */}
        {isFocused && (
          <View style={styles.playOverlay}>
            <View style={styles.playButton}>
              <Text style={styles.playIcon}>▶</Text>
            </View>
          </View>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
};

export const PodcastsScreen: React.FC = () => {
  const { t } = useTranslation();
  const { isRTL, textAlign } = useDirection();
  const navigation = useNavigation<any>();
  const [isLoading, setIsLoading] = useState(true);
  const [shows, setShows] = useState<PodcastShow[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    loadShows();
  }, [selectedCategory]);

  const loadShows = async () => {
    try {
      setIsLoading(true);
      const params = selectedCategory !== 'all' ? { category: selectedCategory } : undefined;
      const data = await podcastService.getShows(params).catch(() => ({ shows: [], categories: [] }));

      if (data.shows?.length) {
        setShows(data.shows);
      } else {
        // Demo data
        setShows([
          { id: '1', title: 'עושים היסטוריה', author: 'רן לוי', episodeCount: 350, cover: 'https://picsum.photos/300/300?random=40' },
          { id: '2', title: 'הפודקאסט של גלי ומיקי', author: 'גלי ומיקי', episodeCount: 120, cover: 'https://picsum.photos/300/300?random=41' },
          { id: '3', title: 'שני בכל', author: 'שני שניצר', episodeCount: 85, cover: 'https://picsum.photos/300/300?random=42' },
          { id: '4', title: 'עוד יום טוב', author: 'דניאל ברקין', episodeCount: 200, cover: 'https://picsum.photos/300/300?random=43' },
          { id: '5', title: 'איך זה עובד', author: 'רון קופמן', episodeCount: 95, cover: 'https://picsum.photos/300/300?random=44' },
          { id: '6', title: 'הכל אישי', author: 'קרן ברגר', episodeCount: 75, cover: 'https://picsum.photos/300/300?random=45' },
          { id: '7', title: 'חדשות השבוע', author: 'כאן חדשות', episodeCount: 500, cover: 'https://picsum.photos/300/300?random=46' },
          { id: '8', title: 'ספורט בלילה', author: 'ערוץ הספורט', episodeCount: 150, cover: 'https://picsum.photos/300/300?random=47' },
          { id: '9', title: 'טכנולוגיה היום', author: 'Geektime', episodeCount: 280, cover: 'https://picsum.photos/300/300?random=48' },
          { id: '10', title: 'סיפורי לילה', author: 'נטע', episodeCount: 60, cover: 'https://picsum.photos/300/300?random=49' },
        ]);
      }

      if (data.categories?.length) {
        setCategories(data.categories);
      } else {
        setCategories([
          { id: 'news', name: 'podcasts.categories.news' },
          { id: 'comedy', name: 'podcasts.categories.comedy' },
          { id: 'tech', name: 'podcasts.categories.tech' },
          { id: 'society', name: 'podcasts.categories.society' },
          { id: 'history', name: 'podcasts.categories.history' },
        ]);
      }
    } catch (error) {
      console.error('Failed to load podcasts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleShowPress = (show: PodcastShow) => {
    navigation.navigate('Player', {
      id: show.id,
      title: show.title,
      type: 'podcast',
    });
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.success} />
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { flexDirection: isRTL ? 'row' : 'row-reverse' }]}>
        <View style={[styles.headerIcon, { marginLeft: isRTL ? spacing.lg : 0, marginRight: isRTL ? 0 : spacing.lg }]}>
          <Text style={styles.headerIconText}>🎙️</Text>
        </View>
        <View>
          <Text style={[styles.title, { textAlign }]}>{t('podcasts.title')}</Text>
          <Text style={[styles.subtitle, { textAlign }]}>{shows.length} {t('podcasts.shows')}</Text>
        </View>
      </View>

      {/* Category Filter */}
      <View style={[styles.categories, { flexDirection: isRTL ? 'row' : 'row-reverse', justifyContent: isRTL ? 'flex-start' : 'flex-start' }]}>
        <TouchableOpacity
          onPress={() => setSelectedCategory('all')}
          style={[
            styles.categoryButton,
            selectedCategory === 'all' && styles.categoryButtonActive,
          ]}
        >
          <Text
            style={[
              styles.categoryText,
              selectedCategory === 'all' && styles.categoryTextActive,
            ]}
          >
            {t('podcasts.categories.all')}
          </Text>
        </TouchableOpacity>
        {categories.map((category) => (
          <TouchableOpacity
            key={category.id}
            onPress={() => setSelectedCategory(category.id)}
            style={[
              styles.categoryButton,
              selectedCategory === category.id && styles.categoryButtonActive,
            ]}
          >
            <Text
              style={[
                styles.categoryText,
                selectedCategory === category.id && styles.categoryTextActive,
              ]}
            >
              {t(category.name)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Shows Grid */}
      <FlatList
        data={shows}
        keyExtractor={(item) => item.id}
        numColumns={isTV ? 5 : 3}
        key={isTV ? 'tv' : 'mobile'}
        contentContainerStyle={styles.grid}
        renderItem={({ item, index }) => (
          <PodcastCard
            show={item}
            onPress={() => handleShowPress(item)}
            index={index}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <GlassView style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>🎙️</Text>
              <Text style={styles.emptyTitle}>{t('empty.noPodcasts')}</Text>
              <Text style={styles.emptySubtitle}>{t('empty.tryLater')}</Text>
            </GlassView>
          </View>
        }
      />
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
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: colors.text,
    fontSize: 18,
    marginTop: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
    paddingTop: 40,
    paddingBottom: spacing.lg,
  },
  headerIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.lg,
  },
  headerIconText: {
    fontSize: 28,
  },
  title: {
    fontSize: 42,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'right',
  },
  subtitle: {
    fontSize: 18,
    color: colors.textSecondary,
    marginTop: 2,
    textAlign: 'right',
  },
  categories: {
    flexDirection: 'row',
    paddingHorizontal: 48,
    marginBottom: 24,
    gap: 12,
    zIndex: 10,
  },
  categoryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: '#1a1a2e',
    borderWidth: 2,
    borderColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryButtonActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderColor: '#10b981',
  },
  categoryText: {
    fontSize: 16,
    color: '#888888',
  },
  categoryTextActive: {
    color: '#10b981',
    fontWeight: 'bold',
  },
  grid: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
    paddingTop: spacing.md,
    direction: 'ltr',
  },
  cardTouchable: {
    flex: 1,
    margin: spacing.sm,
    maxWidth: isTV ? '20%' : '33.33%',
  },
  card: {
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  cardFocused: {
    borderColor: colors.success,
    boxShadow: `0 0 20px ${colors.success}`,
  },
  cardImage: {
    width: '100%',
    aspectRatio: 1,
  },
  cardImagePlaceholder: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: colors.backgroundLighter,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderIcon: {
    fontSize: 48,
  },
  cardContent: {
    padding: spacing.sm,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'right',
    marginBottom: 2,
  },
  cardAuthor: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'right',
    marginBottom: spacing.xs,
  },
  cardMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaIcon: {
    fontSize: 10,
    marginLeft: 4,
  },
  metaText: {
    fontSize: 10,
    color: colors.textMuted,
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.success,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: {
    fontSize: 24,
    color: colors.background,
    marginLeft: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyCard: {
    padding: spacing.xxl,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
  },
});

export default PodcastsScreen;
