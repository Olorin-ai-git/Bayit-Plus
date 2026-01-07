import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Image, ActivityIndicator, ScrollView, useWindowDimensions } from 'react-native';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@/hooks/useDirection';
import { Radio, Volume2, Play } from 'lucide-react';
import { radioService } from '@/services/api';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import { GlassCard, GlassView, GlassBadge, GlassCategoryPill } from '@bayit/shared/ui';
import logger from '@/utils/logger';

interface Category {
  id: string;
  name: string;
}

interface Station {
  id: string;
  name: string;
  logo?: string;
  currentShow?: string;
  genre?: string;
  category?: string;
}

function StationCard({ station }: { station: Station }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Link to={`/radio/${station.id}`} style={{ textDecoration: 'none', flex: 1 }}>
      <Pressable
        onHoverIn={() => setIsHovered(true)}
        onHoverOut={() => setIsHovered(false)}
      >
        <GlassCard style={[styles.stationCard, isHovered && styles.stationCardHovered]}>
          <View style={styles.imageContainer}>
            {station.logo ? (
              <Image
                source={{ uri: station.logo }}
                style={styles.stationImage}
                resizeMode="contain"
              />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Radio size={32} color={colors.secondary} />
              </View>
            )}
            {isHovered && (
              <View style={styles.playOverlay}>
                <View style={styles.playButton}>
                  <Play size={28} color={colors.text} fill={colors.text} />
                </View>
              </View>
            )}
          </View>
          <Text style={[styles.stationName, isHovered && styles.stationNameHovered]} numberOfLines={1}>
            {station.name}
          </Text>
          {station.currentShow && (
            <View style={styles.currentShowRow}>
              <Volume2 size={14} color={colors.textSecondary} />
              <Text style={styles.currentShow} numberOfLines={1}>
                {station.currentShow}
              </Text>
            </View>
          )}
          {station.genre && (
            <GlassBadge size="sm" style={styles.genreBadge}>
              {station.genre}
            </GlassBadge>
          )}
        </GlassCard>
      </Pressable>
    </Link>
  );
}

function SkeletonCard() {
  return (
    <View style={styles.skeletonCard}>
      <View style={styles.skeletonImage} />
      <View style={styles.skeletonText} />
    </View>
  );
}

export default function RadioPage() {
  const { t } = useTranslation();
  const { isRTL, textAlign, flexDirection } = useDirection();
  const [stations, setStations] = useState<Station[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const { width } = useWindowDimensions();

  const numColumns = width >= 1024 ? 4 : width >= 768 ? 3 : 2;

  useEffect(() => {
    loadStations();
  }, [selectedCategory]);

  const loadStations = async () => {
    try {
      const data = await radioService.getStations({
        category: selectedCategory !== 'all' ? selectedCategory : undefined,
      });
      setStations(data.stations || []);
      if (data.categories) {
        setCategories(data.categories);
      }
    } catch (error) {
      logger.error('Failed to load stations', 'RadioPage', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredStations = selectedCategory === 'all'
    ? stations
    : stations.filter(s => s.genre === selectedCategory || s.category === selectedCategory);

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.skeletonHeader} />
        <View style={styles.grid}>
          {[...Array(8)].map((_, i) => (
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
          <Radio size={24} color={colors.secondary} />
        </GlassView>
        <Text style={[styles.title, { textAlign }]}>{t('radio.title')}</Text>
      </View>

      {/* Category Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesScroll}
        contentContainerStyle={styles.categoriesContent}
      >
        <GlassCategoryPill
          label={t('radio.categories.all')}
          emoji="📻"
          isActive={selectedCategory === 'all'}
          onPress={() => setSelectedCategory('all')}
        />
        <GlassCategoryPill
          label={t('radio.categories.music')}
          emoji="🎵"
          isActive={selectedCategory === 'music'}
          onPress={() => setSelectedCategory('music')}
        />
        <GlassCategoryPill
          label={t('radio.categories.news')}
          emoji="📰"
          isActive={selectedCategory === 'news'}
          onPress={() => setSelectedCategory('news')}
        />
        <GlassCategoryPill
          label={t('radio.categories.talk')}
          emoji="🎙️"
          isActive={selectedCategory === 'talk'}
          onPress={() => setSelectedCategory('talk')}
        />
        <GlassCategoryPill
          label={t('radio.categories.jewish')}
          emoji="✡️"
          isActive={selectedCategory === 'jewish'}
          onPress={() => setSelectedCategory('jewish')}
        />
        {categories.map((category) => (
          <GlassCategoryPill
            key={category.id}
            label={category.name}
            isActive={selectedCategory === category.id}
            onPress={() => setSelectedCategory(category.id)}
          />
        ))}
      </ScrollView>

      {/* Stations Grid */}
      <FlatList
        data={filteredStations}
        keyExtractor={(item) => item.id}
        numColumns={numColumns}
        key={numColumns}
        contentContainerStyle={styles.gridContent}
        columnWrapperStyle={numColumns > 1 ? styles.row : undefined}
        renderItem={({ item }) => (
          <View style={{ flex: 1, maxWidth: `${100 / numColumns}%` }}>
            <StationCard station={item} />
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <GlassCard style={styles.emptyCard}>
              <Radio size={64} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>{t('radio.noStations')}</Text>
              <Text style={styles.emptyDescription}>{t('radio.tryLater')}</Text>
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
    maxWidth: 1280,
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
  stationCard: {
    padding: spacing.md,
    margin: spacing.xs,
  },
  stationCardHovered: {
    transform: [{ translateY: -4 }],
    // @ts-ignore
    boxShadow: `0 8px 32px rgba(0, 217, 255, 0.2)`,
  },
  imageContainer: {
    aspectRatio: 1,
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    position: 'relative',
  },
  stationImage: {
    width: '100%',
    height: '100%',
    borderRadius: borderRadius.lg,
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.glass,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
  },
  playButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    // @ts-ignore
    boxShadow: `0 0 20px ${colors.secondary}`,
  },
  stationName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  stationNameHovered: {
    color: colors.primary,
  },
  currentShowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  currentShow: {
    fontSize: 14,
    color: colors.textSecondary,
    flex: 1,
  },
  genreBadge: {
    marginTop: spacing.sm,
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
    maxWidth: '25%',
  },
  skeletonImage: {
    aspectRatio: 1,
    backgroundColor: colors.glass,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
  },
  skeletonText: {
    height: 20,
    backgroundColor: colors.glass,
    borderRadius: borderRadius.sm,
    width: '80%',
  },
});
