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
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { RefreshCw, ExternalLink, AlertCircle } from 'lucide-react';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import axios from 'axios';

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
      console.error('Failed to fetch Ynet mivzakim:', err);
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
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading news...</Text>
        </View>
      </View>
    );
  }

  if (error && news.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <AlertCircle size={32} color="#ef4444" />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={fetchNews} style={styles.retryButton}>
            <RefreshCw size={16} color={colors.text} />
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>מבזקי Ynet</Text>
          {lastUpdate && (
            <Text style={styles.lastUpdate}>
              עודכן: {lastUpdate.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          )}
        </View>
        <Pressable onPress={fetchNews} style={styles.refreshButton} disabled={loading}>
          <RefreshCw size={16} color={colors.text} style={loading ? styles.spinning : undefined} />
        </Pressable>
      </View>

      {/* News List */}
      <ScrollView style={styles.newsList} showsVerticalScrollIndicator={false}>
        {news.map((item, index) => (
          <Pressable
            key={`${item.link}-${index}`}
            onPress={() => handleItemPress(item)}
            style={({ pressed }) => [
              styles.newsItem,
              pressed && styles.newsItemPressed,
            ]}
          >
            <View style={styles.newsContent}>
              <Text style={styles.newsTime}>{formatTime(item.published)}</Text>
              <Text style={styles.newsTitle} numberOfLines={3}>
                {item.title}
              </Text>
            </View>
            <ExternalLink size={14} color={colors.textMuted} style={styles.linkIcon} />
          </Pressable>
        ))}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>ynet.co.il</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'right',
  },
  lastUpdate: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'right',
    marginTop: 2,
  },
  refreshButton: {
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  spinning: {
    opacity: 0.5,
  },
  newsList: {
    flex: 1,
    paddingHorizontal: spacing.sm,
  },
  newsItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  newsItemPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  newsContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  newsTime: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
    minWidth: 45,
    textAlign: 'left',
  },
  newsTitle: {
    flex: 1,
    fontSize: 14,
    color: '#fff',
    textAlign: 'right',
    lineHeight: 20,
    fontFamily: 'System',
  },
  linkIcon: {
    marginLeft: spacing.xs,
    marginTop: 2,
  },
  footer: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 10,
    color: colors.textMuted,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.sm,
    color: colors.textMuted,
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorText: {
    marginTop: spacing.sm,
    color: '#ef4444',
    fontSize: 14,
    marginBottom: spacing.md,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.glass,
    borderRadius: borderRadius.md,
  },
  retryText: {
    color: colors.text,
    fontSize: 14,
  },
});

export default YnetMivzakimWidget;
