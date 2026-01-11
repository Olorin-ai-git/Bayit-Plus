import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ScrollView, useWindowDimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@/hooks/useDirection';
import { Radio } from 'lucide-react';
import { liveService } from '@/services/api';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import { GlassView, GlassCard, GlassCategoryPill, GlassLiveChannelCard } from '@bayit/shared/ui';
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
        <FlatList
          data={[...Array(10)]}
          keyExtractor={(_, i) => `skeleton-${i}`}
          numColumns={numColumns}
          key={numColumns}
          contentContainerStyle={styles.gridContent}
          columnWrapperStyle={numColumns > 1 ? styles.row : undefined}
          renderItem={() => (
            <View style={{ flex: 1, maxWidth: `${100 / numColumns}%`, padding: spacing.xs }}>
              <View style={styles.skeletonCard} />
            </View>
          )}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { flexDirection, justifyContent }]}>
        <GlassView style={styles.headerIcon}>
          <Radio size={24} color={colors.error} />
        </GlassView>
        <Text style={[styles.title, { textAlign }]}>{t('live.title')}</Text>
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
          emoji="📺"
          isActive={selectedCategory === 'all'}
          onPress={() => setSelectedCategory('all')}
        />
        <GlassCategoryPill
          label={t('live.categories.news')}
          emoji="📰"
          isActive={selectedCategory === 'news'}
          onPress={() => setSelectedCategory('news')}
        />
        <GlassCategoryPill
          label={t('live.categories.entertainment')}
          emoji="🎬"
          isActive={selectedCategory === 'entertainment'}
          onPress={() => setSelectedCategory('entertainment')}
        />
        <GlassCategoryPill
          label={t('live.categories.sports')}
          emoji="⚽"
          isActive={selectedCategory === 'sports'}
          onPress={() => setSelectedCategory('sports')}
        />
        <GlassCategoryPill
          label={t('live.categories.kids')}
          emoji="👶"
          isActive={selectedCategory === 'kids'}
          onPress={() => setSelectedCategory('kids')}
        />
        <GlassCategoryPill
          label={t('live.categories.music')}
          emoji="🎵"
          isActive={selectedCategory === 'music'}
          onPress={() => setSelectedCategory('music')}
        />
      </ScrollView>

      {/* Channels Grid */}
      <FlatList
        data={filteredChannels}
        keyExtractor={(item) => item.id}
        numColumns={numColumns}
        key={numColumns}
        contentContainerStyle={styles.gridContent}
        columnWrapperStyle={numColumns > 1 ? styles.row : undefined}
        renderItem={({ item }) => (
          <View style={{ flex: 1, maxWidth: `${100 / numColumns}%`, padding: spacing.xs }}>
            <GlassLiveChannelCard
              channel={item}
              liveLabel={liveLabel}
              onPress={() => window.location.href = `/live/${item.id}`}
            />
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <GlassCard style={styles.emptyCard}>
              <Radio size={64} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>{t('live.noChannels')}</Text>
              <Text style={styles.emptyDescription}>{t('live.tryLater')}</Text>
            </GlassCard>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
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
  },
  categoriesScroll: {
    marginBottom: spacing.lg,
  },
  categoriesContent: {
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  gridContent: {
    gap: spacing.md,
  },
  row: {
    gap: spacing.md,
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
