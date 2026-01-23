/**
 * YnetMivzakimWidget Component
 *
 * Displays Ynet breaking news (mivzakim) with auto-refresh every 2 minutes.
 * Designed for both web and TV displays.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { RefreshCw, ExternalLink, AlertCircle } from 'lucide-react';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import axios from 'axios';
import logger from '@/utils/logger';

// Refresh interval: 2 minutes
const REFRESH_INTERVAL = 2 * 60 * 1000;

interface NewsItem {
  title: string;
  link: string;
  published: string;
  summary: string;
  source: string;
}

interface YnetMivzakimWidgetProps {
  maxItems?: number;
  autoRefresh?: boolean;
  onItemClick?: (item: NewsItem) => void;
}

export function YnetMivzakimWidget({
  maxItems = 10,
  autoRefresh = true,
  onItemClick,
}: YnetMivzakimWidgetProps) {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchNews = useCallback(async () => {
    try {
      setError(null);
      // Use axios with configured base URL (set via webpack at build time)
      const apiUrl = import.meta.env.VITE_API_URL || '/api/v1';
      const response = await axios.get(`${apiUrl}/news/mivzakim`, {
        params: { limit: maxItems }
      });
      setNews(response.data.items || []);
      setLastUpdate(new Date());
    } catch (err) {
      logger.error('Failed to fetch Ynet mivzakim', { error: err, maxItems, component: 'YnetMivzakimWidget' });
      setError('Failed to load news');
    } finally {
      setLoading(false);
    }
  }, [maxItems]);

  useEffect(() => {
    // Initial fetch
    fetchNews();

    // Setup auto-refresh
    if (autoRefresh) {
      intervalRef.current = setInterval(fetchNews, REFRESH_INTERVAL);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchNews, autoRefresh]);

  const handleItemPress = (item: NewsItem) => {
    if (onItemClick) {
      onItemClick(item);
    } else if (item.link) {
      Linking.openURL(item.link);
    }
  };

  const formatTime = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString('he-IL', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  if (loading && news.length === 0) {
    return (
      <View className="flex-1 bg-black/80 rounded-lg overflow-hidden">
        <View className="flex-1 justify-center items-center p-8">
          <ActivityIndicator size="large" color={colors.primary} />
          <Text className="mt-2 text-white/60 text-sm">Loading news...</Text>
        </View>
      </View>
    );
  }

  if (error && news.length === 0) {
    return (
      <View className="flex-1 bg-black/80 rounded-lg overflow-hidden">
        <View className="flex-1 justify-center items-center p-8">
          <AlertCircle size={32} color="#ef4444" />
          <Text className="mt-2 text-red-500 text-sm mb-4">{error}</Text>
          <Pressable onPress={fetchNews} className="flex-row items-center gap-2 px-4 py-2 bg-white/5 rounded-lg">
            <RefreshCw size={16} color={colors.text} />
            <Text className="text-white text-sm">Retry</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black/80 rounded-lg overflow-hidden">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-2 bg-red-500/90 border-b border-white/10">
        <View className="flex-1">
          <Text className="text-base font-bold text-white text-right">מבזקי Ynet</Text>
          {lastUpdate && (
            <Text className="text-[11px] text-white/70 text-right mt-0.5">
              עודכן: {lastUpdate.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          )}
        </View>
        <Pressable onPress={fetchNews} className="p-2 rounded bg-white/20" disabled={loading}>
          <RefreshCw size={16} color={colors.text} style={loading ? { opacity: 0.5 } : undefined} />
        </Pressable>
      </View>

      {/* News List */}
      <ScrollView className="flex-1 px-2" showsVerticalScrollIndicator={false}>
        {news.map((item, index) => (
          <Pressable
            key={`${item.link}-${index}`}
            onPress={() => handleItemPress(item)}
            className="flex-row items-start py-2 px-2 border-b border-white/10 active:bg-white/10"
          >
            <View className="flex-1 flex-row items-start gap-2">
              <Text className="text-xs text-blue-500 font-semibold min-w-[45px] text-left">
                {formatTime(item.published)}
              </Text>
              <Text className="flex-1 text-sm text-white text-right leading-5" numberOfLines={3}>
                {item.title}
              </Text>
            </View>
            <ExternalLink size={14} color={colors.textMuted} className="ml-2 mt-0.5" />
          </Pressable>
        ))}
      </ScrollView>

      {/* Footer */}
      <View className="py-1 px-4 bg-black/50 items-center">
        <Text className="text-[10px] text-white/60">ynet.co.il</Text>
      </View>
    </View>
  );
}

export default YnetMivzakimWidget;
