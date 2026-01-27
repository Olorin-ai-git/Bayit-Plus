/**
 * Home Screen Mobile
 * Glass UI styled home screen with rich hero carousel matching web app
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  Pressable,
  Dimensions,
  RefreshControl,
  ActivityIndicator,
  ImageBackground,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Home, Tv, Film, Radio, Mic, Play, ChevronRight, ChevronLeft, Clock, Star } from 'lucide-react-native';
import { liveService, contentService, Channel, ContentItem } from '../services/api';
import { demoFeatured, demoChannels, FeaturedItem } from '../services/demoData';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2;
const CAROUSEL_HEIGHT = 280;
const AUTO_SCROLL_INTERVAL = 6000;

interface QuickAccessItem {
  id: string;
  title: string;
  subtitle?: string;
  type: 'live' | 'vod' | 'radio' | 'podcast';
}

const QUICK_ACCESS: QuickAccessItem[] = [
  { id: '1', title: 'Live TV', subtitle: 'Watch Now', type: 'live' },
  { id: '2', title: 'Movies & Series', subtitle: 'On Demand', type: 'vod' },
  { id: '3', title: 'Israeli Radio', subtitle: 'All Stations', type: 'radio' },
  { id: '4', title: 'Podcasts', subtitle: 'Hebrew Content', type: 'podcast' },
];

const getIconForType = (type: string) => {
  switch (type) {
    case 'live': return Tv;
    case 'vod': return Film;
    case 'radio': return Radio;
    case 'podcast': return Mic;
    default: return Play;
  }
};

function formatDuration(duration?: string): string {
  if (!duration) return '';
  if (duration.includes(':')) return duration;
  const mins = parseInt(duration, 10);
  if (isNaN(mins)) return duration;
  const hours = Math.floor(mins / 60);
  const minutes = mins % 60;
  return hours > 0 ? `${hours}:${minutes.toString().padStart(2, '0')}:00` : `${minutes} דקות`;
}

function HeroCarousel({ items }: { items: FeaturedItem[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const navigation = useNavigation<any>();
  const itemCount = items.length;

  useEffect(() => {
    if (itemCount <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % itemCount);
    }, AUTO_SCROLL_INTERVAL);
    return () => clearInterval(timer);
  }, [itemCount]);

  useEffect(() => {
    if (scrollRef.current && itemCount > 0) {
      scrollRef.current.scrollTo({ x: currentIndex * SCREEN_WIDTH, animated: true });
    }
  }, [currentIndex, itemCount]);

  const goToSlide = (index: number) => setCurrentIndex(index);
  const goNext = () => setCurrentIndex((prev) => (prev + 1) % Math.max(itemCount, 1));
  const goPrev = () => setCurrentIndex((prev) => (prev - 1 + Math.max(itemCount, 1)) % Math.max(itemCount, 1));

  // Render empty state
  if (itemCount === 0) {
    return (
      <View style={styles.heroContainer}>
        <View style={styles.heroPlaceholder}>
          <Film size={48} color="rgba(126, 34, 206, 0.5)" />
          <Text style={styles.heroPlaceholderText}>Loading featured content...</Text>
        </View>
      </View>
    );
  }

  const safeIndex = Math.min(currentIndex, itemCount - 1);
  const currentItem = items[safeIndex];

  return (
    <View style={styles.heroContainer}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
      >
        {items.map((item, index) => (
          <ImageBackground
            key={item.id}
            source={{ uri: item.backdrop || item.poster }}
            style={styles.heroSlide}
            resizeMode="cover"
          >
            <View style={styles.heroGradientOverlay}>
              <View style={styles.heroContent}>
                <View style={styles.heroBadgeRow}>
                  <View style={styles.heroBadge}>
                    <Text style={styles.heroBadgeText}>
                      {item.type === 'series' ? 'סדרה' : 'סרט'}
                    </Text>
                  </View>
                  {item.rating && (
                    <View style={styles.heroRating}>
                      <Star size={12} color="#ffc107" fill="#ffc107" />
                      <Text style={styles.heroRatingText}>{item.rating}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.heroTitle} numberOfLines={2}>{item.title}</Text>
                <View style={styles.heroMetaRow}>
                  {item.year && <Text style={styles.heroMeta}>{item.year}</Text>}
                  {item.duration && (
                    <>
                      <View style={styles.heroDot} />
                      <Clock size={12} color="rgba(255,255,255,0.7)" />
                      <Text style={styles.heroMeta}>{formatDuration(item.duration)}</Text>
                    </>
                  )}
                  {item.category && (
                    <>
                      <View style={styles.heroDot} />
                      <Text style={styles.heroMeta}>{item.category}</Text>
                    </>
                  )}
                </View>
                {item.description && (
                  <Text style={styles.heroDescription} numberOfLines={2}>
                    {item.description}
                  </Text>
                )}
                <Pressable
                  style={styles.watchNowButton}
                  onPress={() => navigation.navigate('VOD')}
                >
                  <Play size={16} color="#fff" fill="#fff" />
                  <Text style={styles.watchNowText}>Watch Now</Text>
                </Pressable>
              </View>
            </View>
          </ImageBackground>
        ))}
      </ScrollView>

      {/* Navigation Arrows */}
      {items.length > 1 && (
        <>
          <Pressable style={[styles.navArrow, styles.navArrowLeft]} onPress={goPrev}>
            <ChevronLeft size={24} color="#fff" />
          </Pressable>
          <Pressable style={[styles.navArrow, styles.navArrowRight]} onPress={goNext}>
            <ChevronRight size={24} color="#fff" />
          </Pressable>
        </>
      )}

      {/* Pagination Dots */}
      {items.length > 1 && (
        <View style={styles.paginationContainer}>
          {items.map((_, index) => (
            <Pressable
              key={index}
              style={[styles.paginationDot, currentIndex === index && styles.paginationDotActive]}
              onPress={() => goToSlide(index)}
            />
          ))}
        </View>
      )}
    </View>
  );
}

