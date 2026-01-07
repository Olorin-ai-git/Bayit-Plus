import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Image, ActivityIndicator, ScrollView, useWindowDimensions } from 'react-native';
import { Link } from 'react-router-dom';
import { Play, Clock, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { judaismService } from '@/services/api';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import { GlassCard } from '@bayit/shared/ui';
import logger from '@/utils/logger';

const CATEGORY_ICONS: Record<string, string> = {
  all: '✡️',
  shiurim: '📖',
  tefila: '🕯️',
  music: '🎵',
  holidays: '🕎',
  documentaries: '🎬',
};

interface JudaismItem {
  id: string;
  title: string;
  title_en?: string;
  title_es?: string;
  description?: string;
  description_en?: string;
  description_es?: string;
  thumbnail?: string;
  category: string;
  rabbi?: string;
  rabbi_en?: string;
  rabbi_es?: string;
  duration?: string;
}

interface Category {
  id: string;
  name: string;
  name_en?: string;
  name_es?: string;
}

function JudaismCard({ item }: { item: JudaismItem }) {
  const { i18n } = useTranslation();
  const [isHovered, setIsHovered] = useState(false);
  const categoryIcon = CATEGORY_ICONS[item.category] || '✡️';

  const getLocalizedText = (field: 'title' | 'description' | 'rabbi') => {
    const lang = i18n.language;
    if (lang === 'he') return item[field] || '';
    if (lang === 'es') return item[`${field}_es` as keyof JudaismItem] || item[`${field}_en` as keyof JudaismItem] || item[field] || '';
    return item[`${field}_en` as keyof JudaismItem] || item[field] || '';
  };

  return (
    <Link to={`/vod/${item.id}`} style={{ textDecoration: 'none', flex: 1 }}>
      <Pressable
        onHoverIn={() => setIsHovered(true)}
        onHoverOut={() => setIsHovered(false)}
      >
        <GlassCard style={[styles.card, isHovered && styles.cardHovered]}>
          <View style={styles.thumbnailContainer}>
            {item.thumbnail ? (
              <Image
                source={{ uri: item.thumbnail }}
                style={styles.thumbnail}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.thumbnailPlaceholder}>
                <Text style={styles.placeholderIcon}>{categoryIcon}</Text>
              </View>
            )}

            {/* Category Badge */}
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryIcon}>{categoryIcon}</Text>
            </View>

            {/* Duration Badge */}
            {item.duration && (
              <View style={styles.durationBadge}>
                <Clock size={10} color={colors.text} />
                <Text style={styles.durationText}>{item.duration}</Text>
              </View>
            )}

            {/* Hover Overlay */}
            {isHovered && (
              <View style={styles.hoverOverlay}>
                <View style={styles.playButton}>
                  <Play size={24} color={colors.background} fill={colors.background} />
                </View>
              </View>
            )}
          </View>

          <View style={styles.info}>
            <Text style={styles.title} numberOfLines={1}>{getLocalizedText('title')}</Text>
            {item.rabbi && (
              <View style={styles.rabbiRow}>
                <User size={12} color={colors.primary} />
                <Text style={styles.rabbiText}>{getLocalizedText('rabbi')}</Text>
              </View>
            )}
            {item.description && (
              <Text style={styles.description} numberOfLines={1}>{getLocalizedText('description')}</Text>
            )}
          </View>
        </GlassCard>
      </Pressable>
    </Link>
  );
}

