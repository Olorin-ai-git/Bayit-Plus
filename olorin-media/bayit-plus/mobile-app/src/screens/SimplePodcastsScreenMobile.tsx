/**
 * Podcasts Screen Mobile
 * Glass UI styled podcasts listing with real production data
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  RefreshControl,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Mic, Play, Clock, Calendar, AlertCircle } from 'lucide-react-native';
import { podcastService, Podcast } from '../services/api';

const CATEGORIES = ['All', 'News', 'Technology', 'Business', 'Culture', 'Sports', 'Education', 'Comedy'];

function PodcastCard({ podcast }: { podcast: Podcast }) {
  return (
    <Pressable style={styles.podcastCard}>
      <View style={styles.podcastIcon}>
        {podcast.cover ? (
          <Image source={{ uri: podcast.cover }} style={styles.podcastCover} resizeMode="cover" />
        ) : (
          <Mic size={28} color="#4a9eff" />
        )}
      </View>
      <View style={styles.podcastInfo}>
        <Text style={styles.podcastTitle} numberOfLines={1}>{podcast.title}</Text>
        {podcast.author && <Text style={styles.podcastHost}>{podcast.author}</Text>}
        <View style={styles.podcastMeta}>
          {podcast.episodeCount !== undefined && (
            <Text style={styles.episodeCount}>{podcast.episodeCount} episodes</Text>
          )}
          {podcast.category && (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>{podcast.category}</Text>
            </View>
          )}
        </View>
      </View>
      <Pressable style={styles.playButton}>
        <Play size={20} color="#fff" fill="#fff" />
      </Pressable>
    </Pressable>
  );
}

export function PodcastsScreenMobile() {
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('All');

  const loadPodcasts = async () => {
    try {
      setError(null);
      const params = selectedCategory !== 'All' ? { category: selectedCategory.toLowerCase() } : {};
      const data = await podcastService.getShows(params);
      setPodcasts(data.shows || []);
    } catch (err) {
      setError('Failed to load podcasts. Please check your connection.');
      setPodcasts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    loadPodcasts();
  }, [selectedCategory]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPodcasts();
    setRefreshing(false);
  };

  const filteredPodcasts = selectedCategory === 'All'
    ? podcasts
    : podcasts.filter(p => p.category?.toLowerCase() === selectedCategory.toLowerCase());

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Mic size={24} color="#4a9eff" strokeWidth={2} />
          <Text style={styles.headerTitle}>Podcasts</Text>
        </View>
        {podcasts.length > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{podcasts.length}</Text>
          </View>
        )}
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
          <ActivityIndicator size="large" color="#4a9eff" />
          <Text style={styles.loadingText}>Loading podcasts...</Text>
        </View>
      )}

      {/* Error State */}
      {error && !loading && (
        <View style={styles.centerContent}>
          <AlertCircle size={48} color="#e53935" />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={loadPodcasts}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      )}

      {/* Podcasts List */}
      {!loading && !error && (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.podcastsList}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4a9eff" />
          }
        >
          {filteredPodcasts.length === 0 ? (
            <View style={styles.emptyState}>
              <Mic size={48} color="rgba(255, 255, 255, 0.3)" />
              <Text style={styles.emptyText}>No podcasts found</Text>
            </View>
          ) : (
            filteredPodcasts.map((podcast) => (
              <PodcastCard key={podcast.id} podcast={podcast} />
            ))
          )}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d1a' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  countBadge: {
    backgroundColor: 'rgba(74, 158, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countText: { color: '#4a9eff', fontSize: 14, fontWeight: '600' },
  categoryContainer: { maxHeight: 50 },
  categoryContent: { paddingHorizontal: 16, gap: 8 },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  categoryChipActive: { backgroundColor: 'rgba(74, 158, 255, 0.2)', borderColor: '#4a9eff' },
  categoryText: { color: 'rgba(255, 255, 255, 0.7)', fontSize: 14, fontWeight: '500' },
  categoryTextActive: { color: '#4a9eff' },
  scrollView: { flex: 1 },
  podcastsList: { padding: 16, gap: 12 },
  podcastCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    gap: 16,
  },
  podcastIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: 'rgba(74, 158, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  podcastCover: { width: 56, height: 56, borderRadius: 12 },
  podcastInfo: { flex: 1 },
  podcastTitle: { fontSize: 16, fontWeight: '600', color: '#fff', marginBottom: 2 },
  podcastHost: { fontSize: 13, color: '#4a9eff', marginBottom: 6 },
  podcastMeta: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  episodeCount: { fontSize: 11, color: 'rgba(255, 255, 255, 0.5)' },
  categoryBadge: {
    backgroundColor: 'rgba(74, 158, 255, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  categoryBadgeText: { fontSize: 10, color: '#4a9eff' },
  playButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#4a9eff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: { color: 'rgba(255, 255, 255, 0.6)', fontSize: 16 },
  errorText: { color: '#e53935', fontSize: 16, textAlign: 'center', paddingHorizontal: 32 },
  retryButton: {
    backgroundColor: 'rgba(74, 158, 255, 0.2)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: { color: '#4a9eff', fontSize: 16, fontWeight: '600' },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
    gap: 16,
  },
  emptyText: { color: 'rgba(255, 255, 255, 0.5)', fontSize: 16 },
});