function GlassCard({ children, style, onPress }: { children: React.ReactNode; style?: any; onPress?: () => void }) {
  const content = <View style={[styles.glassCard, style]}>{children}</View>;
  if (onPress) return <Pressable onPress={onPress}>{content}</Pressable>;
  return content;
}

function QuickAccessRow({ title, items }: { title: string; items: QuickAccessItem[] }) {
  const navigation = useNavigation<any>();

  const handlePress = (item: QuickAccessItem) => {
    const routes: Record<string, string> = { live: 'LiveTV', vod: 'VOD', radio: 'Radio', podcast: 'Podcasts' };
    navigation.navigate(routes[item.type] || 'Home');
  };

  return (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
        {items.map((item) => {
          const IconComponent = getIconForType(item.type);
          return (
            <GlassCard key={item.id} style={styles.contentCard} onPress={() => handlePress(item)}>
              <View style={styles.cardIconContainer}>
                <IconComponent size={32} color="#9333ea" strokeWidth={1.5} />
              </View>
              <Text style={styles.cardTitle}>{item.title}</Text>
              {item.subtitle && <Text style={styles.cardSubtitle}>{item.subtitle}</Text>}
            </GlassCard>
          );
        })}
      </ScrollView>
    </View>
  );
}

function FeaturedContentRow({ title, items }: { title: string; items: ContentItem[] }) {
  const navigation = useNavigation<any>();

  return (
    <View style={styles.sectionContainer}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Pressable onPress={() => navigation.navigate('VOD')} style={styles.seeAllButton}>
          <Text style={styles.seeAllText}>See All</Text>
          <ChevronRight size={16} color="#9333ea" />
        </Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
        {items.slice(0, 6).map((item) => (
          <GlassCard key={item.id} style={styles.featuredCard} onPress={() => navigation.navigate('VOD')}>
            {item.poster ? (
              <Image source={{ uri: item.poster }} style={styles.featuredPoster} resizeMode="cover" />
            ) : (
              <View style={styles.featuredPosterPlaceholder}>
                <Film size={32} color="rgba(126, 34, 206, 0.5)" />
              </View>
            )}
            <View style={styles.featuredInfo}>
              <Text style={styles.featuredTitle} numberOfLines={1}>{item.title}</Text>
              {item.year && <Text style={styles.featuredYear}>{item.year}</Text>}
            </View>
          </GlassCard>
        ))}
      </ScrollView>
    </View>
  );
}

