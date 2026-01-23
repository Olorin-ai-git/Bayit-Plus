import { useState } from 'react';
import { View, Text, FlatList, Pressable, Image, useWindowDimensions, StyleSheet } from 'react-native';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Podcast, Headphones, Clock } from 'lucide-react';
import { GlassCard } from '@bayit/shared/ui';
import { SubtitleFlags } from '@bayit/shared/components/SubtitleFlags';
import { colors } from '@bayit/shared/theme';
import { z } from 'zod';

const ShowSchema = z.object({
  id: z.string(),
  title: z.string(),
  cover: z.string().optional(),
  author: z.string().optional(),
  episodeCount: z.number().optional(),
  latestEpisode: z.string().optional(),
  availableLanguages: z.array(z.string()).optional(),
});

const PodcastsPageGridPropsSchema = z.object({
  shows: z.array(ShowSchema),
  loading: z.boolean(),
  searchQuery: z.string(),
});

export type PodcastsPageGridProps = z.infer<typeof PodcastsPageGridPropsSchema>;
export type Show = z.infer<typeof ShowSchema>;

// Show Card Component
function ShowCard({ show, episodesLabel }: { show: Show; episodesLabel: string }) {
  const [isHovered, setIsHovered] = useState(false);
  const { i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';

  return (
    <Link to={`/podcasts/${show.id}`} style={{ textDecoration: 'none', flex: 1 }}>
      <Pressable
        onHoverIn={() => setIsHovered(true)}
        onHoverOut={() => setIsHovered(false)}
      >
        <View className="mx-1">
          <GlassCard
            className="aspect-square mb-2 p-0 overflow-hidden"
            style={[isHovered && styles.cardHovered]}
          >
            {show.cover ? (
              <Image
                source={{ uri: show.cover }}
                className="w-full h-full transition-transform duration-300"
                style={[isHovered ? styles.imageHovered : styles.imageDefault]}
                resizeMode="cover"
              />
            ) : (
              <View className="w-full h-full bg-white/5 justify-center items-center">
                <Podcast size={32} color={colors.success} />
              </View>
            )}

            {/* Language indicator - reuse SubtitleFlags pattern for consistency */}
            {show.availableLanguages && show.availableLanguages.length > 1 && (
              <SubtitleFlags
                languages={show.availableLanguages}
                position="bottom-right"
                isRTL={isRTL}
                size="small"
              />
            )}
          </GlassCard>

          <Text
            className="text-[16px] font-semibold mb-1"
            style={[isHovered ? styles.titleHovered : styles.titleDefault]}
            numberOfLines={1}
          >
            {show.title}
          </Text>

          {show.author && (
            <Text className="text-[14px] text-gray-400 mb-2" numberOfLines={1}>
              {show.author}
            </Text>
          )}

          <View className="flex-row flex-wrap gap-2">
            <View className="flex-row items-center gap-1">
              <Headphones size={12} color={colors.textMuted} />
              <Text className="text-[12px] text-gray-500">
                {show.episodeCount || 0} {episodesLabel}
              </Text>
            </View>
            {show.latestEpisode && (
              <View className="flex-row items-center gap-1">
                <Clock size={12} color={colors.textMuted} />
                <Text className="text-[12px] text-gray-500">
                  {show.latestEpisode}
                </Text>
              </View>
            )}
          </View>
        </View>
      </Pressable>
    </Link>
  );
}

// Skeleton Loading Card
function SkeletonCard() {
  return (
    <View className="flex-1 min-w-[150px] max-w-[20%] mx-1">
      <View className="aspect-square bg-white/5 rounded-2xl" />
    </View>
  );
}

// Empty State Component
function EmptyState({ searchQuery }: { searchQuery: string }) {
  const { t } = useTranslation();

  return (
    <View className="flex-1 justify-center items-center py-24">
      <GlassCard className="p-12 items-center">
        <Podcast size={64} color={colors.textMuted} />
        {searchQuery ? (
          <>
            <Text className="text-[20px] font-semibold text-white mt-4 mb-2">
              {t('common.noResults')}
            </Text>
            <Text className="text-[16px] text-gray-400">
              {t('common.tryDifferentSearch')}
            </Text>
          </>
        ) : (
          <>
            <Text className="text-[20px] font-semibold text-white mt-4 mb-2">
              {t('podcasts.noPodcasts')}
            </Text>
            <Text className="text-[16px] text-gray-400">
              {t('podcasts.tryLater')}
            </Text>
          </>
        )}
      </GlassCard>
    </View>
  );
}

export default function PodcastsPageGrid({
  shows,
  loading,
  searchQuery,
}: PodcastsPageGridProps) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const episodesLabel = t('podcasts.episodes');

  const numColumns = width >= 1280 ? 5 : width >= 1024 ? 4 : width >= 768 ? 3 : 2;

  if (loading) {
    return (
      <View className="flex-row flex-wrap gap-4">
        {[...Array(10)].map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </View>
    );
  }

  return (
    <FlatList
      data={shows}
      keyExtractor={(item) => item.id}
      numColumns={numColumns}
      key={numColumns}
      contentContainerStyle={{ gap: 16 }}
      columnWrapperStyle={numColumns > 1 ? { gap: 16 } : undefined}
      renderItem={({ item }) => (
        <View style={{ flex: 1, maxWidth: `${100 / numColumns}%` }}>
          <ShowCard show={item} episodesLabel={episodesLabel} />
        </View>
      )}
      ListEmptyComponent={<EmptyState searchQuery={searchQuery} />}
    />
  );
}

const styles = StyleSheet.create({
  cardHovered: {
    shadowColor: 'rgba(16, 185, 129, 0.3)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 32,
  },
  imageHovered: {
    transform: [{ scale: 1.05 }],
  },
  imageDefault: {
    transform: [{ scale: 1 }],
  },
  titleHovered: {
    color: colors.primary,
  },
  titleDefault: {
    color: '#ffffff',
  },
});
