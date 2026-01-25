import { useState, useEffect } from 'react';
import { View, Text, Pressable, Image, ActivityIndicator, ScrollView, useWindowDimensions, StyleSheet } from 'react-native';
import { Link } from 'react-router-dom';
import { Play, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@/hooks/useDirection';
import { judaismService } from '@/services/api';
import { colors, spacing, borderRadius } from '@olorin/design-tokens';
import {
  GlassCard,
  GlassCategoryPill,
  GlassPageHeader,
  GridSkeleton,
  GlassContentPlaceholder,
} from '@bayit/shared/ui';
import { JerusalemRow, TelAvivRow } from '@bayit/shared';
import {
  JewishNewsFeed,
  JewishCalendarWidget,
  ShabbatTimesCard,
  CommunityDirectory,
  ShabbatEveSection,
} from '@/components/judaism';
import { LoadingState } from '@bayit/shared/components/states';
import LinearGradient from 'react-native-linear-gradient';
import logger from '@/utils/logger';

const CATEGORY_ICONS: Record<string, string> = {
  all: '✡️',
  news: '📰',
  calendar: '📅',
  community: '🏛️',
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
  const { isRTL, textAlign } = useDirection();
  const [isHovered, setIsHovered] = useState(false);
  // Track which thumbnail quality we're trying: 0=maxres, 1=hqdefault, 2=failed
  const [thumbnailAttempt, setThumbnailAttempt] = useState(0);
  const categoryIcon = CATEGORY_ICONS[item.category] || '✡️';

  const getLocalizedText = (field: 'title' | 'description' | 'rabbi') => {
    const lang = i18n.language;
    if (lang === 'he') return item[field] || '';
    if (lang === 'es') return item[`${field}_es` as keyof JudaismItem] || item[`${field}_en` as keyof JudaismItem] || item[field] || '';
    return item[`${field}_en` as keyof JudaismItem] || item[field] || '';
  };

  // Try different YouTube thumbnail qualities with proper fallback
  // Always prefer hqdefault (480x360) which is always available for any YouTube video
  // maxresdefault (1280x720) is not always available and causes 404 errors
  const getThumbnailUrl = (): string | null => {
    if (!item.thumbnail) return null;

    // Convert any maxresdefault URLs to hqdefault for reliability
    if (item.thumbnail.includes('maxresdefault')) {
      return item.thumbnail.replace('maxresdefault', 'hqdefault');
    }

    // For other YouTube thumbnails or non-YouTube images
    return thumbnailAttempt < 2 ? item.thumbnail : null;
  };

  const handleImageError = () => {
    // Try next fallback quality
    if (thumbnailAttempt < 2) {
      setThumbnailAttempt(prev => prev + 1);
    }
  };

  const thumbnailUrl = getThumbnailUrl();

  return (
    <Link to={`/vod/${item.id}`} style={{ textDecoration: 'none', width: '100%' }}>
      <Pressable
        onHoverIn={() => setIsHovered(true)}
        onHoverOut={() => setIsHovered(false)}
        style={styles.cardPressable}
      >
        <GlassCard
          style={[
            styles.cardContainer,
            isHovered && {
              // @ts-ignore - web-specific property
              boxShadow: `0 8px 32px rgba(107, 33, 168, 0.3)`,
              transform: [{ translateY: -4 }],
            }
          ]}
        >
          {/* Thumbnail Container - portrait aspect ratio like carousel cards */}
          <View style={styles.thumbnailContainer}>
            {thumbnailUrl ? (
              <Image
                source={{ uri: thumbnailUrl }}
                style={styles.thumbnailImage}
                resizeMode="cover"
                onError={handleImageError}
              />
            ) : (
              <View style={styles.thumbnailPlaceholder}>
                <Text style={styles.categoryIconLarge}>{categoryIcon}</Text>
              </View>
            )}

            {/* Play Overlay - matches carousel style */}
            {isHovered && (
              <View style={styles.playOverlay}>
                <LinearGradient
                  colors={['transparent', 'rgba(10, 10, 20, 0.8)']}
                  style={StyleSheet.absoluteFill}
                />
                <View style={[
                  styles.playButton,
                  {
                    // @ts-ignore - web-specific property
                    backdropFilter: 'blur(8px)',
                    boxShadow: `0 0 20px ${colors.primary}`,
                  }
                ]}>
                  <Play size={24} color={colors.text} fill={colors.text} />
                </View>
              </View>
            )}

            {/* Duration Badge - dark glass style like carousel cards */}
            {item.duration && (
              <View style={[styles.durationBadge, isRTL ? styles.badgeRight : styles.badgeLeft]}>
                <Text style={styles.durationText}>{item.duration}</Text>
              </View>
            )}

            {/* Category Badge - top corner */}
            <View style={[
              styles.categoryBadge,
              isRTL ? styles.badgeRight : styles.badgeLeft,
              {
                // @ts-ignore - web-specific property
                backdropFilter: 'blur(8px)',
              }
            ]}>
              <Text style={styles.categoryIconSmall}>{categoryIcon}</Text>
            </View>
          </View>

          {/* Content Info */}
          <View style={styles.contentInfo}>
            <Text
              style={[
                styles.contentTitle,
                { textAlign },
                isHovered && styles.contentTitleHovered
              ]}
              numberOfLines={2}
            >
              {getLocalizedText('title')}
            </Text>
            {item.rabbi && (
              <View style={styles.rabbiContainer}>
                <User size={14} color={colors.primary} />
                <Text style={styles.rabbiText}>{getLocalizedText('rabbi')}</Text>
              </View>
            )}
            {item.description && (
              <Text style={styles.descriptionText} numberOfLines={2}>
                {getLocalizedText('description')}
              </Text>
            )}
          </View>
        </GlassCard>
      </Pressable>
    </Link>
  );
}

export default function JudaismPage() {
  const { t, i18n } = useTranslation();
  const { isRTL, textAlign, flexDirection, justifyContent } = useDirection();
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
      if (response?.categories && Array.isArray(response.categories)) {
        setCategories(response.categories);
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
      if (response?.content && Array.isArray(response.content)) {
        setContent(response.content);
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

  // Special views for news, calendar, and community categories
  const renderSpecialView = () => {
    switch (selectedCategory) {
      case 'news':
        return (
          <View style={styles.specialViewContainer}>
            <JewishNewsFeed limit={30} />
          </View>
        );
      case 'calendar':
        return (
          <View style={styles.specialViewContainer}>
            <View style={styles.calendarRow}>
              <View style={styles.calendarWidget}>
                <JewishCalendarWidget />
              </View>
              <View style={styles.calendarWidget}>
                <ShabbatTimesCard />
              </View>
            </View>
          </View>
        );
      case 'community':
        return (
          <View style={styles.specialViewContainer}>
            <CommunityDirectory />
          </View>
        );
      default:
        return null;
    }
  };

  const showSpecialView = ['news', 'calendar', 'community'].includes(selectedCategory);

  // Default view when "All" is selected and no content - show dashboard
  const renderDashboardView = () => {
    return (
      <View style={styles.dashboardContainer}>
        {/* Shabbat Eve Section - prominent at top */}
        <ShabbatEveSection />

        {/* Jerusalem Connection Section */}
        <View>
          <JerusalemRow />
        </View>

        {/* Tel Aviv Connection Section */}
        <View>
          <TelAvivRow />
        </View>

        {/* Calendar and Shabbat Times Row */}
        <View style={styles.calendarRow}>
          <View style={styles.calendarWidget}>
            <JewishCalendarWidget />
          </View>
          <View style={styles.calendarWidget}>
            <ShabbatTimesCard />
          </View>
        </View>

        {/* News Section */}
        <View>
          <Text style={[styles.sectionTitle, { textAlign }]}>
            📰 {t('judaism.categories.news', 'Jewish News')}
          </Text>
          <JewishNewsFeed limit={10} />
        </View>

        {/* Community Section */}
        <View>
          <Text style={[styles.sectionTitle, { textAlign }]}>
            🏛️ {t('judaism.categories.community', 'Community')}
          </Text>
          <CommunityDirectory />
        </View>
      </View>
    );
  };

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
      <View style={styles.container}>
        {/* Header */}
        <GlassPageHeader
          title={t('judaism.title', 'Judaism')}
          pageType="judaism"
          badge={content.length > 0 ? content.length : undefined}
          isRTL={isRTL}
        />

        {/* Categories */}
        {categories.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoriesScroll}
            contentContainerStyle={styles.categoriesContent}
          >
            {categories.map((category) => (
              <GlassCategoryPill
                key={category.id}
                label={getCategoryName(category)}
                emoji={CATEGORY_ICONS[category.id] || '✡️'}
                isActive={selectedCategory === category.id}
                onPress={() => setSelectedCategory(category.id)}
              />
            ))}
          </ScrollView>
        )}

        {/* Content Area */}
        {showSpecialView ? (
          renderSpecialView()
        ) : isLoading ? (
          <>
            <View style={styles.categoriesSkeleton} />
            <GridSkeleton numColumns={numColumns} numRows={2} />
          </>
        ) : content.length > 0 ? (
          <>
            {/* Show Shabbat Eve Section at top when viewing content */}
            <ShabbatEveSection />

            {/* Jerusalem and Tel Aviv Connection Sections */}
            <View style={styles.connectionsContainer}>
              <JerusalemRow />
              <TelAvivRow />
            </View>

            <View style={styles.contentGrid}>
              {content.map((item) => (
                <View
                  key={item.id}
                  style={[
                    styles.gridItem,
                    {
                      width: `calc(${100 / numColumns}% - ${(numColumns - 1) * spacing.md / numColumns}px)`,
                      minWidth: 200,
                    }
                  ]}
                >
                  <JudaismCard item={item} />
                </View>
              ))}
            </View>
          </>
        ) : (
          // No content - show the dashboard view with all widgets
          renderDashboardView()
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // Card Component Styles
  cardPressable: {
    width: '100%',
  },
  cardContainer: {
    width: '100%',
    padding: 0,
    overflow: 'hidden',
  },
  thumbnailContainer: {
    position: 'relative',
    aspectRatio: 2 / 3,
    overflow: 'hidden',
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    backgroundColor: colors.background,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  thumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.glassLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryIconLarge: {
    fontSize: 48,
  },
  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  badgeLeft: {
    left: 8,
  },
  badgeRight: {
    right: 8,
  },
  durationText: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '500',
  },
  categoryBadge: {
    position: 'absolute',
    top: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  categoryIconSmall: {
    fontSize: 14,
  },
  contentInfo: {
    padding: 12,
  },
  contentTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 4,
  },
  contentTitleHovered: {
    color: colors.primary.DEFAULT,
  },
  rabbiContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  rabbiText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  descriptionText: {
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: 4,
  },

  // Main Page Styles
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    maxWidth: 1280,
    marginHorizontal: 'auto',
    width: '100%',
  },
  categoriesSkeleton: {
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
  },
  categoriesScroll: {
    marginBottom: spacing.lg,
  },
  categoriesContent: {
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  specialViewContainer: {
    gap: spacing.md,
  },
  calendarRow: {
    flexDirection: 'row',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  calendarWidget: {
    flex: 1,
    minWidth: 320,
  },
  dashboardContainer: {
    gap: spacing.lg,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.md,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  connectionsContainer: {
    gap: spacing.md,
    marginVertical: spacing.md,
  },
  contentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  gridItem: {
    // Width set dynamically based on numColumns
  },
});