function LiveChannelRow({ channels, loading }: { channels: Channel[]; loading: boolean }) {
  const navigation = useNavigation<any>();

  if (loading) {
    return (
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <View style={styles.liveBadgeContainer}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
          <Text style={styles.sectionTitle}>Live TV</Text>
        </View>
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color="#9333ea" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.sectionContainer}>
      <View style={styles.sectionHeader}>
        <View style={styles.liveBadgeContainer}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
        <Text style={styles.sectionTitle}>Live TV</Text>
        <Pressable onPress={() => navigation.navigate('LiveTV')} style={styles.seeAllButton}>
          <Text style={styles.seeAllText}>All Channels</Text>
          <ChevronRight size={16} color="#9333ea" />
        </Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
        {channels.slice(0, 6).map((channel) => (
          <GlassCard key={channel.id} style={styles.channelCard} onPress={() => navigation.navigate('LiveTV')}>
            <View style={styles.channelIcon}>
              {channel.logo ? (
                <Image source={{ uri: channel.logo }} style={styles.channelLogo} resizeMode="contain" />
              ) : (
                <Text style={styles.channelNumberText}>{channel.number || '?'}</Text>
              )}
            </View>
            <Text style={styles.channelName} numberOfLines={1}>{channel.name}</Text>
          </GlassCard>
        ))}
      </ScrollView>
    </View>
  );
}

