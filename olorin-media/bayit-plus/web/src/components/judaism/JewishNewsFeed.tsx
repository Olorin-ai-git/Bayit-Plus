import { useState, useEffect } from 'react';
import { Newspaper, ExternalLink, RefreshCw, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@/hooks/useDirection';
import { judaismService } from '@/services/api';
import { GlassCard } from '@bayit/shared/ui';
import { colors } from '@olorin/design-tokens';
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
  const { isRTL } = useDirection();
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
      const response = await judaismService.getNews(category, selectedSource || undefined, 1, limit);
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

  // Strip HTML tags from text
  const stripHtml = (html: string | undefined): string => {
    if (!html) return '';
    return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').trim();
  };

  const getCategoryColor = (cat: string) => {
    const colorMap: Record<string, string> = {
      news: colors.primary,
      culture: colors.secondary,
      opinion: colors.secondary,
      torah: colors.success,
      community: colors.warning,
    };
    return colorMap[cat] || colors.primary;
  };

  return (
    <GlassCard className="p-4">
      <div dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Newspaper size={24} color={colors.primary} />
          <h3
            className="text-xl font-bold"
            style={{ color: colors.text, textAlign: isRTL ? 'right' : 'left' }}
          >
            {t('judaism.news.title', 'Jewish News')}
          </h3>
        </div>
        <button
          onClick={handleRefresh}
          className="p-2 rounded-full bg-white/10 cursor-pointer hover:bg-white/20 transition-colors disabled:opacity-50"
          disabled={isRefreshing}
        >
          <RefreshCw
            size={18}
            color={colors.textMuted}
            className={isRefreshing ? 'animate-spin' : ''}
          />
        </button>
      </div>

      {/* Source Filter */}
      {showSourceFilter && sources.length > 0 && (
        <div className="flex gap-2 overflow-x-auto mb-4 pb-2">
          <button
            onClick={() => setSelectedSource(null)}
            className="px-3 py-1.5 rounded-full whitespace-nowrap cursor-pointer hover:opacity-80 transition-opacity"
            style={{ backgroundColor: !selectedSource ? colors.primary : colors.glassLight }}
          >
            <span style={{ color: colors.text, fontSize: 14 }}>{t('common.all', 'All')}</span>
          </button>
          {sources.map((source) => (
            <button
              key={source.id}
              onClick={() => setSelectedSource(source.name)}
              className="px-3 py-1.5 rounded-full whitespace-nowrap cursor-pointer hover:opacity-80 transition-opacity"
              style={{ backgroundColor: selectedSource === source.name ? colors.primary : colors.glassLight }}
            >
              <span style={{ color: colors.text, fontSize: 14 }}>
                {i18n.language === 'he' && source.name_he ? source.name_he : source.name}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* News List */}
      {isLoading ? (
        <div className="py-8 flex justify-center">
          <Loader2 size={32} color={colors.primary} className="animate-spin" />
        </div>
      ) : news.length > 0 ? (
        <div className="max-h-96 overflow-y-auto">
          {news.map((item, index) => (
            <a
              key={item.id}
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className={`block py-3 hover:opacity-80 transition-opacity ${index > 0 ? 'border-t border-white/10' : ''}`}
            >
              <div className={`flex items-start gap-3 `}>
                <div className="flex-1">
                  <div className={`flex items-center gap-2 mb-1 `}>
                    <span
                      className="px-2 py-0.5 rounded"
                      style={{ backgroundColor: getCategoryColor(item.category) }}
                    >
                      <span style={{ color: colors.text, fontSize: 12, fontWeight: 500 }}>{item.source_name}</span>
                    </span>
                    <span style={{ color: colors.textMuted, fontSize: 12 }}>{formatDate(item.published_at)}</span>
                  </div>
                  <p
                    className="font-medium line-clamp-2"
                    style={{ color: colors.text, textAlign: isRTL ? 'right' : 'left' }}
                  >
                    {stripHtml(getLocalizedTitle(item))}
                  </p>
                  {item.summary && (
                    <p
                      className="text-sm mt-1 line-clamp-2"
                      style={{ color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }}
                    >
                      {stripHtml(item.summary)}
                    </p>
                  )}
                </div>
                <ExternalLink size={16} color={colors.textMuted} />
              </div>
            </a>
          ))}
        </div>
      ) : (
        <div className="py-8 flex justify-center">
          <span style={{ color: colors.textMuted }}>{t('judaism.news.empty', 'No news available')}</span>
        </div>
      )}
      </div>
    </GlassCard>
  );
}
