import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, useWindowDimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useDirection } from '@/hooks/useDirection';
import { Radio } from 'lucide-react';
import { liveService } from '@/services/api';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import { GlassView, GlassCard, GlassCategoryPill, GlassLiveChannelCard } from '@bayit/shared/ui';
import AnimatedCard from '@/components/common/AnimatedCard';
import logger from '@/utils/logger';

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
        <View style={styles.skeletonHeader} />
        <View style={styles.grid}>
          {[...Array(10)].map((_, index) => (
            <View key={`skeleton-${index}`} style={{ width: `${100 / numColumns}%`, padding: spacing.xs }}>
              <View style={styles.skeletonCard} />
            </View>
          ))}
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
      <View style={styles.container}>
        {/* Header */}
        <View style={[styles.header, { flexDirection, justifyContent }]}>
          <GlassView style={styles.headerIcon}>
            <Radio size={24} color={colors.error} />
          </GlassView>
          <Text style={[styles.title, { textAlign }]}>{t('live.title')}</Text>
          {filteredChannels.length > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{filteredChannels.length}</Text>
            </View>
          )}
        </View>

      {/* Category Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesScroll}
        contentContainerStyle={styles.categoriesContent}
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
        <View style={styles.grid}>
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
        <View style={styles.emptyState}>
          <GlassCard style={styles.emptyCard}>
            <Radio size={64} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>{t('live.noChannels')}</Text>
            <Text style={styles.emptyDescription}>{t('live.tryLater')}</Text>
          </GlassCard>
        </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text,
    flex: 1,
  },
  countBadge: {
    backgroundColor: colors.glass,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  countText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  categoriesScroll: {
    marginBottom: spacing.lg,
  },
  categoriesContent: {
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyCard: {
    padding: spacing.xl * 1.5,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  emptyDescription: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  // Skeleton styles
  skeletonHeader: {
    width: 192,
    height: 32,
    backgroundColor: colors.glass,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
  },
  skeletonCard: {
    aspectRatio: 16 / 9,
    backgroundColor: colors.glass,
    borderRadius: borderRadius.xl,
  },
});
