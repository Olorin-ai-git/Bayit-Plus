import { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, Image, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useDirection } from '@/hooks/useDirection';
import { useResponsive } from '@/hooks/useResponsive';
import { liveService } from '@/services/api';
import { colors, spacing, fontSize, borderRadius } from '@olorin/design-tokens';
import {
  GlassCard,
  GlassCategoryPill,
  GlassPageHeader,
  GlassEmptyState,
} from '@bayit/shared/ui';
import AnimatedCard from '@/components/common/AnimatedCard';
import { AIEnhancedBadge } from '@/components/content';
import WidgetToggleButton from '@/components/content/WidgetToggleButton';
import { WidgetToggleProvider } from '@/contexts/WidgetToggleContext';
import logger from '@/utils/logger';
import PageLoading from '@/components/common/PageLoading';

// Live TV Icon Component (React Native Web compatible)
// Broadcast/Radio waves icon
const LiveTVIcon = ({ size = 24, color = colors.error.DEFAULT }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {/* Center dot */}
    <circle cx="12" cy="12" r="2" fill={color} />
    {/* Inner wave */}
    <path d="M15 9a4 4 0 0 0-6 0m6 6a4 4 0 0 1-6 0" />
    {/* Outer wave */}
    <path d="M18 6a8 8 0 0 0-12 0m12 12a8 8 0 0 1-12 0" />
  </svg>
);

interface Channel {
  id: string;
  name: string;
  thumbnail?: string;
  logo?: string;
  currentShow?: string;
  nextShow?: string;
  category?: string;
  stream_type?: string;
  is_ai_enhanced?: boolean;
  ai_features?: string[];
  supports_pip_widget?: boolean;
}

