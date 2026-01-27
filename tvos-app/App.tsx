/**
 * Bayit+ tvOS App - Functional Version
 * Working tvOS app with navigation and real content
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// API Configuration
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
  } catch (error) {
    console.warn('Failed to fetch channels:', error);
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
  } catch (error) {
    console.warn('Failed to fetch featured:', error);
    return { hero: null, spotlight: [] };
  }
};

// Navigation Header
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
const HomeScreen: React.FC = () => {
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
        <ActivityIndicator size="large" color="#9333ea" />
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
          <View style={styles.heroOverlay}>
            <Text style={styles.heroTitle}>{hero.title}</Text>
            {hero.year && <Text style={styles.heroMeta}>{hero.year}</Text>}
            {hero.description && (
              <Text style={styles.heroDescription} numberOfLines={3}>
                {hero.description}
              </Text>
            )}
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
              {channel.logo ? (
                <Image
                  source={{ uri: channel.logo }}
                  style={styles.channelLogo}
                  resizeMode="contain"
                />
              ) : (
                <View style={styles.channelPlaceholder}>
                  <Text style={styles.channelNumber}>{channel.number || '?'}</Text>
                </View>
              )}
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
        <ActivityIndicator size="large" color="#9333ea" />
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
            {channel.category && (
              <Text style={styles.channelCategory}>{channel.category}</Text>
            )}
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
};

// Placeholder screens
const VODScreen: React.FC = () => (
  <View style={styles.placeholderScreen}>
    <Text style={styles.pageTitle}>Movies & Series</Text>
    <Text style={styles.placeholderText}>Browse our collection of movies and series</Text>
  </View>
);

const RadioScreen: React.FC = () => (
  <View style={styles.placeholderScreen}>
    <Text style={styles.pageTitle}>Israeli Radio</Text>
    <Text style={styles.placeholderText}>Listen to live radio stations</Text>
  </View>
);

const PodcastsScreen: React.FC = () => (
  <View style={styles.placeholderScreen}>
    <Text style={styles.pageTitle}>Podcasts</Text>
    <Text style={styles.placeholderText}>Discover Hebrew podcasts</Text>
  </View>
);

// Navigation
const Stack = createStackNavigator();

function AppContent() {
  const [currentRoute, setCurrentRoute] = useState('Home');

  const handleNavigate = useCallback((route: string) => {
    setCurrentRoute(route);
  }, []);

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
      default:
        return <HomeScreen />;
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
  return <AppContent />;
}

// Styles
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
    borderBottomColor: 'rgba(147, 51, 234, 0.2)',
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
    backgroundColor: 'rgba(147, 51, 234, 0.2)',
  },
  navTabFocused: {
    backgroundColor: 'rgba(147, 51, 234, 0.4)',
    transform: [{ scale: 1.05 }],
  },
  navTabText: {
    fontSize: 24,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
  },
  navTabTextActive: {
    color: '#a855f7',
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
    height: 500,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 60,
    paddingTop: 120,
    backgroundColor: 'linear-gradient(transparent, rgba(10, 10, 15, 0.95))',
  },
  heroTitle: {
    fontSize: 56,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
  },
  heroMeta: {
    fontSize: 24,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 16,
  },
  heroDescription: {
    fontSize: 22,
    color: 'rgba(255, 255, 255, 0.8)',
    maxWidth: 700,
    lineHeight: 32,
    marginBottom: 24,
  },
  watchButton: {
    backgroundColor: '#7c3aed',
    paddingHorizontal: 40,
    paddingVertical: 18,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  watchButtonFocused: {
    backgroundColor: '#9333ea',
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
    width: 180,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 20,
    marginRight: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cardFocused: {
    backgroundColor: 'rgba(147, 51, 234, 0.2)',
    borderColor: '#9333ea',
    transform: [{ scale: 1.05 }],
  },
  channelLogo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
  },
  channelPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(147, 51, 234, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  channelNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#a855f7',
  },
  channelName: {
    fontSize: 18,
    color: '#ffffff',
    textAlign: 'center',
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
    backgroundColor: 'rgba(147, 51, 234, 0.1)',
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
    width: 200,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  gridChannelLogo: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
  },
  gridChannelPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(147, 51, 234, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  gridChannelName: {
    fontSize: 22,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
  },
  channelCategory: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
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
});
