import { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image } from 'react-native';
import { Link, useNavigate } from 'react-router-dom';
import { Play, ChevronRight, Info, Volume2, VolumeX } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@/hooks/useDirection';
import ContentCarousel from '@/components/content/ContentCarousel';
import { TrendingRow } from '@bayit/shared';
import MorningRitual from '@/components/ritual/MorningRitual';
import { contentService, liveService, historyService, ritualService } from '@/services/api';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import { getLocalizedName } from '@bayit/shared-utils/contentLocalization';
import LinearGradient from 'react-native-linear-gradient';
import logger from '@/utils/logger';

declare const __TV__: boolean;
const IS_TV_BUILD = typeof __TV__ !== 'undefined' && __TV__;

interface FeaturedContent {
  id: string;
  title: string;
  description?: string;
  thumbnail?: string;
  videoUrl?: string;
  type?: string;
  year?: string;
  duration?: string;
  rating?: string;
}

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
  const { t, i18n } = useTranslation();
  const { isRTL } = useDirection();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);

  const [featured, setFeatured] = useState<FeaturedContent[]>([]);
  const [currentFeaturedIndex, setCurrentFeaturedIndex] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [liveChannels, setLiveChannels] = useState<Channel[]>([]);
  const [continueWatching, setContinueWatching] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMorningRitual, setShowMorningRitual] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [focusedItem, setFocusedItem] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update clock every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Auto-rotate featured content
  useEffect(() => {
    if (featured.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentFeaturedIndex((prev) => (prev + 1) % featured.length);
    }, 10000); // 10 seconds per item
    return () => clearInterval(interval);
  }, [featured.length]);

  // Load content
  useEffect(() => {
    checkMorningRitual();
    loadHomeContent();
  }, []);

  const checkMorningRitual = async () => {
    try {
      const result = await ritualService.shouldShow();
      if (result.show_ritual) setShowMorningRitual(true);
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

      // Get featured items array (or wrap single item)
      const featuredItems = featuredData.items || (featuredData.hero ? [featuredData.hero] : []);
      setFeatured(featuredItems);
      setCategories(categoriesData.categories || []);
      setLiveChannels(liveData.channels || []);
      setContinueWatching(continueData.items || []);
    } catch (error) {
      logger.error('Failed to load home content', 'HomePage', error);
    } finally {
      setLoading(false);
    }
  };

  const currentFeatured = featured[currentFeaturedIndex];

  const handlePlayFeatured = () => {
    if (currentFeatured) {
      navigate(`/watch/${currentFeatured.id}`);
    }
  };

  const handleMoreInfo = () => {
    if (currentFeatured) {
      navigate(`/details/${currentFeatured.id}`);
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
    }
  };

  // Format time for display
  const formatTime = (date: Date, timeZone?: string) => {
    return date.toLocaleTimeString(i18n.language === 'he' ? 'he-IL' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone,
    });
  };

  const israelTime = formatTime(currentTime, 'Asia/Jerusalem');
  const localTime = formatTime(currentTime);

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
    <ScrollView style={styles.page} contentContainerStyle={styles.pageContent}>
      {/* Hero Section with Autoplay */}
      {currentFeatured && (
        <View style={styles.hero}>
          {/* Background Video/Image */}
          <View style={styles.heroMedia}>
            {currentFeatured.videoUrl ? (
              <video
                ref={videoRef}
                src={currentFeatured.videoUrl}
                autoPlay
                loop
                muted={isMuted}
                playsInline
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            ) : currentFeatured.thumbnail ? (
              <Image
                source={{ uri: currentFeatured.thumbnail }}
                style={styles.heroImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.heroPlaceholder} />
            )}
            {/* Gradient Overlay */}
            <LinearGradient
              colors={['transparent', 'rgba(10, 10, 20, 0.6)', 'rgba(10, 10, 20, 0.95)']}
              locations={[0, 0.5, 1]}
              style={styles.heroGradient}
            />
          </View>

          {/* Dual Clock Display */}
          <View style={[styles.clockContainer, isRTL && styles.clockContainerRTL]}>
            <View style={styles.clockItem}>
              <Text style={styles.flagIcon}>🇮🇱</Text>
              <Text style={styles.clockTime}>{israelTime}</Text>
            </View>
            <View style={styles.clockDivider} />
            <View style={styles.clockItem}>
              <Text style={styles.flagIcon}>🇺🇸</Text>
              <Text style={styles.clockTime}>{localTime}</Text>
            </View>
          </View>

          {/* Hero Content */}
          <View style={[styles.heroContent, isRTL && styles.heroContentRTL]}>
            <View style={styles.heroInfo}>
              {/* Badges */}
              <View style={styles.heroBadges}>
                {currentFeatured.type && (
                  <View style={styles.typeBadge}>
                    <Text style={styles.typeBadgeText}>{currentFeatured.type}</Text>
                  </View>
                )}
                {currentFeatured.rating && (
                  <View style={styles.ratingBadge}>
                    <Text style={styles.ratingText}>{currentFeatured.rating}</Text>
                  </View>
                )}
              </View>

              {/* Title */}
              <Text style={[styles.heroTitle, isRTL && styles.textRTL]}>
                {currentFeatured.title}
              </Text>

              {/* Meta */}
              {(currentFeatured.year || currentFeatured.duration) && (
                <Text style={[styles.heroMeta, isRTL && styles.textRTL]}>
                  {[currentFeatured.year, currentFeatured.duration].filter(Boolean).join(' • ')}
                </Text>
              )}

              {/* Description */}
              {currentFeatured.description && (
                <Text style={[styles.heroDescription, isRTL && styles.textRTL]} numberOfLines={3}>
                  {currentFeatured.description}
                </Text>
              )}

              {/* Action Buttons */}
              <View style={styles.heroActions}>
                <Pressable
                  onPress={handlePlayFeatured}
                  onFocus={() => setFocusedItem('play')}
                  onBlur={() => setFocusedItem(null)}
                  style={[styles.playButton, focusedItem === 'play' && styles.buttonFocused]}
                >
                  <Play size={IS_TV_BUILD ? 28 : 22} color="#000" fill="#000" />
                  <Text style={styles.playButtonText}>{t('common.play')}</Text>
                </Pressable>

                <Pressable
                  onPress={handleMoreInfo}
                  onFocus={() => setFocusedItem('info')}
                  onBlur={() => setFocusedItem(null)}
                  style={[styles.infoButton, focusedItem === 'info' && styles.infoButtonFocused]}
                >
                  <Info size={IS_TV_BUILD ? 24 : 20} color={colors.text} />
                  <Text style={styles.infoButtonText}>{t('common.moreInfo')}</Text>
                </Pressable>
              </View>
            </View>

            {/* Mute Button */}
            {currentFeatured.videoUrl && (
              <Pressable
                onPress={toggleMute}
                onFocus={() => setFocusedItem('mute')}
                onBlur={() => setFocusedItem(null)}
                style={[styles.muteButton, focusedItem === 'mute' && styles.muteButtonFocused]}
              >
                {isMuted ? (
                  <VolumeX size={IS_TV_BUILD ? 24 : 20} color={colors.text} />
                ) : (
                  <Volume2 size={IS_TV_BUILD ? 24 : 20} color={colors.text} />
                )}
              </Pressable>
            )}
          </View>

          {/* Featured Indicators */}
          {featured.length > 1 && (
            <View style={styles.indicators}>
              {featured.map((_, index) => (
                <Pressable
                  key={index}
                  onPress={() => setCurrentFeaturedIndex(index)}
                  style={[
                    styles.indicator,
                    index === currentFeaturedIndex && styles.indicatorActive,
                  ]}
                />
              ))}
            </View>
          )}
        </View>
      )}

      {/* Continue Watching */}
      {continueWatching.length > 0 && (
        <ContentCarousel
          title={t('home.continueWatching')}
          items={continueWatching}
          style={styles.section}
        />
      )}

      {/* Live TV */}
      {liveChannels.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <View style={styles.liveBadge}>
                <View style={styles.liveDot} />
                <Text style={styles.liveBadgeText}>{t('common.live')}</Text>
              </View>
              <Text style={styles.sectionTitle}>{t('home.liveTV')}</Text>
            </View>
            <Link to="/live" style={{ textDecoration: 'none' }}>
              <Text style={styles.seeAll}>{t('home.allChannels')}</Text>
            </Link>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.liveRow}>
            {liveChannels.slice(0, 8).map((channel) => (
              <LiveCard key={channel.id} channel={channel} focusedItem={focusedItem} setFocusedItem={setFocusedItem} />
            ))}
          </ScrollView>
        </View>
      )}

      {/* Trending */}
      <View style={styles.section}>
        <TrendingRow />
      </View>

      {/* Categories */}
      {categories.map((category) => (
        <ContentCarousel
          key={category.id}
          title={getLocalizedName(category, i18n.language)}
          items={category.items}
          seeAllLink={`/vod?category=${category.id}`}
          style={styles.section}
        />
      ))}
    </ScrollView>
  );
}

