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
  Image,} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Mic, Play, Clock, Calendar, AlertCircle } from 'lucide-react-native';
import { podcastService, Podcast } from '../services/api';
import { Colors } from '../theme/colors';

function PodcastCard({ podcast }: { podcast: Podcast }) {
  return (
    <Pressable style={styles.podcastCard}>
      <View style={styles.podcastIcon}>
        {podcast.cover ? (
          <Image source={{ uri: podcast.cover }} style={styles.podcastCover} resizeMode="cover" />
        ) : (
          <Mic size={28} color={Colors.Info.default} />
        )}
      </View>
      <View style={styles.podcastInfo}>
        <Text style={styles.podcastTitle} numberOfLines={1}>{podcast.title}</Text>
        {podcast.author && <Text style={styles.podcastHost}>{podcast.author}</Text>}
        <View style={styles.podcastMeta}>
          {podcast.episodeCount !== undefined && (
            <Text style={styles.episodeCount}>{podcast.episodeCount} {t('podcasts.episodes')}</Text>
          )}
          {podcast.category && (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>{podcast.category}</Text>
            </View>
          )}
        </View>
      </View>
      <Pressable style={styles.playButton}>
        <Play size={20} color={Colors.Text.primary} fill={Colors.Text.primary} />
      </Pressable>
    </Pressable>
  );
}

export function PodcastsScreenMobile() {
  const { t } = useTranslation();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('All');

  const CATEGORIES = [
    t('podcasts.categories.all'),
    t('podcasts.categories.news'),
    t('podcasts.categories.technology'),
    t('podcasts.categories.business'),
    t('podcasts.categories.culture'),
    t('podcasts.categories.sports'),
    t('podcasts.categories.education'),
    t('podcasts.categories.comedy')
  ];

  const loadPodcasts = async () => {
    try {
      setError(null);
      const params = selectedCategory !== 'All' ? { category: selectedCategory.toLowerCase() } : {};
      const data = await podcastService.getShows(params);
      setPodcasts(data.shows || []);
    } catch (err) {
      setError(t('podcasts.loadError'));
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
          <Mic size={24} color={Colors.Info.default} strokeWidth={2} />
          <Text style={styles.headerTitle}>{t('listen.title')}</Text>
        </View>
        {podcasts.length > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{podcasts.length}</Text>
          </View>
        )}
      </View>

      {/* Podcasts Section Label */}
      <Text style={styles.sectionLabel}>{t('podcasts.title')}</Text>

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
          <Text style={styles.loadingText}>{t('podcasts.loading')}</Text>
        </View>
      )}

      {/* Error State */}
      {error && !loading && (
        <View style={styles.centerContent}>
          <AlertCircle size={48} color={Colors.Error.e600} />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={loadPodcasts}>
            <Text style={styles.retryText}>{t('common.retry')}</Text>
          </Pressable>
        </View>
      )}

      {/* Podcasts List */}
      {!loading && !error && (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.podcastsList}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.Info.default} />
          }
        >
          {filteredPodcasts.length === 0 ? (
            <View style={styles.emptyState}>
              <Mic size={48} color={Colors.Text.disabled} />
              <Text style={styles.emptyText}>{t('podcasts.noPodcastsFound')}</Text>
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
  container: { flex: 1, backgroundColor: Colors.Background.primary },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: Colors.Text.primary },
  sectionLabel: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.Text.primary,
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  countBadge: {
    backgroundColor: Colors.Glass.borderLight,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countText: { color: Colors.Info.default, fontSize: 14, fontWeight: '600' },
  categoryContainer: { maxHeight: 50 },
  categoryContent: { paddingHorizontal: 16, gap: 8 },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.Glass.bgLight,
    borderWidth: 1,
    borderColor: Colors.Glass.borderLight,
  },
  categoryChipActive: { backgroundColor: Colors.Glass.borderLight, borderColor: Colors.Info.default },
  categoryText: { color: Colors.Text.secondary, fontSize: 14, fontWeight: '500' },
  categoryTextActive: { color: Colors.Info.default },
  scrollView: { flex: 1 },
  podcastsList: { padding: 16, gap: 12 },
  podcastCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.Glass.bgLight,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.Glass.borderLight,
    gap: 16,
  },
  podcastIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: Colors.Glass.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  podcastCover: { width: 56, height: 56, borderRadius: 12 },
  podcastInfo: { flex: 1 },
  podcastTitle: { fontSize: 16, fontWeight: '600', color: Colors.Text.primary, marginBottom: 2 },
  podcastHost: { fontSize: 13, color: Colors.Info.default, marginBottom: 6 },
  podcastMeta: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  episodeCount: { fontSize: 11, color: Colors.Text.muted },
  categoryBadge: {
    backgroundColor: Colors.Glass.borderLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  categoryBadgeText: { fontSize: 10, color: Colors.Info.default },
  playButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.Info.default,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: { color: Colors.Text.muted, fontSize: 16 },
  errorText: { color: Colors.Error.e600, fontSize: 16, textAlign: 'center', paddingHorizontal: 32 },
  retryButton: {
    backgroundColor: Colors.Glass.borderLight,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: { color: Colors.Info.default, fontSize: 16, fontWeight: '600' },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
    gap: 16,
  },
  emptyText: { color: Colors.Text.muted, fontSize: 16 },
});
