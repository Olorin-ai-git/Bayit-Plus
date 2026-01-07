import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Image, ScrollView, useWindowDimensions } from 'react-native';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@/hooks/useDirection';
import { Radio, Clock } from 'lucide-react';
import { liveService } from '@/services/api';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import { GlassView, GlassCard, GlassBadge, GlassCategoryPill } from '@bayit/shared/ui';
import LinearGradient from 'react-native-linear-gradient';
import logger from '@/utils/logger';

interface Channel {
  id: string;
  name: string;
  thumbnail?: string;
  currentShow?: string;
  nextShow?: string;
  category?: string;
}

function ChannelCard({ channel, nextLabel }: { channel: Channel; nextLabel: string }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Link to={`/live/${channel.id}`} style={{ textDecoration: 'none', flex: 1 }}>
      <Pressable
        onHoverIn={() => setIsHovered(true)}
        onHoverOut={() => setIsHovered(false)}
      >
        <GlassCard style={[styles.channelCard, isHovered && styles.channelCardHovered]}>
          <View style={styles.thumbnailContainer}>
            {channel.thumbnail ? (
              <Image
                source={{ uri: channel.thumbnail }}
                style={styles.thumbnail}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.thumbnailPlaceholder}>
                <Radio size={32} color={colors.textMuted} />
              </View>
            )}
            <LinearGradient
              colors={['transparent', 'rgba(10, 10, 20, 0.9)']}
              style={styles.gradient}
            />

            {/* Live Badge */}
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>

            {/* Channel Info */}
            <View style={styles.channelInfo}>
              <Text style={[styles.channelName, isHovered && styles.channelNameHovered]} numberOfLines={1}>
                {channel.name}
              </Text>
              {channel.currentShow && (
                <Text style={styles.currentShow} numberOfLines={1}>
                  {channel.currentShow}
                </Text>
              )}
              {channel.nextShow && (
                <View style={styles.nextShowRow}>
                  <Clock size={12} color={colors.textMuted} />
                  <Text style={styles.nextShow}>{nextLabel} {channel.nextShow}</Text>
                </View>
              )}
            </View>
          </View>
        </GlassCard>
      </Pressable>
    </Link>
  );
}

function SkeletonCard() {
  return (
    <View style={styles.skeletonCard}>
      <View style={styles.skeletonThumbnail} />
    </View>
  );
}

export default function LivePage() {
  const { t } = useTranslation();
  const { isRTL, textAlign, flexDirection } = useDirection();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const { width } = useWindowDimensions();
  const nextLabel = t('live.next');

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
          {[...Array(10)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { flexDirection }]}>
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
          <View style={{ flex: 1, maxWidth: `${100 / numColumns}%` }}>
            <ChannelCard channel={item} nextLabel={nextLabel} />
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  gridContent: {
    gap: spacing.md,
  },
  row: {
    gap: spacing.md,
  },
  channelCard: {
    padding: 0,
    margin: spacing.xs,
    overflow: 'hidden',
  },
  channelCardHovered: {
    transform: [{ scale: 1.02 }],
    // @ts-ignore
    boxShadow: `0 8px 32px rgba(0, 217, 255, 0.2)`,
  },
  thumbnailContainer: {
    aspectRatio: 16 / 9,
    position: 'relative',
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  thumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.glass,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  liveBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.error,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.text,
  },
  liveText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.text,
  },
  channelInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.md,
  },
  channelName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  channelNameHovered: {
    color: colors.primary,
  },
  currentShow: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  nextShowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  nextShow: {
    fontSize: 12,
    color: colors.textMuted,
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
    flex: 1,
    margin: spacing.xs,
    minWidth: 150,
    maxWidth: '20%',
  },
  skeletonThumbnail: {
    aspectRatio: 16 / 9,
    backgroundColor: colors.glass,
    borderRadius: borderRadius.lg,
  },
});