function LiveCard({ channel, focusedItem, setFocusedItem }: { channel: Channel; focusedItem: string | null; setFocusedItem: (id: string | null) => void }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isFocused = focusedItem === `live-${channel.id}`;

  return (
    <Pressable
      onPress={() => navigate(`/live/${channel.id}`)}
      onFocus={() => setFocusedItem(`live-${channel.id}`)}
      onBlur={() => setFocusedItem(null)}
      style={[styles.liveCard, isFocused && styles.liveCardFocused]}
    >
      <View style={styles.liveCardThumb}>
        {channel.thumbnail ? (
          <Image source={{ uri: channel.thumbnail }} style={styles.liveCardImage} resizeMode="cover" />
        ) : (
          <View style={styles.liveCardPlaceholder} />
        )}
        <View style={styles.liveCardBadge}>
          <View style={styles.liveDotSmall} />
          <Text style={styles.liveCardBadgeText}>{t('common.live')}</Text>
        </View>
      </View>
      <View style={styles.liveCardInfo}>
        <Text style={styles.liveCardName} numberOfLines={1}>{channel.name}</Text>
        {channel.currentShow && (
          <Text style={styles.liveCardShow} numberOfLines={1}>{channel.currentShow}</Text>
        )}
      </View>
    </Pressable>
  );
}

