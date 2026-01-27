/**
 * VOD Screen Mobile
 * Glass UI styled video on demand content grid with real production data
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
  Image,
  ActivityIndicator,
} from 'react-native';
import { Film, Play, Search, Star, Clock, AlertCircle } from 'lucide-react-native';
import { contentService, ContentItem } from '../services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2;

const CATEGORIES = ['All', 'Movies', 'Series', 'Action', 'Drama', 'Comedy', 'Documentary'];

function ContentCard({ item }: { item: ContentItem }) {
  return (
    <Pressable style={styles.contentCard}>
      <View style={styles.cardThumbnail}>
        {item.poster ? (
          <Image source={{ uri: item.poster }} style={styles.cardPoster} resizeMode="cover" />
        ) : (
          <Film size={32} color="rgba(74, 158, 255, 0.5)" />
        )}
        <View style={styles.playOverlay}>
          <Play size={24} color="#fff" fill="#fff" />
        </View>
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
        <View style={styles.cardMeta}>
          {item.rating && (
            <View style={styles.ratingBadge}>
              <Star size={10} color="#ffc107" fill="#ffc107" />
              <Text style={styles.ratingText}>{item.rating}</Text>
            </View>
          )}
          {item.year && <Text style={styles.yearText}>{item.year}</Text>}
        </View>
        {item.duration && (
          <View style={styles.durationRow}>
            <Clock size={10} color="rgba(255, 255, 255, 0.5)" />
            <Text style={styles.durationText}>{item.duration}</Text>
          </View>
        )}
        {item.category && (
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText}>{item.category}</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

export function VODScreenMobile() {
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [content, setContent] = useState<ContentItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('All');

  const loadContent = async () => {
    try {
      setError(null);
      const data = await contentService.getAll();
      setContent(data.items || []);
    } catch (err) {
      setError('Failed to load content. Please check your connection.');
      setContent([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContent();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadContent();
    setRefreshing(false);
  };

  const filteredContent = selectedCategory === 'All'
    ? content
    : selectedCategory === 'Movies'
    ? content.filter(c => c.type === 'movie')
    : selectedCategory === 'Series'
    ? content.filter(c => c.type === 'series')
    : content.filter(c => c.category?.toLowerCase() === selectedCategory.toLowerCase());

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Film size={24} color="#4a9eff" strokeWidth={2} />
          <Text style={styles.headerTitle}>VOD</Text>
        </View>
        <Pressable style={styles.iconButton}>
          <Search size={20} color="#fff" />
        </Pressable>
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
          <Text style={styles.loadingText}>Loading content...</Text>
        </View>
      )}

      {/* Error State */}
      {error && !loading && (
        <View style={styles.centerContent}>
          <AlertCircle size={48} color="#e53935" />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={loadContent}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      )}

      {/* Content Grid */}
      {!loading && !error && (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.contentGrid}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4a9eff" />
          }
        >
          {filteredContent.length === 0 ? (
            <View style={styles.emptyState}>
              <Film size={48} color="rgba(255, 255, 255, 0.3)" />
              <Text style={styles.emptyText}>No content found</Text>
            </View>
          ) : (
            filteredContent.map((item) => (
              <ContentCard key={item.id} item={item} />
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
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
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
  contentGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 16, gap: 12 },
  contentCard: {
    width: CARD_WIDTH,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cardThumbnail: {
    height: 100,
    backgroundColor: 'rgba(74, 158, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  cardPoster: {
    width: '100%',
    height: '100%',
  },
  playOverlay: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardInfo: { padding: 12 },
  cardTitle: { fontSize: 14, fontWeight: '600', color: '#fff', marginBottom: 6 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingText: { fontSize: 11, color: '#ffc107', fontWeight: '600' },
  yearText: { fontSize: 11, color: 'rgba(255, 255, 255, 0.5)' },
  durationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  durationText: { fontSize: 11, color: 'rgba(255, 255, 255, 0.5)' },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(74, 158, 255, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 4,
  },
  categoryBadgeText: { fontSize: 10, color: '#4a9eff' },
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
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
    gap: 16,
  },
  emptyText: { color: 'rgba(255, 255, 255, 0.5)', fontSize: 16 },
});
