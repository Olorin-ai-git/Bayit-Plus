import { useState, useEffect } from 'react';
import { View, Text, Pressable, Image, ActivityIndicator, ScrollView, useWindowDimensions } from 'react-native';
import { Link } from 'react-router-dom';
import { Play, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@/hooks/useDirection';
import { judaismService } from '@/services/api';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import { GlassCard, GlassCategoryPill } from '@bayit/shared/ui';
import { JerusalemRow, TelAvivRow } from '@bayit/shared';
import {
  JewishNewsFeed,
  JewishCalendarWidget,
  ShabbatTimesCard,
  CommunityDirectory,
  ShabbatEveSection,
} from '@/components/judaism';
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
        style={{ width: '100%' }}
      >
        <GlassCard className={`w-full p-0 overflow-hidden ${isHovered ? '-translate-y-1' : ''}`}
          style={isHovered ? {
            // @ts-ignore - web-specific property
            boxShadow: `0 8px 32px rgba(107, 33, 168, 0.3)`,
          } : undefined}>
          {/* Thumbnail Container - portrait aspect ratio like carousel cards */}
          <View className="relative aspect-[2/3] overflow-hidden rounded-t-lg bg-black">
            {thumbnailUrl ? (
              <Image
                source={{ uri: thumbnailUrl }}
                className="w-full h-full"
                resizeMode="cover"
                onError={handleImageError}
              />
            ) : (
              <View className="w-full h-full bg-glass justify-center items-center">
                <Text style={{ fontSize: 48 }}>{categoryIcon}</Text>
              </View>
            )}

            {/* Play Overlay - matches carousel style */}
            {isHovered && (
              <View className="absolute inset-0 justify-center items-center">
                <LinearGradient
                  colors={['transparent', 'rgba(10, 10, 20, 0.8)']}
                  className="absolute inset-0"
                />
                <View className="w-14 h-14 rounded-full bg-white/15 backdrop-blur-lg justify-center items-center"
                  style={{
                    // @ts-ignore - web-specific property
                    backdropFilter: 'blur(8px)',
                    boxShadow: `0 0 20px ${colors.primary}`,
                  }}>
                  <Play size={24} color={colors.text} fill={colors.text} />
                </View>
              </View>
            )}

            {/* Duration Badge - dark glass style like carousel cards */}
            {item.duration && (
              <View className={`absolute bottom-2 ${isRTL ? 'right-2' : 'left-2'} bg-black/70 px-2 py-0.5 rounded`}>
                <Text className="text-xs text-white font-medium">{item.duration}</Text>
              </View>
            )}

            {/* Category Badge - top corner */}
            <View className={`absolute top-2 ${isRTL ? 'right-2' : 'left-2'} bg-black/60 backdrop-blur-lg px-2 py-1 rounded-full`}
              style={{
                // @ts-ignore - web-specific property
                backdropFilter: 'blur(8px)',
              }}>
              <Text style={{ fontSize: 14 }}>{categoryIcon}</Text>
            </View>
          </View>

          {/* Content Info */}
          <View className="p-3">
            <Text
              className={`text-sm font-medium text-white mb-1 ${isHovered ? 'text-primary' : ''}`}
              style={{ textAlign }}
              numberOfLines={2}
            >
              {getLocalizedText('title')}
            </Text>
            {item.rabbi && (
              <View className="flex-row items-center gap-1 mt-0.5">
                <User size={14} color={colors.primary} />
                <Text className="text-xs text-gray-400">{getLocalizedText('rabbi')}</Text>
              </View>
            )}
            {item.description && (
              <Text className="text-xs text-gray-500 mt-1" numberOfLines={2}>
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
          <View className="gap-4">
            <JewishNewsFeed limit={30} />
          </View>
        );
      case 'calendar':
        return (
          <View className="gap-4">
            <View className="flex-row gap-4 flex-wrap">
              <View className="flex-1 min-w-80">
                <JewishCalendarWidget />
              </View>
              <View className="flex-1 min-w-80">
                <ShabbatTimesCard />
              </View>
            </View>
          </View>
        );
      case 'community':
        return (
          <View className="gap-4">
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
      <View className="gap-6">
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
        <View className="flex-row gap-4 flex-wrap">
          <View className="flex-1 min-w-80">
            <JewishCalendarWidget />
          </View>
          <View className="flex-1 min-w-80">
            <ShabbatTimesCard />
          </View>
        </View>

        {/* News Section */}
        <View>
          <Text className="text-xl font-bold mb-4" style={{ color: colors.text, textAlign }}>
            📰 {t('judaism.categories.news', 'Jewish News')}
          </Text>
          <JewishNewsFeed limit={10} />
        </View>

        {/* Community Section */}
        <View>
          <Text className="text-xl font-bold mb-4" style={{ color: colors.text, textAlign }}>
            🏛️ {t('judaism.categories.community', 'Community')}
          </Text>
          <CommunityDirectory />
        </View>
      </View>
    );
  };

  return (
    <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 40 }}>
      <View className="flex-1 px-4 py-6 max-w-7xl mx-auto w-full">
        {/* Header */}
        <View className="flex-row items-center gap-3 mb-6" style={{ flexDirection, justifyContent }}>
          <View className="w-16 h-16 rounded-full items-center justify-center" style={{ backgroundColor: colors.glassLight }}>
            <Text className="text-4xl">✡️</Text>
          </View>
          <View>
            <Text className="text-3xl font-bold" style={{ color: colors.text, textAlign }}>
              {t('judaism.title', 'Judaism')}
            </Text>
            <Text className="text-sm" style={{ color: colors.textSecondary, textAlign }}>
              {content.length > 0 ? `${content.length} ${t('judaism.items', 'items')}` : t('judaism.dashboard', 'Your Jewish Dashboard')}
            </Text>
          </View>
        </View>

        {/* Categories */}
        {categories.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mb-6"
            contentContainerStyle={{ gap: spacing.sm, paddingVertical: spacing.sm }}
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
          <View className="flex-1 items-center justify-center py-16">
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : content.length > 0 ? (
          <>
            {/* Show Shabbat Eve Section at top when viewing content */}
            <ShabbatEveSection />

            {/* Jerusalem and Tel Aviv Connection Sections */}
            <View className="gap-4 my-4">
              <JerusalemRow />
              <TelAvivRow />
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.md }}>
              {content.map((item) => (
                <View
                  key={item.id}
                  style={{
                    width: `calc(${100 / numColumns}% - ${(numColumns - 1) * spacing.md / numColumns}px)`,
                    minWidth: 200,
                  }}
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
