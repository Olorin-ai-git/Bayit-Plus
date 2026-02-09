/**
 * Live TV Screen Mobile
 * Glass UI styled live TV channel grid with real production data
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Dimensions,
  RefreshControl,
  Image,} from 'react-native';
import { Tv, Play, Search, Filter, AlertCircle } from 'lucide-react-native';
import { liveService, Channel } from '../services/api';
import { Colors } from '../theme/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2;

const CATEGORIES = ['All', 'News', 'Sports', 'Movies', 'Entertainment', 'Kids', 'Music'];

function GlassCard({ children, style, onPress }: { children: React.ReactNode; style?: any; onPress?: () => void }) {
  const content = (
    <View style={[styles.glassCard, style]}>
      {children}
    </View>
  );

  if (onPress) {
    return <Pressable onPress={onPress}>{content}</Pressable>;
  }
  return content;
}

function ChannelCard({ channel }: { channel: Channel }) {
  return (
    <GlassCard style={styles.channelCard} onPress={() => {}}>
      <View style={styles.channelHeader}>
        <View style={styles.channelIcon}>
          {channel.logo ? (
            <Image source={{ uri: channel.logo }} style={styles.channelLogo} resizeMode="contain" />
          ) : (
            <Text style={styles.channelNumberText}>{channel.number || '?'}</Text>
          )}
        </View>
        {channel.isLive && (
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        )}
      </View>
      <Text style={styles.channelName} numberOfLines={1}>{channel.name}</Text>
      {channel.currentShow && (
        <Text style={styles.currentShow} numberOfLines={1}>{channel.currentShow}</Text>
      )}
      {channel.category && (
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryBadgeText}>{channel.category}</Text>
        </View>
      )}
      <Pressable style={styles.playButton}>
        <Play size={16} color={Colors.Text.primary} fill={Colors.Text.primary} />
        <Text style={styles.playButtonText}>Watch</Text>
      </Pressable>
    </GlassCard>
  );
}

export function LiveTVScreenMobile() {
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('All');

  const loadChannels = async () => {
    try {
      setError(null);
      const data = await liveService.getChannels();
      setChannels(data.channels || []);
    } catch (err) {
      setError('Failed to load channels. Please check your connection.');
      setChannels([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChannels();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadChannels();
    setRefreshing(false);
  };

  const filteredChannels = selectedCategory === 'All'
    ? channels
    : channels.filter(c => c.category?.toLowerCase() === selectedCategory.toLowerCase());

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Tv size={24} color={Colors.Info.default} strokeWidth={2} />
          <Text style={styles.headerTitle}>Live TV</Text>
        </View>
        <View style={styles.headerRight}>
          <Pressable style={styles.iconButton}>
            <Search size={20} color={Colors.Text.primary} />
          </Pressable>
          <Pressable style={styles.iconButton}>
            <Filter size={20} color={Colors.Text.primary} />
          </Pressable>
        </View>
      </View>

      {/* Category Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryContainer}
        contentContainerStyle={styles.categoryContent}
      >
        {CATEGORIES.map((category) => (
          <Pressable
            key={category}
            style={[
              styles.categoryChip,
              selectedCategory === category && styles.categoryChipActive,
            ]}
            onPress={() => setSelectedCategory(category)}
          >
            <Text
              style={[
                styles.categoryText,
                selectedCategory === category && styles.categoryTextActive,
              ]}
            >
              {category}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Loading State */}
      {loading && (
        <View style={styles.centerContent}>
          <GlassLoadingSpinner size="large" />
          <Text style={styles.loadingText}>Loading channels...</Text>
        </View>
      )}

      {/* Error State */}
      {error && !loading && (
        <View style={styles.centerContent}>
          <AlertCircle size={48} color={Colors.Error.e600} />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={loadChannels}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      )}

      {/* Channel Grid */}
      {!loading && !error && (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.channelGrid}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.Info.default} />
          }
        >
          {filteredChannels.length === 0 ? (
            <View style={styles.emptyState}>
              <Tv size={48} color={Colors.Text.disabled} />
              <Text style={styles.emptyText}>No channels found</Text>
            </View>
          ) : (
            filteredChannels.map((channel) => (
              <ChannelCard key={channel.id} channel={channel} />
            ))
          )}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.Background.primary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.Text.primary,
  },
  headerRight: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.Glass.bgLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Category Filter
  categoryContainer: {
    maxHeight: 50,
  },
  categoryContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.Glass.bgLight,
    borderWidth: 1,
    borderColor: Colors.Glass.borderLight,
  },
  categoryChipActive: {
    backgroundColor: Colors.Glass.borderLight,
    borderColor: Colors.Info.default,
  },
  categoryText: {
    color: Colors.Text.secondary,
    fontSize: 14,
    fontWeight: '500',
  },
  categoryTextActive: {
    color: Colors.Info.default,
  },
  // Channel Grid
  scrollView: {
    flex: 1,
  },
  channelGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  // Glass Card
  glassCard: {
    backgroundColor: Colors.Glass.bgLight,
    borderWidth: 1,
    borderColor: Colors.Glass.borderLight,
    borderRadius: 12,
    padding: 16,
  },
  // Channel Card
  channelCard: {
    width: CARD_WIDTH,
  },
  channelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  channelIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.Glass.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  channelLogo: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  channelNumberText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.Info.default,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.Error.e600,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  liveDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.Text.primary,
  },
  liveText: {
    color: Colors.Text.primary,
    fontSize: 8,
    fontWeight: 'bold',
  },
  channelName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.Text.primary,
    marginBottom: 4,
  },
  currentShow: {
    fontSize: 12,
    color: Colors.Text.muted,
    marginBottom: 8,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.Glass.borderLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginBottom: 12,
  },
  categoryBadgeText: {
    fontSize: 10,
    color: Colors.Info.default,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    color: Colors.Text.muted,
    fontSize: 16,
  },
  errorText: {
    color: Colors.Error.e600,
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  retryButton: {
    backgroundColor: Colors.Glass.borderLight,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: Colors.Info.default,
    fontSize: 16,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
    gap: 16,
  },
  emptyText: {
    color: Colors.Text.muted,
    fontSize: 16,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.Info.default,
    paddingVertical: 8,
    borderRadius: 8,
  },
  playButtonText: {
    color: Colors.Text.primary,
    fontWeight: '600',
    fontSize: 14,
  },
});