export function HomeScreenMobile() {
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [channels, setChannels] = useState<Channel[]>(demoChannels);
  const [featuredContent, setFeaturedContent] = useState<ContentItem[]>(demoFeatured.items);
  const [heroItems] = useState<FeaturedItem[]>(demoFeatured.hero);

  const loadData = async () => {
    try {
      const [channelsData, contentData] = await Promise.all([
        liveService.getChannels().catch(() => ({ channels: [] })),
        contentService.getFeatured().catch(() => ({ items: [] })),
      ]);

      // Use API data if available, otherwise keep demo data
      const apiChannels = channelsData.channels || [];
      const apiContent = contentData.items || [];

      if (apiChannels.length > 0) setChannels(apiChannels);
      if (apiContent.length > 0) setFeaturedContent(apiContent);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#9333ea" />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Home size={24} color="#9333ea" strokeWidth={2} />
          <Text style={styles.logoText}>Bayit+</Text>
        </View>
      </View>

      {/* Hero Carousel */}
      <HeroCarousel items={heroItems} />

      {/* Quick Access */}
      <QuickAccessRow title="Quick Access" items={QUICK_ACCESS} />

      {/* Live TV Section */}
      <LiveChannelRow channels={channels} loading={loading} />

      {/* Featured Content */}
      {featuredContent.length > 0 && (
        <FeaturedContentRow title="Featured" items={featuredContent} />
      )}

      {/* Categories */}
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Browse Categories</Text>
        <View style={styles.categoryGrid}>
          <GlassCard style={styles.categoryCard}>
            <Film size={24} color="#9333ea" />
            <Text style={styles.categoryText}>Movies</Text>
          </GlassCard>
          <GlassCard style={styles.categoryCard}>
            <Tv size={24} color="#9333ea" />
            <Text style={styles.categoryText}>Series</Text>
          </GlassCard>
          <GlassCard style={styles.categoryCard}>
            <Radio size={24} color="#9333ea" />
            <Text style={styles.categoryText}>Radio</Text>
          </GlassCard>
          <GlassCard style={styles.categoryCard}>
            <Mic size={24} color="#9333ea" />
            <Text style={styles.categoryText}>Podcasts</Text>
          </GlassCard>
        </View>
      </View>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

// Design tokens - purple glassmorphic theme
const COLORS = {
  primary: '#7e22ce',        // Purple primary
  primaryLight: '#9333ea',   // Lighter purple
  primaryDark: '#581c87',    // Darker purple
  background: '#0a0a0a',     // Near black
  surface: 'rgba(10, 10, 10, 0.7)',
  surfaceLight: 'rgba(10, 10, 10, 0.5)',
  border: 'rgba(126, 34, 206, 0.25)',
  borderLight: 'rgba(126, 34, 206, 0.15)',
  text: '#ffffff',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  textMuted: 'rgba(255, 255, 255, 0.5)',
  live: '#ff4444',
  gold: '#ffd700',
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  contentContainer: { paddingBottom: 20 },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  logoContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoText: { fontSize: 24, fontWeight: 'bold', color: COLORS.text },

  // Hero Carousel
  heroContainer: { height: CAROUSEL_HEIGHT, marginBottom: 24, position: 'relative' },
  heroSlide: { width: SCREEN_WIDTH, height: CAROUSEL_HEIGHT },
  heroGradientOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
    padding: 20,
  },
  heroContent: { gap: 8 },
  heroBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heroBadge: {
    backgroundColor: 'rgba(126, 34, 206, 0.3)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  heroBadgeText: { color: COLORS.primaryLight, fontSize: 12, fontWeight: '600' },
  heroRating: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  heroRatingText: { color: COLORS.gold, fontSize: 12, fontWeight: '600' },
  heroTitle: { fontSize: 28, fontWeight: 'bold', color: COLORS.text },
  heroMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  heroMeta: { color: COLORS.textSecondary, fontSize: 13 },
  heroDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: COLORS.textMuted },
  heroDescription: { color: 'rgba(255, 255, 255, 0.8)', fontSize: 14, lineHeight: 20 },
  heroPlaceholder: {
    flex: 1,
    backgroundColor: 'rgba(126, 34, 206, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  heroPlaceholderText: { color: COLORS.textMuted, fontSize: 16 },
  watchNowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  watchNowText: { color: COLORS.text, fontWeight: '600', fontSize: 16 },

  // Navigation Arrows
  navArrow: {
    position: 'absolute',
    top: '50%',
    marginTop: -20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navArrowLeft: { left: 8 },
  navArrowRight: { right: 8 },

  // Pagination
  paginationContainer: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  paginationDotActive: { backgroundColor: COLORS.primaryLight, width: 24 },

  // Glass Card
  glassCard: {
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: 12,
    padding: 16,
  },

  // Section
  sectionContainer: { marginBottom: 24, paddingHorizontal: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
  sectionTitle: { flex: 1, fontSize: 18, fontWeight: '600', color: COLORS.text },
  seeAllButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  seeAllText: { color: COLORS.primaryLight, fontSize: 14, fontWeight: '500' },

  // Live Badge
  liveBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.live,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.text },
  liveText: { color: COLORS.text, fontSize: 10, fontWeight: 'bold' },

  // Horizontal List
  horizontalList: { gap: 12 },

  // Content Card
  contentCard: { width: 140, alignItems: 'center' },
  cardIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(126, 34, 206, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: { fontSize: 14, fontWeight: '600', color: COLORS.text, textAlign: 'center', marginBottom: 4 },
  cardSubtitle: { fontSize: 12, color: COLORS.textMuted, textAlign: 'center' },

  // Channel Card
  channelCard: { width: 120, alignItems: 'center' },
  channelIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(126, 34, 206, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    overflow: 'hidden',
  },
  channelLogo: { width: 48, height: 48, borderRadius: 24 },
  channelNumberText: { fontSize: 18, fontWeight: 'bold', color: COLORS.primaryLight },
  channelName: { fontSize: 13, color: COLORS.text, textAlign: 'center' },

  // Featured Content
  featuredCard: { width: 140, padding: 0, overflow: 'hidden' },
  featuredPoster: { width: 140, height: 100 },
  featuredPosterPlaceholder: {
    width: 140,
    height: 100,
    backgroundColor: 'rgba(126, 34, 206, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  featuredInfo: { padding: 12 },
  featuredTitle: { fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 2 },
  featuredYear: { fontSize: 11, color: COLORS.textMuted },

  // Loading row
  loadingRow: { height: 80, justifyContent: 'center', alignItems: 'center' },

  // Category Grid
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12 },
  categoryCard: { width: CARD_WIDTH, flexDirection: 'row', alignItems: 'center', gap: 12 },
  categoryText: { fontSize: 14, fontWeight: '500', color: COLORS.text },
});
