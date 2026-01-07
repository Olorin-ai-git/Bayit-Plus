import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image, FlatList, useWindowDimensions } from 'react-native';
import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import ContentCarousel from '@/components/content/ContentCarousel';
import HeroSection from '@/components/content/HeroSection';
import DualClock from '@/components/zman/DualClock';
import TrendingRow from '@/components/trending/TrendingRow';
import MorningRitual from '@/components/ritual/MorningRitual';
import AnimatedLogo from '@/components/ui/AnimatedLogo';
import { contentService, liveService, historyService, ritualService } from '@/services/api';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import { GlassCard } from '@bayit/shared/ui';
import LinearGradient from 'react-native-linear-gradient';
import logger from '@/utils/logger';

interface Channel {
  id: string;
  name: string;
  thumbnail?: string;
  currentShow?: string;
}

interface Category {
  id: string;
  name: string;
  items: any[];
}

export default function HomePage() {
  const [featured, setFeatured] = useState<any>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [liveChannels, setLiveChannels] = useState<Channel[]>([]);
  const [continueWatching, setContinueWatching] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMorningRitual, setShowMorningRitual] = useState(false);
  const { width } = useWindowDimensions();

  const liveColumnsCount = width >= 1024 ? 6 : width >= 768 ? 4 : width >= 640 ? 3 : 2;

  useEffect(() => {
    checkMorningRitual();
    loadHomeContent();
  }, []);

  const checkMorningRitual = async () => {
    try {
      const result = await ritualService.shouldShow();
      if (result.show_ritual) {
        setShowMorningRitual(true);
      }
    } catch (err) {
      logger.debug('Morning ritual check failed', 'HomePage', err);
    }
  };

  const loadHomeContent = async () => {
    try {
      const [featuredData, categoriesData, liveData, continueData] = await Promise.all([
        contentService.getFeatured(),
        contentService.getCategories(),
        liveService.getChannels(),
        historyService.getContinueWatching().catch(() => ({ items: [] })),
      ]);

      setFeatured(featuredData.hero);
      setCategories(categoriesData.categories);
      setLiveChannels(liveData.channels);
      setContinueWatching(continueData.items);
    } catch (error) {
      logger.error('Failed to load home content', 'HomePage', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <HomePageSkeleton />;
  }

  if (showMorningRitual) {
    return (
      <MorningRitual
        onComplete={() => setShowMorningRitual(false)}
        onSkip={() => setShowMorningRitual(false)}
      />
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header with Animated Logo */}
      <View style={styles.logoContainer}>
        <AnimatedLogo size="large" />
      </View>

      {/* Dual Clock - Israel Time */}
      <View style={styles.clockContainer}>
        <DualClock />
      </View>

      {/* Hero Section */}
      {featured && <HeroSection content={featured} />}

      {/* Trending in Israel */}
      <View style={styles.section}>
        <TrendingRow />
      </View>

      {/* Continue Watching */}
      {continueWatching.length > 0 && (
        <ContentCarousel
          title="המשך לצפות"
          items={continueWatching}
          style={styles.carousel}
        />
      )}

      {/* Live TV Preview */}
      {liveChannels.length > 0 && (
        <View style={styles.liveSection}>
          <View style={styles.sectionHeader}>
            <View style={styles.liveTitleRow}>
              <View style={styles.liveBadge}>
                <View style={styles.liveDot} />
                <Text style={styles.liveBadgeText}>LIVE</Text>
              </View>
              <Text style={styles.sectionTitle}>שידור חי</Text>
            </View>
            <Link to="/live" style={{ textDecoration: 'none' }}>
              <View style={styles.seeAllButton}>
                <Text style={styles.seeAllText}>לכל הערוצים</Text>
                <ChevronLeft size={16} color={colors.primary} />
              </View>
            </Link>
          </View>
          <View style={[styles.liveGrid, { maxWidth: liveColumnsCount * 200 + (liveColumnsCount - 1) * spacing.md }]}>
            {liveChannels.slice(0, 6).map((channel) => (
              <Link key={channel.id} to={`/live/${channel.id}`} style={{ textDecoration: 'none', flex: 1 }}>
                <LiveChannelCard channel={channel} />
              </Link>
            ))}
          </View>
        </View>
      )}

      {/* Content Categories */}
      {categories.map((category) => (
        <ContentCarousel
          key={category.id}
          title={category.name}
          items={category.items}
          seeAllLink={`/vod?category=${category.id}`}
          style={styles.carousel}
        />
      ))}
    </ScrollView>
  );
}

function LiveChannelCard({ channel }: { channel: Channel }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Pressable
      onHoverIn={() => setIsHovered(true)}
      onHoverOut={() => setIsHovered(false)}
    >
      <GlassCard style={[styles.channelCard, isHovered && styles.channelCardHovered]}>
        <View style={styles.channelThumbnail}>
          {channel.thumbnail ? (
            <Image
              source={{ uri: channel.thumbnail }}
              style={styles.channelImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.channelPlaceholder} />
          )}
          <LinearGradient
            colors={['transparent', 'rgba(10, 10, 20, 0.9)']}
            style={styles.channelGradient}
          />
          <View style={styles.channelInfo}>
            <View style={styles.channelLiveBadge}>
              <View style={styles.liveDotSmall} />
              <Text style={styles.channelLiveText}>LIVE</Text>
            </View>
            <Text style={styles.channelName} numberOfLines={1}>{channel.name}</Text>
            {channel.currentShow && (
              <Text style={styles.channelShow} numberOfLines={1}>{channel.currentShow}</Text>
            )}
          </View>
        </View>
      </GlassCard>
    </Pressable>
  );
}

