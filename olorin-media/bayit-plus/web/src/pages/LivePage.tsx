import { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useDirection } from '@/hooks/useDirection';
import { Radio } from 'lucide-react';
import { liveService } from '@/services/api';
import { colors, spacing, fontSize, borderRadius } from '@bayit/shared/theme';
import { GlassView, GlassCard, GlassCategoryPill, GlassLiveChannelCard } from '@bayit/shared/ui';
import AnimatedCard from '@/components/common/AnimatedCard';
import { LoadingState, EmptyState } from '@bayit/shared/components/states';
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
      <LoadingState
        message={t('live.loading', 'Loading live channels...')}
        spinnerColor={colors.error}
      />
    );
  }

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
      <View style={styles.container}>
        {/* Header */}
        <View style={[
          styles.header,
          flexDirection === 'row-reverse' && styles.headerRTL,
          justifyContent === 'flex-end' && styles.headerJustifyEnd
        ]}>
          <GlassView style={styles.iconContainer}>
            <Radio size={24} color={colors.error} />
          </GlassView>
          <Text style={[
            styles.title,
            textAlign === 'right' && styles.titleRight
          ]}>
            {t('live.title')}
          </Text>
          {filteredChannels.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{filteredChannels.length}</Text>
            </View>
          )}
        </View>

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
            icon={<Radio size={72} color={colors.textMuted} />}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  headerRTL: {
    flexDirection: 'row-reverse',
  },
  headerJustifyEnd: {
    justifyContent: 'flex-end',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  title: {
    fontSize: fontSize['3xl'],
    fontWeight: 'bold',
    color: colors.text,
    flex: 1,
  },
  titleRight: {
    textAlign: 'right',
  },
  badge: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  badgeText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  categoryScroll: {
    marginBottom: spacing.lg,
  },
  categoryContent: {
    gap: spacing.sm,
    paddingBottom: spacing.sm,
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