function HomePageSkeleton() {
  return (
    <View style={styles.page}>
      <View style={styles.skeletonHero} />
      {[1, 2, 3].map((i) => (
        <View key={i} style={styles.skeletonSection}>
          <View style={styles.skeletonTitle} />
          <View style={styles.skeletonRow}>
            {[1, 2, 3, 4, 5].map((j) => (
              <View key={j} style={styles.skeletonCard} />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.background,
  },
  pageContent: {
    paddingBottom: spacing.xl * 2,
  },
  // Hero
  hero: {
    height: IS_TV_BUILD ? 600 : 500,
    position: 'relative',
  },
  heroMedia: {
    ...StyleSheet.absoluteFillObject,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroPlaceholder: {
    flex: 1,
    backgroundColor: colors.backgroundLighter,
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  // Dual Clock
  clockContainer: {
    position: 'absolute',
    top: IS_TV_BUILD ? spacing.xl : spacing.lg,
    right: IS_TV_BUILD ? spacing.xl * 2 : spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(10, 10, 20, 0.8)',
    paddingHorizontal: IS_TV_BUILD ? spacing.lg : spacing.md,
    paddingVertical: IS_TV_BUILD ? spacing.sm : spacing.xs,
    borderRadius: IS_TV_BUILD ? 16 : 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 217, 255, 0.2)',
    gap: IS_TV_BUILD ? spacing.md : spacing.sm,
    zIndex: 20,
  },
  clockContainerRTL: {
    right: 'auto' as any,
    left: IS_TV_BUILD ? spacing.xl * 2 : spacing.lg,
    flexDirection: 'row-reverse',
  },
  clockItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: IS_TV_BUILD ? spacing.sm : spacing.xs,
  },
  flagIcon: {
    fontSize: IS_TV_BUILD ? 32 : 24,
  },
  clockTime: {
    fontSize: IS_TV_BUILD ? 28 : 20,
    fontWeight: '700',
    color: colors.text,
    fontVariant: ['tabular-nums'] as any,
  },
  clockDivider: {
    width: 1,
    height: IS_TV_BUILD ? 40 : 32,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  heroContent: {
    position: 'absolute',
    bottom: IS_TV_BUILD ? 80 : 60,
    left: IS_TV_BUILD ? spacing.xl * 2 : spacing.lg,
    right: IS_TV_BUILD ? spacing.xl * 2 : spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  heroContentRTL: {
    flexDirection: 'row-reverse',
  },
  heroInfo: {
    flex: 1,
    maxWidth: IS_TV_BUILD ? 700 : 500,
  },
  heroBadges: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  typeBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 4,
  },
  typeBadgeText: {
    fontSize: IS_TV_BUILD ? 14 : 12,
    fontWeight: '600',
    color: colors.text,
    textTransform: 'uppercase',
  },
  ratingBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 4,
  },
  ratingText: {
    fontSize: IS_TV_BUILD ? 14 : 12,
    fontWeight: '600',
    color: colors.text,
  },
  heroTitle: {
    fontSize: IS_TV_BUILD ? 48 : 36,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  heroMeta: {
    fontSize: IS_TV_BUILD ? 18 : 14,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  heroDescription: {
    fontSize: IS_TV_BUILD ? 18 : 15,
    color: colors.textSecondary,
    lineHeight: IS_TV_BUILD ? 28 : 22,
    marginBottom: spacing.lg,
  },
  heroActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#fff',
    paddingHorizontal: IS_TV_BUILD ? spacing.xl : spacing.lg,
    paddingVertical: IS_TV_BUILD ? spacing.md : spacing.sm,
    borderRadius: IS_TV_BUILD ? 12 : 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  playButtonText: {
    fontSize: IS_TV_BUILD ? 20 : 16,
    fontWeight: '600',
    color: '#000',
  },
  infoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: IS_TV_BUILD ? spacing.xl : spacing.lg,
    paddingVertical: IS_TV_BUILD ? spacing.md : spacing.sm,
    borderRadius: IS_TV_BUILD ? 12 : 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  infoButtonFocused: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(0, 217, 255, 0.2)',
  },
  infoButtonText: {
    fontSize: IS_TV_BUILD ? 20 : 16,
    fontWeight: '600',
    color: colors.text,
  },
  buttonFocused: {
    borderColor: colors.primary,
    transform: [{ scale: 1.05 }],
  },
  muteButton: {
    width: IS_TV_BUILD ? 56 : 44,
    height: IS_TV_BUILD ? 56 : 44,
    borderRadius: IS_TV_BUILD ? 28 : 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  muteButtonFocused: {
    borderColor: colors.primary,
  },
  indicators: {
    position: 'absolute',
    bottom: IS_TV_BUILD ? 30 : 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  indicator: {
    width: IS_TV_BUILD ? 40 : 30,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
  },
  indicatorActive: {
    backgroundColor: colors.primary,
  },
  textRTL: {
    textAlign: 'right',
  },
  // Sections
  section: {
    marginTop: IS_TV_BUILD ? spacing.xl * 1.5 : spacing.xl,
    paddingHorizontal: IS_TV_BUILD ? spacing.xl : spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: IS_TV_BUILD ? 28 : 20,
    fontWeight: '700',
    color: colors.text,
  },
  seeAll: {
    fontSize: IS_TV_BUILD ? 18 : 14,
    color: colors.primary,
    fontWeight: '500',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.error,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.text,
  },
  liveBadgeText: {
    fontSize: IS_TV_BUILD ? 12 : 10,
    fontWeight: '700',
    color: colors.text,
  },
  liveRow: {
    gap: IS_TV_BUILD ? spacing.md : spacing.sm,
    paddingRight: spacing.md,
  },
  liveCard: {
    width: IS_TV_BUILD ? 280 : 200,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: IS_TV_BUILD ? 16 : 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  liveCardFocused: {
    borderColor: colors.primary,
    transform: [{ scale: 1.03 }],
  },
  liveCardThumb: {
    aspectRatio: 16 / 9,
    position: 'relative',
  },
  liveCardImage: {
    width: '100%',
    height: '100%',
  },
  liveCardPlaceholder: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  liveCardBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.error,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 4,
  },
  liveDotSmall: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.text,
  },
  liveCardBadgeText: {
    fontSize: IS_TV_BUILD ? 10 : 8,
    fontWeight: '700',
    color: colors.text,
  },
  liveCardInfo: {
    padding: IS_TV_BUILD ? spacing.md : spacing.sm,
  },
  liveCardName: {
    fontSize: IS_TV_BUILD ? 16 : 14,
    fontWeight: '600',
    color: colors.text,
  },
  liveCardShow: {
    fontSize: IS_TV_BUILD ? 14 : 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  // Skeleton
  skeletonHero: {
    height: IS_TV_BUILD ? 600 : 500,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  skeletonSection: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  skeletonTitle: {
    width: 150,
    height: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    marginBottom: spacing.md,
  },
  skeletonRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  skeletonCard: {
    width: IS_TV_BUILD ? 280 : 200,
    aspectRatio: 16 / 9,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
  },
});