export default function JudaismPage() {
  const { t, i18n } = useTranslation();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [content, setContent] = useState<JudaismItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { width } = useWindowDimensions();

  const numColumns = width >= 1280 ? 5 : width >= 1024 ? 4 : width >= 768 ? 3 : 2;

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    loadContent();
  }, [selectedCategory]);

  const loadCategories = async () => {
    try {
      const response = await judaismService.getCategories();
      if (response?.data && Array.isArray(response.data)) {
        setCategories(response.data);
      }
    } catch (err) {
      logger.error('Failed to load Judaism categories', 'JudaismPage', err);
    }
  };

  const loadContent = async () => {
    try {
      setIsLoading(true);
      const category = selectedCategory !== 'all' ? selectedCategory : undefined;
      const response = await judaismService.getContent(category);
      if (response?.data && Array.isArray(response.data)) {
        setContent(response.data);
      }
    } catch (err) {
      logger.error('Failed to load Judaism content', 'JudaismPage', err);
      setContent([]);
    } finally {
      setIsLoading(false);
    }
  };

  const getCategoryName = (category: Category) => {
    const lang = i18n.language;
    if (lang === 'he') return category.name;
    if (lang === 'es') return category.name_es || category.name_en || category.name;
    return category.name_en || category.name;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Text style={styles.headerEmoji}>✡️</Text>
        </View>
        <View>
          <Text style={styles.pageTitle}>{t('judaism.title', 'יהדות')}</Text>
          <Text style={styles.itemCount}>{content.length} {t('judaism.items', 'פריטים')}</Text>
        </View>
      </View>

      {/* Categories */}
      {categories.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContainer}
          style={styles.categoriesScroll}
        >
          {categories.map((category) => (
            <Pressable
              key={category.id}
              onPress={() => setSelectedCategory(category.id)}
              style={[
                styles.categoryButton,
                selectedCategory === category.id && styles.categoryButtonActive,
              ]}
            >
              <Text style={styles.categoryButtonIcon}>
                {CATEGORY_ICONS[category.id] || '✡️'}
              </Text>
              <Text
                style={[
                  styles.categoryButtonText,
                  selectedCategory === category.id && styles.categoryButtonTextActive,
                ]}
              >
                {getCategoryName(category)}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {/* Loading State */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : content.length > 0 ? (
        <FlatList
          data={content}
          keyExtractor={(item) => item.id}
          numColumns={numColumns}
          key={numColumns}
          contentContainerStyle={styles.gridContent}
          columnWrapperStyle={numColumns > 1 ? styles.row : undefined}
          renderItem={({ item }) => (
            <View style={{ flex: 1, maxWidth: `${100 / numColumns}%` }}>
              <JudaismCard item={item} />
            </View>
          )}
        />
      ) : (
        <View style={styles.emptyState}>
          <GlassCard style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>✡️</Text>
            <Text style={styles.emptyTitle}>{t('judaism.empty', 'אין תוכן זמין')}</Text>
            <Text style={styles.emptyDescription}>{t('judaism.emptyHint', 'נסה לבחור קטגוריה אחרת')}</Text>
          </GlassCard>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    maxWidth: 1400,
    marginHorizontal: 'auto',
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerEmoji: {
    fontSize: 32,
  },
  pageTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text,
  },
  itemCount: {
    fontSize: 14,
    color: colors.textMuted,
  },
  categoriesScroll: {
    marginBottom: spacing.lg,
  },
  categoriesContainer: {
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: colors.backgroundLighter,
  },
  categoryButtonActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderColor: '#3B82F6',
  },
  categoryButtonIcon: {
    fontSize: 16,
  },
  categoryButtonText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  categoryButtonTextActive: {
    color: '#60A5FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
  },
  gridContent: {
    gap: spacing.md,
  },
  row: {
    gap: spacing.md,
  },
  card: {
    padding: 0,
    margin: spacing.xs,
    overflow: 'hidden',
  },
  cardHovered: {
    transform: [{ scale: 1.02 }],
  },
  thumbnailContainer: {
    aspectRatio: 16 / 9,
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  thumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderIcon: {
    fontSize: 48,
  },
  categoryBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  categoryIcon: {
    fontSize: 14,
  },
  durationBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: 'rgba(59, 130, 246, 0.9)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  durationText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.text,
  },
  hoverOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    padding: spacing.sm,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  rabbiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  rabbiText: {
    fontSize: 14,
    color: '#60A5FA',
  },
  description: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyCard: {
    padding: spacing.xl * 1.5,
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
  emptyDescription: {
    fontSize: 16,
    color: colors.textMuted,
  },
});
