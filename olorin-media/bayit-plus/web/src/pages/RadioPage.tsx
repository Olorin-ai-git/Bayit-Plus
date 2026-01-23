import { useState, useEffect } from 'react';
import { View, Text, FlatList, Pressable, Image, ActivityIndicator, ScrollView, useWindowDimensions, StyleSheet } from 'react-native';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@/hooks/useDirection';
import { Radio, Volume2, Play } from 'lucide-react';
import { radioService } from '@/services/api';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import { GlassCard, GlassView, GlassBadge, GlassCategoryPill } from '@bayit/shared/ui';
import { getLocalizedName } from '@bayit/shared-utils/contentLocalization';
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
        <GlassCard
          style={[
            styles.stationCard,
            isHovered && styles.stationCardHovered
          ]}
        >
          <View style={styles.logoContainer}>
            {station.logo ? (
              <Image
                source={{ uri: station.logo }}
                style={styles.logoImage}
                resizeMode="contain"
              />
            ) : (
              <View style={styles.logoPlaceholder}>
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
          <Text
            style={[
              styles.stationName,
              isHovered && styles.stationNameHovered
            ]}
            numberOfLines={1}
          >
            {station.name}
          </Text>
          {station.currentShow && (
            <View style={styles.currentShowContainer}>
              <Volume2 size={14} color={colors.textSecondary} />
              <Text style={styles.currentShowText} numberOfLines={1}>
                {station.currentShow}
              </Text>
            </View>
          )}
          {station.genre && (
            <View style={styles.genreBadgeContainer}>
              <GlassBadge size="sm">
                {station.genre}
              </GlassBadge>
            </View>
          )}
        </GlassCard>
      </Pressable>
    </Link>
  );
}

function SkeletonCard() {
  return (
    <View style={styles.skeletonContainer}>
      <View style={styles.skeletonImage} />
      <View style={styles.skeletonText} />
    </View>
  );
}

export default function RadioPage() {
  const { t, i18n } = useTranslation();
  const { isRTL, textAlign, flexDirection, justifyContent } = useDirection();
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
        <View style={styles.loadingTitleSkeleton} />
        <View style={styles.loadingGrid}>
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
      <View style={[styles.header, { flexDirection, justifyContent }]}>
        <GlassView style={styles.headerIcon}>
          <Radio size={24} color={colors.secondary} />
        </GlassView>
        <Text style={[styles.title, { textAlign }]}>{t('radio.title')}</Text>
      </View>

      {/* Category Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
        contentContainerStyle={styles.categoryScrollContent}
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
            label={getLocalizedName(category, i18n.language)}
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
        contentContainerStyle={{ gap: spacing.md }}
        columnWrapperStyle={numColumns > 1 ? { gap: spacing.md } : undefined}
        renderItem={({ item }) => (
          <View style={{ flex: 1, maxWidth: `${100 / numColumns}%` }}>
            <StationCard station={item} />
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyStateContainer}>
            <GlassCard style={styles.emptyStateCard}>
              <Radio size={64} color={colors.textMuted} />
              <Text style={styles.emptyStateTitle}>{t('radio.noStations')}</Text>
              <Text style={styles.emptyStateSubtitle}>{t('radio.tryLater')}</Text>
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
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    maxWidth: 1280,
    marginHorizontal: 'auto',
    width: '100%',
  },

  // Header Styles
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: colors.text,
  },

  // Category Scroll Styles
  categoryScroll: {
    marginBottom: spacing.xl,
  },
  categoryScrollContent: {
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },

  // Station Card Styles
  stationCard: {
    padding: spacing.lg,
    margin: spacing.xs,
  },
  stationCardHovered: {
    transform: [{ translateY: -4 }],
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 32,
    elevation: 8,
  },
  logoContainer: {
    aspectRatio: 1,
    marginBottom: spacing.lg,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    position: 'relative',
  },
  logoImage: {
    width: '100%',
    height: '100%',
    borderRadius: borderRadius.md,
  },
  logoPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: borderRadius.md,
  },
  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: borderRadius.md,
  },
  playButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.secondary,
    shadowColor: colors.secondary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 20,
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
  currentShowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  currentShowText: {
    fontSize: 14,
    color: colors.textSecondary,
    flex: 1,
  },
  genreBadgeContainer: {
    marginTop: spacing.sm,
  },

  // Skeleton Styles
  skeletonContainer: {
    flex: 1,
    margin: spacing.xs,
    minWidth: 150,
    maxWidth: '25%',
  },
  skeletonImage: {
    aspectRatio: 1,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.glass,
  },
  skeletonText: {
    height: 20,
    borderRadius: borderRadius.sm,
    width: '80%',
    backgroundColor: colors.glass,
  },

  // Loading Styles
  loadingTitleSkeleton: {
    width: 192,
    height: 32,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xl,
    backgroundColor: colors.glass,
  },
  loadingGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
  },

  // Empty State Styles
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 96,
  },
  emptyStateCard: {
    padding: 48,
    alignItems: 'center',
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  emptyStateSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
  },
});