export default function LivePage() {
  const { t } = useTranslation();
  const { isRTL, textAlign, flexDirection, justifyContent } = useDirection();
  const responsive = useResponsive();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const numColumns = responsive.getColumns();

  // Collect items for widget toggle batch-check
  const widgetItems = useMemo(() => {
    return channels.map((channel) => ({
      content_type: 'live_channel',
      content_id: channel.id,
    }));
  }, [channels]);

  useEffect(() => {
    loadChannels();
  }, []);

  const loadChannels = async () => {
    try {
      const data = await liveService.getChannels();
      setChannels(data.channels || []);
    } catch (error) {
      logger.error('Failed to load channels', 'LivePage', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredChannels = selectedCategory === 'all'
    ? channels
    : channels.filter(c => c.category === selectedCategory);

  if (loading) {
    return (
      <PageLoading
        title={t('live.title')}
        pageType="live"
        message={t('live.loadingChannels', 'Loading channels...')}
        isRTL={isRTL}
        icon={<LiveTVIcon size={24} color={colors.error.DEFAULT} />}
      />
    );
  }

  return (
    <WidgetToggleProvider items={widgetItems}>
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
      <View style={styles.container}>
        {/* Header */}
        <GlassPageHeader
          title={t('live.title')}
          pageType="live"
          badge={filteredChannels.length}
          icon={<LiveTVIcon size={24} color={colors.error.DEFAULT} />}
          isRTL={isRTL}
        />

        {/* Category Filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryScroll}
          contentContainerStyle={styles.categoryContent}
        >
          <GlassCategoryPill
            label={t('live.categories.all')}
            isActive={selectedCategory === 'all'}
            onPress={() => setSelectedCategory('all')}
          />
          <GlassCategoryPill
            label={t('live.categories.news')}
            isActive={selectedCategory === 'news'}
            onPress={() => setSelectedCategory('news')}
          />
          <GlassCategoryPill
            label={t('live.categories.entertainment')}
            isActive={selectedCategory === 'entertainment'}
            onPress={() => setSelectedCategory('entertainment')}
          />
          <GlassCategoryPill
            label={t('live.categories.sports')}
            isActive={selectedCategory === 'sports'}
            onPress={() => setSelectedCategory('sports')}
          />
          <GlassCategoryPill
            label={t('live.categories.kids')}
            isActive={selectedCategory === 'kids'}
            onPress={() => setSelectedCategory('kids')}
          />
          <GlassCategoryPill
            label={t('live.categories.music')}
            isActive={selectedCategory === 'music'}
            onPress={() => setSelectedCategory('music')}
          />
          <GlassCategoryPill
            label={t('liveCategories.educational')}
            isActive={selectedCategory === 'educational'}
            onPress={() => setSelectedCategory('educational')}
          />
        </ScrollView>

        {/* Channels Grid */}
        {filteredChannels.length > 0 ? (
          <View style={styles.gridContainer}>
            {filteredChannels.map((channel, index) => (
              <AnimatedCard
                key={channel.id}
                index={index}
                variant="grid"
                style={{ width: `${100 / numColumns}%`, padding: spacing.xs } as any}
              >
                <View style={styles.channelCardWrapper}>
                  <GlassCard autoSize style={styles.channelCard} onPress={() => navigate(`/live/${channel.id}`)}>
                    {/* Channel Thumbnail */}
                    <View style={styles.channelThumbnail}>
                      {(channel.thumbnail || channel.logo) ? (
                        <Image
                          source={{ uri: channel.thumbnail || channel.logo }}
                          style={styles.channelImage}
                          resizeMode="contain"
                        />
                      ) : (
                        <View style={styles.channelPlaceholder}>
                          <LiveTVIcon size={32} color={colors.textMuted} />
                        </View>
                      )}
                    </View>
                    {/* Channel Info */}
                    <View style={styles.channelInfo}>
                      <Text style={styles.channelName} numberOfLines={1}>
                        {channel.name}
                      </Text>
                      {channel.currentShow && (
                        <Text style={styles.channelShow} numberOfLines={1}>
                          {channel.currentShow}
                        </Text>
                      )}
                    </View>
                  </GlassCard>
                  {/* AI Enhanced Badge for educational channels */}
                  {channel.is_ai_enhanced && (
                    <View style={styles.aiEnhancedBadgeWrapper}>
                      <AIEnhancedBadge features={channel.ai_features} size="small" />
                    </View>
                  )}
                  {/* Widget Toggle */}
                  <View style={styles.widgetButtonWrapper}>
                    <WidgetToggleButton
                      contentType="live_channel"
                      contentId={channel.id}
                      title={channel.name}
                      coverUrl={channel.thumbnail || channel.logo}
                    />
                  </View>
                </View>
              </AnimatedCard>
            ))}
          </View>
        ) : (
          <GlassEmptyState
            variant="no-content"
            contentType="live"
            icon={<LiveTVIcon size={72} color={colors.textMuted} />}
            title={t('live.noChannels')}
            description={t('live.tryLater')}
          />
        )}
      </View>
    </ScrollView>
    </WidgetToggleProvider>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    maxWidth: 1400,
    marginHorizontal: 'auto',
    width: '100%',
  },
  categoriesSkeleton: {
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
  },
  categoryScroll: {
    marginBottom: spacing.lg,
    maxHeight: 56, // Fixed height to prevent stretching
  },
  categoryContent: {
    gap: spacing.sm,
    paddingBottom: spacing.sm,
    alignItems: 'center', // Center vertically
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  channelCardWrapper: {
    position: 'relative',
  },
  channelCard: {
    width: '100%',
    overflow: 'hidden',
    padding: 0,
  },
  channelThumbnail: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  channelImage: {
    width: '80%',
    height: '80%',
  },
  channelPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  channelInfo: {
    padding: spacing.sm,
  },
  channelName: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  channelShow: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
  widgetButtonWrapper: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    zIndex: 10,
  },
  aiEnhancedBadgeWrapper: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    zIndex: 10,
  },
  skeletonHeader: {
    width: 192,
    height: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
  },
  skeletonCard: {
    aspectRatio: 16 / 9,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: borderRadius['2xl'],
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyCard: {
    padding: spacing['3xl'],
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: fontSize.xl,
    fontWeight: '600',
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontSize: fontSize.base,
    color: 'rgba(255, 255, 255, 0.7)',
  },
});
