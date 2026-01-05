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
import { contentService } from '../services/api';
import { colors, spacing, borderRadius } from '../theme';
import { isTV } from '../utils/platform';
import { useDirection } from '../hooks/useDirection';

interface ContentItem {
  id: string;
  title: string;
  subtitle?: string;
  thumbnail?: string;
  year?: string;
  duration?: string;
  category?: string;
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
  const { t } = useTranslation();
  const { isRTL, textAlign } = useDirection();
  const navigation = useNavigation<any>();
  const [isLoading, setIsLoading] = useState(true);
  const [content, setContent] = useState<ContentItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    loadContent();
  }, [selectedCategory]);

  const loadContent = async () => {
    try {
      setIsLoading(true);
      const [categoriesRes, contentRes] = await Promise.all([
        contentService.getCategories().catch(() => ({ categories: [] })),
        selectedCategory === 'all'
          ? contentService.getFeatured().catch(() => ({ items: [] }))
          : contentService.getByCategory(selectedCategory).catch(() => ({ items: [] })),
      ]);

      setCategories(categoriesRes.categories || []);

      const items = contentRes.items || contentRes.categories?.flatMap((c: any) => c.items) || [];

      if (items.length) {
        setContent(items);
      } else {
        // Demo data
        setContent([
          { id: '1', title: 'פאודה', year: '2023', thumbnail: 'https://picsum.photos/400/225?random=20' },
          { id: '2', title: 'שטיסל', year: '2021', thumbnail: 'https://picsum.photos/400/225?random=21' },
          { id: '3', title: 'טהרן', year: '2022', thumbnail: 'https://picsum.photos/400/225?random=22' },
          { id: '4', title: 'הבורר', year: '2020', thumbnail: 'https://picsum.photos/400/225?random=23' },
          { id: '5', title: 'עבודה ערבית', year: '2019', thumbnail: 'https://picsum.photos/400/225?random=24' },
          { id: '6', title: 'בית הבובות', year: '2023', thumbnail: 'https://picsum.photos/400/225?random=25' },
          { id: '7', title: 'סרוגים', year: '2018', thumbnail: 'https://picsum.photos/400/225?random=26' },
          { id: '8', title: 'רמזור', year: '2017', thumbnail: 'https://picsum.photos/400/225?random=27' },
          { id: '9', title: 'פוליטיקה', year: '2022', thumbnail: 'https://picsum.photos/400/225?random=28' },
          { id: '10', title: 'אופנה', year: '2021', thumbnail: 'https://picsum.photos/400/225?random=29' },
          { id: '11', title: 'בטיפול', year: '2020', thumbnail: 'https://picsum.photos/400/225?random=30' },
          { id: '12', title: 'מאחורי הקלעים', year: '2019', thumbnail: 'https://picsum.photos/400/225?random=31' },
        ]);
      }

      if (!categoriesRes.categories?.length) {
        setCategories([
          { id: 'drama', name: 'vod.categories.drama' },
          { id: 'comedy', name: 'vod.categories.comedy' },
          { id: 'action', name: 'vod.categories.action' },
          { id: 'documentary', name: 'vod.categories.documentary' },
          { id: 'kids', name: 'vod.categories.kids' },
        ]);
      }
    } catch (error) {
      console.error('Failed to load content:', error);
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
            {t('vod.categories.all')}
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
              <Text style={styles.emptyTitle}>אין תוכן זמין</Text>
              <Text style={styles.emptySubtitle}>נסה לבחור קטגוריה אחרת</Text>
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
    backgroundColor: 'rgba(0, 217, 255, 0.2)',
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
    backgroundColor: 'rgba(0, 217, 255, 0.2)',
    borderColor: '#00d9ff',
  },
  categoryText: {
    fontSize: 16,
    color: '#888888',
  },
  categoryTextActive: {
    color: '#00d9ff',
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
