import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Image, ActivityIndicator, useWindowDimensions } from 'react-native';
import { Link } from 'react-router-dom';
import { Radio, Volume2, Play } from 'lucide-react';
import { radioService } from '@/services/api';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import { GlassCard, GlassView, GlassBadge } from '@bayit/shared/ui';
import logger from '@/utils/logger';

interface Station {
  id: string;
  name: string;
  logo?: string;
  currentShow?: string;
  genre?: string;
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
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const { width } = useWindowDimensions();

  const numColumns = width >= 1024 ? 4 : width >= 768 ? 3 : 2;

  useEffect(() => {
    loadStations();
  }, []);

  const loadStations = async () => {
    try {
      const data = await radioService.getStations();
      setStations(data.stations);
    } catch (error) {
      logger.error('Failed to load stations', 'RadioPage', error);
    } finally {
      setLoading(false);
    }
  };

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
      <View style={styles.header}>
        <GlassView style={styles.headerIcon}>
          <Radio size={24} color={colors.secondary} />
        </GlassView>
        <Text style={styles.title}>תחנות רדיו</Text>
      </View>

      {/* Stations Grid */}
      <FlatList
        data={stations}
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
              <Text style={styles.emptyTitle}>אין תחנות רדיו זמינות</Text>
              <Text style={styles.emptyDescription}>נסה שוב מאוחר יותר</Text>
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
