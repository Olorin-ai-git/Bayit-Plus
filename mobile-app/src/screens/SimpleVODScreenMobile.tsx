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
  Image,} from 'react-native';
import { Film, Play, Search, Star, Clock, AlertCircle } from 'lucide-react-native';
import { contentService, ContentItem } from '../services/api';
import { Colors } from '../theme/colors';

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
          <Film size={32} color={Colors.Info.i400} />
        )}
        <View style={styles.playOverlay}>
          <Play size={24} color={Colors.Text.primary} fill={Colors.Text.primary} />
        </View>
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
        <View style={styles.cardMeta}>
          {item.rating && (
            <View style={styles.ratingBadge}>
              <Star size={10} color={Colors.Warning.default} fill={Colors.Warning.default} />
              <Text style={styles.ratingText}>{item.rating}</Text>
            </View>
          )}
          {item.year && <Text style={styles.yearText}>{item.year}</Text>}
        </View>
        {item.duration && (
          <View style={styles.durationRow}>
            <Clock size={10} color={Colors.Text.muted} />
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
          <Film size={24} color={Colors.Info.default} strokeWidth={2} />
          <Text style={styles.headerTitle}>VOD</Text>
        </View>
        <Pressable style={styles.iconButton}>
          <Search size={20} color={Colors.Text.primary} />
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
          <GlassLoadingSpinner size="large" />
          <Text style={styles.loadingText}>Loading content...</Text>
        </View>
      )}

      {/* Error State */}
      {error && !loading && (
        <View style={styles.centerContent}>
          <AlertCircle size={48} color={Colors.Error.e600} />
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
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.Info.default} />
          }
        >
          {filteredContent.length === 0 ? (
            <View style={styles.emptyState}>
              <Film size={48} color={Colors.Text.disabled} />
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
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.Glass.bgLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
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
  contentGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 16, gap: 12 },
  contentCard: {
    width: CARD_WIDTH,
    backgroundColor: Colors.Glass.bgLight,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.Glass.borderLight,
  },
  cardThumbnail: {
    height: 100,
    backgroundColor: Colors.Glass.borderLight,
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
    backgroundColor: Colors.Glass.bgMedium,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardInfo: { padding: 12 },
  cardTitle: { fontSize: 14, fontWeight: '600', color: Colors.Text.primary, marginBottom: 6 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingText: { fontSize: 11, color: Colors.Warning.default, fontWeight: '600' },
  yearText: { fontSize: 11, color: Colors.Text.muted },
  durationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  durationText: { fontSize: 11, color: Colors.Text.muted },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.Glass.borderLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 4,
  },
  categoryBadgeText: { fontSize: 10, color: Colors.Info.default },
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
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
    gap: 16,
  },
  emptyText: { color: Colors.Text.muted, fontSize: 16 },
});
