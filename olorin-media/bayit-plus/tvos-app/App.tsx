/**
 * Bayit+ tvOS App - Minimal Working Version
 *
 * This version demonstrates the core screens with proper navigation.
 * Full screens are available in /src/screens/ but require dependency fixes.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './src/config/queryClient';
import { SvgXml } from 'react-native-svg';
import { AISearchScreen, AIRecommendationsScreen } from './src/components/beta';

// API Configuration - Using fixed URL
const API_BASE_URL = 'https://bayit.tv/api/v1';

// Types
interface Channel {
  id: string;
  name: string;
  number?: string;
  logo?: string;
  category?: string;
}

interface ContentItem {
  id: string;
  title: string;
  thumbnail?: string;
  backdrop?: string;
  year?: string;
  rating?: number;
  description?: string;
  is_series?: boolean;
}

// API Services
const fetchChannels = async (): Promise<Channel[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/live/channels`);
    const data = await response.json();
    return data.channels || [];
  } catch {
    return [];
  }
};

const fetchFeatured = async (): Promise<{ hero: ContentItem | null; spotlight: ContentItem[] }> => {
  try {
    const response = await fetch(`${API_BASE_URL}/content/featured`);
    const data = await response.json();
    return {
      hero: data.hero || null,
      spotlight: data.spotlight || [],
    };
  } catch {
    return { hero: null, spotlight: [] };
  }
};

// Channel Logo Component with SVG Support
const ChannelLogo: React.FC<{
  logo?: string;
  channelNumber?: string;
  channelName?: string;
  size?: number;
}> = ({ logo, channelNumber, channelName, size = 100 }) => {
  // Check if logo is base64 SVG
  const isSvg = logo?.startsWith('data:image/svg+xml;base64,');

  // For SVG logos, show purple placeholder with channel number
  // (react-native-svg has compatibility issues with New Architecture on tvOS)
  if (!logo || isSvg) {
    // Extract channel number from name if not provided
    const displayNumber = channelNumber || channelName?.match(/\d+/)?.[0] || '?';

    return (
      <View style={[styles.channelPlaceholder, { width: size, height: size, borderRadius: size / 2 }]}>
        <Text style={styles.channelNumber}>{displayNumber}</Text>
      </View>
    );
  }

  // Regular image URL (PNG/JPG)
  return (
    <Image
      source={{ uri: logo }}
      style={[styles.channelLogo, { width: size, height: size, borderRadius: size / 2 }]}
      resizeMode="contain"
    />
  );
};

// Navigation Header with Purple Theme
const TVHeader: React.FC<{
  currentRoute: string;
  onNavigate: (route: string) => void;
}> = ({ currentRoute, onNavigate }) => {
  const tabs = [
    { key: 'Home', label: 'Home' },
    { key: 'LiveTV', label: 'Live TV' },
    { key: 'VOD', label: 'Movies & Series' },
    { key: 'Radio', label: 'Radio' },
    { key: 'Podcasts', label: 'Podcasts' },
    { key: 'Judaism', label: 'Judaism' },
    { key: 'Children', label: 'Children' },
    { key: 'BetaAI', label: 'Beta AI' },
  ];

  return (
    <View style={styles.header}>
      <Text style={styles.logo}>Bayit+</Text>
      <View style={styles.navTabs}>
        {tabs.map((tab) => (
          <Pressable
            key={tab.key}
            onPress={() => onNavigate(tab.key)}
            style={({ focused }) => [
              styles.navTab,
              currentRoute === tab.key && styles.navTabActive,
              focused && styles.navTabFocused,
            ]}
          >
            <Text
              style={[
                styles.navTabText,
                currentRoute === tab.key && styles.navTabTextActive,
              ]}
            >
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
};

// Home Screen
const HomeScreen: React.FC<{ onNavigate: (route: string) => void }> = ({ onNavigate }) => {
  const [loading, setLoading] = useState(true);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [hero, setHero] = useState<ContentItem | null>(null);
  const [spotlight, setSpotlight] = useState<ContentItem[]>([]);

  useEffect(() => {
    const loadData = async () => {
      const [channelsData, featuredData] = await Promise.all([
        fetchChannels(),
        fetchFeatured(),
      ]);
      setChannels(channelsData.slice(0, 8));
      setHero(featuredData.hero);
      setSpotlight(featuredData.spotlight.slice(0, 6));
      setLoading(false);
    };
    loadData();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#A855F7" />
        <Text style={styles.loadingText}>Loading content...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screenContainer} contentContainerStyle={styles.screenContent}>
      {/* Hero Section */}
      {hero && (
        <View style={styles.heroSection}>
          <Image
            source={{ uri: hero.backdrop || hero.thumbnail }}
            style={styles.heroImage}
            resizeMode="cover"
          />
          <View style={styles.heroGradient} />
          <View style={styles.heroOverlay}>
            <Text style={styles.heroTitle}>{hero.title}</Text>
            {hero.year && <Text style={styles.heroMeta}>{hero.year}</Text>}
            <Pressable
              style={({ focused }) => [
                styles.watchButton,
                focused && styles.watchButtonFocused,
              ]}
            >
              <Text style={styles.watchButtonText}>▶ Watch Now</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Live TV Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.liveIndicator}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
          <Text style={styles.sectionTitle}>Live TV</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {channels.map((channel) => (
            <Pressable
              key={channel.id}
              style={({ focused }) => [
                styles.channelCard,
                focused && styles.cardFocused,
              ]}
            >
              <ChannelLogo
                logo={channel.logo}
                channelNumber={channel.number}
                channelName={channel.name}
                size={100}
              />
              <Text style={styles.channelName} numberOfLines={1}>
                {channel.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Featured Content Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Featured</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {spotlight.map((item) => (
            <Pressable
              key={item.id}
              style={({ focused }) => [
                styles.contentCard,
                focused && styles.cardFocused,
              ]}
            >
              {item.thumbnail ? (
                <Image
                  source={{ uri: item.thumbnail }}
                  style={styles.contentPoster}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.contentPosterPlaceholder} />
              )}
              <Text style={styles.contentTitle} numberOfLines={1}>
                {item.title}
              </Text>
              {item.year && <Text style={styles.contentMeta}>{item.year}</Text>}
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </ScrollView>
  );
};

// Live TV Screen
const LiveTVScreen: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [channels, setChannels] = useState<Channel[]>([]);

  useEffect(() => {
    const loadData = async () => {
      const data = await fetchChannels();
      setChannels(data);
      setLoading(false);
    };
    loadData();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#A855F7" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.screenContainer} contentContainerStyle={styles.gridContent}>
      <Text style={styles.pageTitle}>Live TV Channels</Text>
      <View style={styles.channelGrid}>
        {channels.map((channel) => (
          <Pressable
            key={channel.id}
            style={({ focused }) => [
              styles.gridChannelCard,
              focused && styles.cardFocused,
            ]}
          >
            {channel.logo ? (
              <Image
                source={{ uri: channel.logo }}
                style={styles.gridChannelLogo}
                resizeMode="contain"
              />
            ) : (
              <View style={styles.gridChannelPlaceholder}>
                <Text style={styles.channelNumber}>{channel.number || '?'}</Text>
              </View>
            )}
            <Text style={styles.gridChannelName} numberOfLines={1}>
              {channel.name}
            </Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
};

// Judaism Screen - WITH CORRECT PURPLE COLORS (#A855F7)
const CATEGORIES = ['All', 'Torah Study', 'Holidays', 'Prayers', 'Ethics', 'History', 'Kabbalah'];
const HOLIDAYS = ['All Year', 'Shabbat', 'Rosh Hashanah', 'Yom Kippur', 'Sukkot', 'Hanukkah', 'Purim', 'Passover'];

const JudaismScreen: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedHoliday, setSelectedHoliday] = useState('All Year');

  return (
    <ScrollView style={styles.screenContainer} contentContainerStyle={styles.gridContent}>
      {/* Header with PURPLE icon (#A855F7) */}
      <View style={styles.judaismHeader}>
        <View style={styles.judaismIconContainer}>
          <Text style={styles.judaismIcon}>📖</Text>
        </View>
        <Text style={styles.pageTitle}>Torah & Judaism</Text>
        <View style={styles.starBadge}>
          <Text style={styles.starIcon}>⭐</Text>
        </View>
      </View>

      {/* Category Filters with PURPLE selected state */}
      <Text style={styles.filterLabel}>Category</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersRow}>
        {CATEGORIES.map((cat) => (
          <Pressable
            key={cat}
            onPress={() => setSelectedCategory(cat)}
            style={({ focused }) => [
              styles.filterButton,
              selectedCategory === cat && styles.filterButtonSelected,
              focused && styles.filterButtonFocused,
            ]}
          >
            <Text style={[
              styles.filterText,
              selectedCategory === cat && styles.filterTextSelected,
            ]}>
              {cat}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Holiday Filters */}
      <Text style={styles.filterLabel}>Holiday / Occasion</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersRow}>
        {HOLIDAYS.map((holiday) => (
          <Pressable
            key={holiday}
            onPress={() => setSelectedHoliday(holiday)}
            style={({ focused }) => [
              styles.filterButton,
              selectedHoliday === holiday && styles.filterButtonSelected,
              focused && styles.filterButtonFocused,
            ]}
          >
            <Text style={[
              styles.filterText,
              selectedHoliday === holiday && styles.filterTextSelected,
            ]}>
              {holiday}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Content placeholder */}
      <View style={styles.emptyContent}>
        <Text style={styles.emptyIcon}>📚</Text>
        <Text style={styles.emptyText}>
          Showing: {selectedCategory} - {selectedHoliday}
        </Text>
        <Text style={styles.emptySubtext}>Connect to API to load content</Text>
      </View>
    </ScrollView>
  );
};

// Children Screen - with GREEN theme (#10b981)
const ChildrenScreen: React.FC = () => (
  <View style={styles.placeholderScreen}>
    <View style={styles.childrenIconContainer}>
      <Text style={styles.childrenIcon}>👶</Text>
    </View>
    <Text style={styles.pageTitle}>Children's Content</Text>
    <Text style={styles.placeholderText}>Safe, educational content for kids</Text>
  </View>
);

// Other placeholder screens
const VODScreen: React.FC = () => (
  <View style={styles.placeholderScreen}>
    <Text style={styles.pageTitle}>Movies & Series</Text>
    <Text style={styles.placeholderText}>Browse our collection</Text>
  </View>
);

const RadioScreen: React.FC = () => (
  <View style={styles.placeholderScreen}>
    <Text style={styles.pageTitle}>Israeli Radio</Text>
    <Text style={styles.placeholderText}>Listen to live stations</Text>
  </View>
);

const PodcastsScreen: React.FC = () => (
  <View style={styles.placeholderScreen}>
    <Text style={styles.pageTitle}>Podcasts</Text>
    <Text style={styles.placeholderText}>Hebrew podcasts</Text>
  </View>
);

// Navigation
const Stack = createStackNavigator();

function AppContent() {
  const [currentRoute, setCurrentRoute] = useState('Home');

  const handleNavigate = (route: string) => {
    setCurrentRoute(route);
  };

  const renderScreen = () => {
    switch (currentRoute) {
      case 'LiveTV':
        return <LiveTVScreen />;
      case 'VOD':
        return <VODScreen />;
      case 'Radio':
        return <RadioScreen />;
      case 'Podcasts':
        return <PodcastsScreen />;
      case 'Judaism':
        return <JudaismScreen />;
      case 'Children':
        return <ChildrenScreen />;
      case 'BetaAI':
      case 'AISearch':
        return <AISearchScreen isEnrolled onBack={() => handleNavigate('Home')} />;
      case 'AIRecommendations':
        return <AIRecommendationsScreen isEnrolled onBack={() => handleNavigate('Home')} />;
      default:
        return <HomeScreen onNavigate={handleNavigate} />;
    }
  };

  return (
    <View style={styles.container}>
      <TVHeader currentRoute={currentRoute} onNavigate={handleNavigate} />
      {renderScreen()}
    </View>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}

// Styles - All using correct PURPLE (#A855F7) theme
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 60,
    paddingVertical: 20,
    backgroundColor: 'rgba(10, 10, 15, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(168, 85, 247, 0.2)', // Purple border
  },
  logo: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#ffffff',
    marginRight: 60,
  },
  navTabs: {
    flexDirection: 'row',
    gap: 8,
  },
  navTab: {
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  navTabActive: {
    backgroundColor: 'rgba(168, 85, 247, 0.2)', // Purple background
  },
  navTabFocused: {
    backgroundColor: 'rgba(168, 85, 247, 0.4)', // Purple focus
    transform: [{ scale: 1.05 }],
  },
  navTabText: {
    fontSize: 24,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
  },
  navTabTextActive: {
    color: '#A855F7', // Purple active text
    fontWeight: '600',
  },
  screenContainer: {
    flex: 1,
  },
  screenContent: {
    paddingBottom: 60,
  },
  gridContent: {
    padding: 60,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
  },
  loadingText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 24,
  },
  heroSection: {
    height: 700,
    position: 'relative',
    marginBottom: 20,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '70%',
    backgroundColor: 'transparent',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -60 },
    shadowOpacity: 0.8,
    shadowRadius: 80,
  },
  heroOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 60,
    paddingTop: 180,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  heroTitle: {
    fontSize: 64,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 12,
  },
  heroMeta: {
    fontSize: 28,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.85)',
    marginBottom: 24,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  watchButton: {
    backgroundColor: '#A855F7', // Purple button
    paddingHorizontal: 40,
    paddingVertical: 18,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  watchButtonFocused: {
    backgroundColor: '#9333ea', // Darker purple on focus
    transform: [{ scale: 1.05 }],
  },
  watchButtonText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: 60,
    marginTop: 40,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 32,
    fontWeight: '600',
    color: '#ffffff',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ef4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ffffff',
  },
  liveText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  channelCard: {
    width: 200,
    height: 220,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 24,
    marginRight: 20,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cardFocused: {
    backgroundColor: 'rgba(168, 85, 247, 0.25)', // Purple focus background
    borderColor: '#A855F7', // Purple border
    transform: [{ scale: 1.08 }],
  },
  channelLogo: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  channelPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(168, 85, 247, 0.3)', // More visible purple background
    borderWidth: 3,
    borderColor: 'rgba(168, 85, 247, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  channelNumber: {
    fontSize: 38,
    fontWeight: 'bold',
    color: '#FFFFFF', // White text for better contrast
    textShadowColor: 'rgba(168, 85, 247, 0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  channelName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
    width: '100%',
  },
  contentCard: {
    width: 220,
    marginRight: 20,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  contentPoster: {
    width: '100%',
    height: 140,
  },
  contentPosterPlaceholder: {
    width: '100%',
    height: 140,
    backgroundColor: 'rgba(168, 85, 247, 0.1)', // Purple placeholder
  },
  contentTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
    padding: 16,
    paddingBottom: 4,
  },
  contentMeta: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.5)',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  pageTitle: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 32,
  },
  channelGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 24,
  },
  gridChannelCard: {
    width: 240,
    height: 260,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  gridChannelLogo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  gridChannelPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(168, 85, 247, 0.3)', // More visible purple
    borderWidth: 3,
    borderColor: 'rgba(168, 85, 247, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  gridChannelName: {
    fontSize: 24,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
    width: '100%',
  },
  placeholderScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 60,
  },
  placeholderText: {
    fontSize: 28,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 16,
  },
  // Judaism Screen specific styles - ALL PURPLE (#A855F7)
  judaismHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 32,
  },
  judaismIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(168, 85, 247, 0.2)', // PURPLE background
    justifyContent: 'center',
    alignItems: 'center',
  },
  judaismIcon: {
    fontSize: 40,
  },
  starBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  starIcon: {
    fontSize: 24,
  },
  filterLabel: {
    fontSize: 24,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 12,
    marginTop: 16,
  },
  filtersRow: {
    marginBottom: 24,
  },
  filterButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    marginRight: 12,
  },
  filterButtonSelected: {
    backgroundColor: '#A855F7', // PURPLE - was #3b82f6 (blue)
    borderColor: '#A855F7', // PURPLE - was #3b82f6 (blue)
  },
  filterButtonFocused: {
    borderColor: '#A855F7', // PURPLE focus border
    transform: [{ scale: 1.05 }],
  },
  filterText: {
    fontSize: 24,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  filterTextSelected: {
    color: '#ffffff',
  },
  emptyContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 60,
    gap: 16,
  },
  emptyIcon: {
    fontSize: 64,
  },
  emptyText: {
    fontSize: 28,
    color: '#A855F7', // PURPLE
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 20,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  // Children screen - GREEN theme
  childrenIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(16, 185, 129, 0.2)', // GREEN
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  childrenIcon: {
    fontSize: 50,
  },
});
