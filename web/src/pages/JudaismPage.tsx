import { useState, useEffect } from 'react';
import { View, Text, FlatList, Pressable, Image, ActivityIndicator, ScrollView, useWindowDimensions } from 'react-native';
import { Link } from 'react-router-dom';
import { Play, Clock, User, Newspaper, Calendar, Users, BookOpen } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@/hooks/useDirection';
import { judaismService } from '@/services/api';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import { GlassCard, GlassCategoryPill } from '@bayit/shared/ui';
import { JewishNewsFeed, JewishCalendarWidget, ShabbatTimesCard, CommunityDirectory } from '@/components/judaism';
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
        <GlassCard className={`p-0 m-1 overflow-hidden ${isHovered ? 'scale-102' : ''}`}>
          <View className="aspect-video relative">
            {item.thumbnail ? (
              <Image
                source={{ uri: item.thumbnail }}
                className="w-full h-full"
                resizeMode="cover"
              />
            ) : (
              <View className="w-full h-full bg-purple-500/20 items-center justify-center">
                <Text className="text-5xl">{categoryIcon}</Text>
              </View>
            )}

            {/* Category Badge */}
            <View className="absolute top-2 left-2 bg-black/70 px-2 py-1 rounded-full">
              <Text className="text-sm">{categoryIcon}</Text>
            </View>

            {/* Duration Badge */}
            {item.duration && (
              <View className="absolute top-2 right-2 bg-blue-500/90 px-2 py-1 rounded flex-row items-center gap-1">
                <Clock size={10} color={colors.text} />
                <Text className="text-white text-xs font-bold">{item.duration}</Text>
              </View>
            )}

            {/* Hover Overlay */}
            {isHovered && (
              <View className="absolute inset-0 bg-black/40 items-center justify-center">
                <View className="w-14 h-14 rounded-full bg-blue-500 items-center justify-center">
                  <Play size={24} color={colors.background} fill={colors.background} />
                </View>
              </View>
            )}
          </View>

          <View className="p-3">
            <Text className="text-white font-semibold" numberOfLines={1}>
              {getLocalizedText('title')}
            </Text>
            {item.rabbi && (
              <View className="flex-row items-center gap-1 mt-1">
                <User size={12} color={colors.primary} />
                <Text className="text-blue-400 text-sm">{getLocalizedText('rabbi')}</Text>
              </View>
            )}
            {item.description && (
              <Text className="text-gray-400 text-xs mt-1" numberOfLines={1}>
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
  const { isRTL, textAlign, flexDirection, justifyContent, alignItems } = useDirection();
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

  return (
    <View className="flex-1 px-4 py-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <View className="flex-row items-center gap-3 mb-6" style={{ flexDirection, justifyContent }}>
        <View className="w-16 h-16 rounded-full bg-purple-500/30 items-center justify-center">
          <Text className="text-4xl">✡️</Text>
        </View>
        <View>
          <Text className="text-3xl font-bold text-white" style={{ textAlign }}>
            {t('judaism.title', 'Judaism')}
          </Text>
          <Text className="text-gray-400 text-sm" style={{ textAlign }}>
            {content.length} {t('judaism.items', 'items')}
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

      {/* Special Views or Content Grid */}
      {showSpecialView ? (
        renderSpecialView()
      ) : isLoading ? (
        <View className="flex-1 items-center justify-center py-16">
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : content.length > 0 ? (
        <FlatList
          data={content}
          keyExtractor={(item) => item.id}
          numColumns={numColumns}
          key={numColumns}
          contentContainerStyle={{ gap: spacing.md }}
          columnWrapperStyle={numColumns > 1 ? { gap: spacing.md } : undefined}
          renderItem={({ item }) => (
            <View style={{ flex: 1, maxWidth: `${100 / numColumns}%` }}>
              <JudaismCard item={item} />
            </View>
          )}
        />
      ) : (
        <View className="flex-1 items-center justify-center py-16">
          <GlassCard className="p-8 items-center">
            <Text className="text-6xl mb-4">✡️</Text>
            <Text className="text-white text-xl font-semibold mb-2">
              {t('judaism.empty', 'No content yet')}
            </Text>
            <Text className="text-gray-400">
              {t('judaism.emptyHint', 'Check back soon for new Torah content')}
            </Text>
          </GlassCard>
        </View>
      )}
    </View>
  );
}
