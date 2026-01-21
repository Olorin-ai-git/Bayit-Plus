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
import { GlassView, GlassCategoryPill } from '../components';
import { SubtitleFlags } from '@bayit/shared/components/SubtitleFlags';
import { contentService } from '../services/api';
import { colors, spacing, borderRadius } from '../theme';
import { isTV } from '../utils/platform';
import { useDirection } from '@bayit/shared/hooks';

interface ContentItem {
  id: string;
  title: string;
  subtitle?: string;
  thumbnail?: string;
  year?: string;
  duration?: string;
  category?: string;
  has_subtitles?: boolean;
  available_subtitle_languages?: string[];
}

interface Category {
  id: string;
  name: string;
}

const ContentCard: React.FC<{
  item: ContentItem;
  onPress: () => void;
  index: number;
}> = ({ item, onPress, index }) => {
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
        <View style={{ position: 'relative' }}>
          {item.thumbnail ? (
            <Image
              source={{ uri: item.thumbnail }}
              style={styles.cardImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.cardImagePlaceholder}>
              <Text style={styles.placeholderIcon}>🎬</Text>
            </View>
          )}

          {/* Subtitle Flags */}
          {item.available_subtitle_languages && item.available_subtitle_languages.length > 0 && (
            <SubtitleFlags
              languages={item.available_subtitle_languages}
              position="bottom-right"
              size="medium"
              showTooltip={false}
            />
          )}
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {item.title}
          </Text>
          {(item.year || item.duration) && (
            <Text style={styles.cardMeta}>
              {item.year}{item.year && item.duration ? ' • ' : ''}{item.duration}
            </Text>
          )}
        </View>
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

export const VODScreen: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { isRTL, textAlign, flexDirection } = useDirection();
  const navigation = useNavigation<any>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [content, setContent] = useState<ContentItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const currentLang = i18n.language;

  // Helper to get localized text
  const getLocalizedText = (item: any, field: string) => {
    if (currentLang === 'he') return item[field] || item.title || item.name;
    if (currentLang === 'es') return item[`${field}_es`] || item[`${field}_en`] || item[field];
    return item[`${field}_en`] || item[field];
  };

  useEffect(() => {
    loadContent();
  }, [selectedCategory]);

  const loadContent = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [categoriesRes, contentRes] = await Promise.all([
        contentService.getCategories(),
        selectedCategory === 'all'
          ? contentService.getFeatured()
          : contentService.getByCategory(selectedCategory),
      ]) as [any, any];

      setCategories(categoriesRes.categories || []);
      const items = contentRes.items || contentRes.categories?.flatMap((c: any) => c.items) || [];
      // Map items with localized titles
      setContent(items.map((item: any) => ({
        ...item,
        title: getLocalizedText(item, 'title'),
      })));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('vod.loadError', 'Failed to load content');
      setError(errorMessage);
      setContent([]);
      setCategories([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleContentPress = (item: ContentItem) => {
    navigation.navigate('Player', {
      id: item.id,
      title: item.title,
      type: 'vod',
    });
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { flexDirection: isRTL ? 'row' : 'row-reverse' }]}>
        <View style={[styles.headerIcon, { marginLeft: isRTL ? spacing.lg : 0, marginRight: isRTL ? 0 : spacing.lg }]}>
          <Text style={styles.headerIconText}>🎬</Text>
        </View>
        <View>
          <Text style={[styles.title, { textAlign }]}>{t('vod.title')}</Text>
          <Text style={[styles.subtitle, { textAlign }]}>{content.length} {t('vod.movies')}</Text>
        </View>
      </View>

      {/* Category Filter */}
      <View style={[styles.categories, { flexDirection: isRTL ? 'row' : 'row-reverse', justifyContent: isRTL ? 'flex-start' : 'flex-start' }]}>
        <GlassCategoryPill
          label={t('vod.categories.all')}
          isActive={selectedCategory === 'all'}
          onPress={() => setSelectedCategory('all')}
          hasTVPreferredFocus
        />
        {categories.map((category: any) => (
          <GlassCategoryPill
            key={category.id}
            label={getLocalizedText(category, 'name')}
            isActive={selectedCategory === category.id}
            onPress={() => setSelectedCategory(category.id)}
          />
        ))}
      </View>

      {/* Content Grid */}
      <FlatList
        data={content}
        keyExtractor={(item) => item.id}
        numColumns={isTV ? 6 : 4}
        key={isTV ? 'tv' : 'mobile'}
        contentContainerStyle={styles.grid}
        renderItem={({ item, index }) => (
          <ContentCard
            item={item}
            onPress={() => handleContentPress(item)}
            index={index}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <GlassView style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>🎬</Text>
              <Text style={styles.emptyTitle}>{t('empty.noContent')}</Text>
              <Text style={styles.emptySubtitle}>{t('empty.tryAnotherCategory')}</Text>
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
    backgroundColor: 'rgba(107, 33, 168, 0.3)',
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
  grid: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
    paddingTop: spacing.md,
    direction: 'ltr',
  },
  cardTouchable: {
    flex: 1,
    margin: spacing.sm,
    maxWidth: isTV ? '16.66%' : '25%',
  },
  card: {
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  cardFocused: {
    borderColor: colors.primary,
    // @ts-ignore - Web CSS property for glow effect
    boxShadow: `0 0 20px ${colors.primary}`,
  },
  cardImage: {
    width: '100%',
    aspectRatio: 16 / 9,
  },
  cardImagePlaceholder: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: colors.backgroundLighter,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderIcon: {
    fontSize: 32,
  },
  cardContent: {
    padding: spacing.sm,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'right',
  },
  cardMeta: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
    textAlign: 'right',
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: {
    fontSize: 20,
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

export default VODScreen;
