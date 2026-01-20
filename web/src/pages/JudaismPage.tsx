import { useState, useEffect } from 'react';
import { View, Text, Pressable, Image, ActivityIndicator, ScrollView, useWindowDimensions, StyleSheet } from 'react-native';
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
  const getThumbnailUrl = (): string | null => {
    if (!item.thumbnail) return null;
    // If YouTube maxresdefault failed, try hqdefault
    if (item.thumbnail.includes('maxresdefault')) {
      if (thumbnailAttempt === 0) return item.thumbnail;
      if (thumbnailAttempt === 1) return item.thumbnail.replace('maxresdefault', 'hqdefault');
      return null; // Both failed
    }
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
        <GlassCard className={`p-0 overflow-hidden transition-transform ${isHovered ? 'scale-105' : ''}`}>
          {/* Thumbnail Container - fixed aspect ratio */}
          <View className="w-full relative" style={{ paddingBottom: '56.25%', backgroundColor: colors.glassLight }}>
            {thumbnailUrl ? (
              <Image
                source={{ uri: thumbnailUrl }}
                className="absolute inset-0 w-full h-full"
                resizeMode="cover"
                onError={handleImageError}
              />
            ) : (
              <View className="absolute inset-0 items-center justify-center">
                <Text className="text-5xl">{categoryIcon}</Text>
              </View>
            )}

            {/* Category Badge */}
            <View className="absolute top-2 left-2 px-2 py-1 rounded-full" style={{ backgroundColor: colors.overlayDark }}>
              <Text className="text-sm">{categoryIcon}</Text>
            </View>

            {/* Duration Badge */}
            {item.duration && (
              <View className="absolute bottom-2 right-2 px-2 py-1 rounded flex-row items-center gap-1" style={{ backgroundColor: colors.primary }}>
                <Clock size={12} color={colors.text} />
                <Text style={{ color: colors.text, fontSize: 12, fontWeight: 'bold' }}>{item.duration}</Text>
              </View>
            )}

            {/* Hover Overlay */}
            {isHovered && (
              <View className="absolute inset-0 items-center justify-center" style={{ backgroundColor: colors.overlay }}>
                <View className="w-14 h-14 rounded-full items-center justify-center" style={{ backgroundColor: colors.primary }}>
                  <Play size={24} color={colors.text} fill={colors.text} />
                </View>
              </View>
            )}
          </View>

          {/* Content Info */}
          <View className="p-3">
            <Text className="font-semibold text-sm" style={{ color: colors.text }} numberOfLines={2}>
              {getLocalizedText('title')}
            </Text>
            {item.rabbi && (
              <View className="flex-row items-center gap-1 mt-1">
                <User size={14} color={colors.primary} />
                <Text className="text-sm" style={{ color: colors.primaryLight }}>{getLocalizedText('rabbi')}</Text>
              </View>
            )}
            {item.description && (
              <Text className="text-xs mt-1" style={{ color: colors.textSecondary }} numberOfLines={2}>
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
