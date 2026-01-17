import { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, Linking, ActivityIndicator } from 'react-native';
import { Newspaper, ExternalLink, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@/hooks/useDirection';
import { judaismService } from '@/services/api';
import { GlassCard } from '@bayit/shared/ui';
import { colors, spacing } from '@bayit/shared/theme';
import logger from '@/utils/logger';

interface NewsItem {
  id: string;
  source_name: string;
  title: string;
  title_he?: string;
  link: string;
  published_at: string;
  summary?: string;
  summary_he?: string;
  author?: string;
  image_url?: string;
  category: string;
}

interface NewsSource {
  id: string;
  name: string;
  name_he?: string;
  category: string;
}

interface JewishNewsFeedProps {
  category?: string;
  limit?: number;
  showSourceFilter?: boolean;
}

export function JewishNewsFeed({ category, limit = 20, showSourceFilter = true }: JewishNewsFeedProps) {
  const { t, i18n } = useTranslation();
  const { isRTL, textAlign, flexDirection } = useDirection();
  const [news, setNews] = useState<NewsItem[]>([]);
  const [sources, setSources] = useState<NewsSource[]>([]);
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadSources();
    loadNews();
  }, [category]);

  useEffect(() => {
    loadNews();
  }, [selectedSource]);

  const loadSources = async () => {
    try {
      const response = await judaismService.getNewsSources();
      if (response?.sources) {
        setSources(response.sources);
      }
    } catch (err) {
      logger.error('Failed to load news sources', 'JewishNewsFeed', err);
    }
  };

  const loadNews = async () => {
    try {
      setIsLoading(true);
      const response = await judaismService.getNews(category, selectedSource, 1, limit);
      if (response?.items) {
        setNews(response.items);
      }
    } catch (err) {
      logger.error('Failed to load Jewish news', 'JewishNewsFeed', err);
      setNews([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadNews();
    setIsRefreshing(false);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(i18n.language === 'he' ? 'he-IL' : 'en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getLocalizedTitle = (item: NewsItem) => {
    if (i18n.language === 'he' && item.title_he) return item.title_he;
    return item.title;
  };

  const getCategoryColor = (cat: string) => {
    const colorMap: Record<string, string> = {
      news: '#3B82F6',
      culture: '#8B5CF6',
      opinion: '#EC4899',
      torah: '#10B981',
      community: '#F59E0B',
    };
    return colorMap[cat] || colors.primary;
  };

  return (
    <GlassCard className="p-4">
      <View className="flex-row items-center justify-between mb-4" style={{ flexDirection }}>
        <View className="flex-row items-center gap-2" style={{ flexDirection }}>
          <Newspaper size={24} color={colors.primary} />
          <Text className="text-xl font-bold text-white" style={{ textAlign }}>
            {t('judaism.news.title', 'Jewish News')}
          </Text>
        </View>
        <Pressable
          onPress={handleRefresh}
          className="p-2 rounded-full bg-white/10"
          disabled={isRefreshing}
        >
          <RefreshCw
            size={18}
            color={colors.textMuted}
            className={isRefreshing ? 'animate-spin' : ''}
          />
        </Pressable>
      </View>

      {/* Source Filter */}
      {showSourceFilter && sources.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mb-4"
          contentContainerStyle={{ gap: spacing.sm }}
        >
          <Pressable
            onPress={() => setSelectedSource(null)}
            className={`px-3 py-1.5 rounded-full ${!selectedSource ? 'bg-blue-500' : 'bg-white/10'}`}
          >
            <Text className="text-white text-sm">{t('common.all', 'All')}</Text>
          </Pressable>
          {sources.map((source) => (
            <Pressable
              key={source.id}
              onPress={() => setSelectedSource(source.name)}
              className={`px-3 py-1.5 rounded-full ${selectedSource === source.name ? 'bg-blue-500' : 'bg-white/10'}`}
            >
              <Text className="text-white text-sm">
                {i18n.language === 'he' && source.name_he ? source.name_he : source.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {/* News List */}
      {isLoading ? (
        <View className="py-8 items-center">
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : news.length > 0 ? (
        <ScrollView className="max-h-96">
          {news.map((item, index) => (
            <Pressable
              key={item.id}
              onPress={() => Linking.openURL(item.link)}
              className={`py-3 ${index > 0 ? 'border-t border-white/10' : ''}`}
            >
              <View className="flex-row items-start gap-3" style={{ flexDirection }}>
                <View className="flex-1">
                  <View className="flex-row items-center gap-2 mb-1" style={{ flexDirection }}>
                    <View
                      className="px-2 py-0.5 rounded"
                      style={{ backgroundColor: getCategoryColor(item.category) }}
                    >
                      <Text className="text-white text-xs font-medium">{item.source_name}</Text>
                    </View>
                    <Text className="text-gray-400 text-xs">{formatDate(item.published_at)}</Text>
                  </View>
                  <Text className="text-white font-medium" style={{ textAlign }} numberOfLines={2}>
                    {getLocalizedTitle(item)}
                  </Text>
                  {item.summary && (
                    <Text className="text-gray-400 text-sm mt-1" style={{ textAlign }} numberOfLines={2}>
                      {item.summary}
                    </Text>
                  )}
                </View>
                <ExternalLink size={16} color={colors.textMuted} />
              </View>
            </Pressable>
          ))}
        </ScrollView>
      ) : (
        <View className="py-8 items-center">
          <Text className="text-gray-400">{t('judaism.news.empty', 'No news available')}</Text>
        </View>
      )}
    </GlassCard>
  );
}