function HomePageSkeleton() {
  return (
    <View style={styles.container}>
      <View style={styles.skeletonLogo}>
        <AnimatedLogo size="large" />
        <Text style={styles.skeletonText}>טוען...</Text>
      </View>
      <View style={styles.skeletonHero} />
      {[1, 2, 3].map((i) => (
        <View key={i} style={styles.skeletonSection}>
          <View style={styles.skeletonTitle} />
          <View style={styles.skeletonGrid}>
            {[1, 2, 3, 4, 5, 6].map((j) => (
              <View key={j} style={styles.skeletonCard} />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: spacing.xl * 2,
  },
  logoContainer: {
    alignItems: 'center',
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    maxWidth: 1400,
    marginHorizontal: 'auto',
    width: '100%',
    paddingHorizontal: spacing.md,
  },
  clockContainer: {
    maxWidth: 1400,
    marginHorizontal: 'auto',
    width: '100%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  section: {
    maxWidth: 1400,
    marginHorizontal: 'auto',
    width: '100%',
    paddingHorizontal: spacing.md,
    marginTop: spacing.lg,
  },
  carousel: {
    marginTop: spacing.xl,
  },
  liveSection: {
    maxWidth: 1400,
    marginHorizontal: 'auto',
    width: '100%',
    paddingHorizontal: spacing.md,
    marginTop: spacing.xl * 1.5,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  liveTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  seeAllText: {
    fontSize: 14,
    color: colors.primary,
  },
  liveBadge: {
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
  liveBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.text,
  },
  liveGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  channelCard: {
    padding: 0,
    overflow: 'hidden',
    margin: spacing.xs,
  },
  channelCardHovered: {
    transform: [{ scale: 1.02 }],
  },
  channelThumbnail: {
    aspectRatio: 16 / 9,
    position: 'relative',
  },
  channelImage: {
    width: '100%',
    height: '100%',
  },
  channelPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.glass,
  },
  channelGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  channelInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.sm,
  },
  channelLiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.error,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
    alignSelf: 'flex-start',
    gap: 4,
    marginBottom: spacing.xs,
  },
  liveDotSmall: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.text,
  },
  channelLiveText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: colors.text,
  },
  channelName: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  channelShow: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  // Skeleton styles
  skeletonLogo: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 1.5,
  },
  skeletonText: {
    marginTop: spacing.md,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  skeletonHero: {
    height: 400,
    backgroundColor: colors.glass,
  },
  skeletonSection: {
    maxWidth: 1400,
    marginHorizontal: 'auto',
    width: '100%',
    paddingHorizontal: spacing.md,
    marginTop: spacing.xl,
  },
  skeletonTitle: {
    width: 128,
    height: 32,
    backgroundColor: colors.glass,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  skeletonCard: {
    flex: 1,
    minWidth: 150,
    maxWidth: '16.66%',
    aspectRatio: 16 / 9,
    backgroundColor: colors.glass,
    borderRadius: borderRadius.lg,
  },
});
