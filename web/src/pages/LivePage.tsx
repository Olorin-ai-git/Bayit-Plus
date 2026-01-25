import { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useDirection } from '@/hooks/useDirection';
import { liveService } from '@/services/api';
import { colors, spacing, fontSize, borderRadius } from '@olorin/design-tokens';
import {
  GlassView,
  GlassCard,
  GlassCategoryPill,
  GlassLiveChannelCard,
  GlassPageHeader,
  GridSkeleton,
} from '@bayit/shared/ui';
import AnimatedCard from '@/components/common/AnimatedCard';
import { LoadingState, EmptyState } from '@bayit/shared/components/states';
import logger from '@/utils/logger';

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
}

export default function LivePage() {
  const { t } = useTranslation();
  const { isRTL, textAlign, flexDirection, justifyContent } = useDirection();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const { width } = useWindowDimensions();
  const nextLabel = t('live.next');
  const liveLabel = t('common.live');

  const numColumns = width >= 1280 ? 5 : width >= 1024 ? 4 : width >= 768 ? 3 : 2;

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
      <View style={styles.container}>
        <GlassPageHeader
          title={t('live.title')}
          pageType="live"
          isRTL={isRTL}
        />
        <View style={styles.categoriesSkeleton} />
        <GridSkeleton numColumns={numColumns} numRows={2} />
      </View>
    );
  }

  return (
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
                <Link to={`/live/${channel.id}`} style={{ textDecoration: 'none' }}>
                  <GlassLiveChannelCard
                    channel={channel}
                    liveLabel={liveLabel}
                  />
                </Link>
              </AnimatedCard>
            ))}
          </View>
        ) : (
          <EmptyState
            icon={<LiveTVIcon size={72} color={colors.textMuted} />}
            title={t('live.noChannels')}
            description={t('live.tryLater')}
          />
        )}
      </View>
    </ScrollView>
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
