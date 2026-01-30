/**
 * FlowsScreen - Content flows and curated playlists for TV web app.
 *
 * Displays curated content playlists with category filtering
 * and flow selection for continuous playback.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { GlassView, GlassCategoryPill } from '../components';
import { colors, spacing } from '../theme';
import { useDirection } from '@bayit/shared/hooks';
import { contentService } from '../services/api';
import logger from '../utils/logger';

const flowsLogger = logger.scope('FlowsScreen');

interface Flow {
  id: string;
  title: string;
  description?: string;
  thumbnail?: string;
  item_count: number;
  duration_minutes?: number;
  category?: string;
}

export const FlowsScreen: React.FC = () => {
  const { t } = useTranslation();
  const { isRTL, textAlign } = useDirection();
  const navigation = useNavigation<any>();
  const [isLoading, setIsLoading] = useState(true);
  const [flows, setFlows] = useState<Flow[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = [
    { id: 'all', name: t('flows.categories.all', 'All') },
    { id: 'trending', name: t('flows.categories.trending', 'Trending') },
    { id: 'relaxing', name: t('flows.categories.relaxing', 'Relaxing') },
    { id: 'music', name: t('flows.categories.music', 'Music') },
    { id: 'educational', name: t('flows.categories.educational', 'Educational') },
  ];

  const loadFlows = useCallback(async () => {
    try {
      setIsLoading(true);
      const category = selectedCategory !== 'all' ? selectedCategory : undefined;
      const response = await contentService.getFlows(category);
      if (response?.flows && Array.isArray(response.flows)) {
        setFlows(response.flows);
      }
    } catch (err) {
      flowsLogger.error('Failed to load flows', err);
      setFlows([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedCategory]);

  useEffect(() => {
    loadFlows();
  }, [loadFlows]);

  const handleFlowPress = (flow: Flow) => {
    navigation.navigate('Player', {
      id: flow.id,
      title: flow.title,
      type: 'vod',
    });
  };

  const renderFlow = ({ item, index }: { item: Flow; index: number }) => (
    <TouchableOpacity
      onPress={() => handleFlowPress(item)}
      style={flowStyles.flowCard}
      activeOpacity={0.8}
    >
      <GlassView style={flowStyles.flowInner}>
        <View style={flowStyles.flowIcon}>
          <Text style={flowStyles.flowIconText}>▶</Text>
        </View>
        <Text style={[flowStyles.flowTitle, { textAlign }]} numberOfLines={2}>
          {item.title}
        </Text>
        {item.description && (
          <Text style={[flowStyles.flowDesc, { textAlign }]} numberOfLines={2}>
            {item.description}
          </Text>
        )}
        <Text style={flowStyles.flowMeta}>
          {item.item_count} {t('flows.items', 'items')}
          {item.duration_minutes ? ` • ${Math.round(item.duration_minutes)}m` : ''}
        </Text>
      </GlassView>
    </TouchableOpacity>
  );

  if (isLoading && flows.length === 0) {
    return (
      <View style={flowStyles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary?.DEFAULT || '#7e22ce'} />
        <Text style={flowStyles.loadingText}>{t('common.loading', 'Loading...')}</Text>
      </View>
    );
  }

  return (
    <View style={flowStyles.container}>
      <View style={[flowStyles.header, { flexDirection: isRTL ? 'row' : 'row-reverse' }]}>
        <View style={flowStyles.headerIcon}>
          <Text style={flowStyles.headerIconText}>🎬</Text>
        </View>
        <View>
          <Text style={[flowStyles.headerTitle, { textAlign }]}>{t('flows.title', 'Content Flows')}</Text>
          <Text style={[flowStyles.headerSubtitle, { textAlign }]}>
            {flows.length > 0
              ? `${flows.length} ${t('flows.available', 'flows available')}`
              : t('flows.curated', 'Curated playlists')}
          </Text>
        </View>
      </View>

      <View style={flowStyles.categoriesRow}>
        {categories.map((cat, index) => (
          <GlassCategoryPill
            key={cat.id}
            label={cat.name}
            isActive={selectedCategory === cat.id}
            onPress={() => setSelectedCategory(cat.id)}
            hasTVPreferredFocus={index === 0}
          />
        ))}
      </View>

      <FlatList
        data={flows}
        keyExtractor={(item) => item.id}
        numColumns={4}
        key="flows-grid"
        contentContainerStyle={{ paddingHorizontal: spacing.xl, paddingBottom: spacing['2xl'] }}
        renderItem={renderFlow}
        ListEmptyComponent={
          <View style={flowStyles.emptyContainer}>
            <Text style={flowStyles.emptyIcon}>🎬</Text>
            <Text style={flowStyles.emptyText}>{t('flows.empty', 'No flows available')}</Text>
            <Text style={flowStyles.emptyHint}>{t('flows.emptyHint', 'Check back later for curated content')}</Text>
          </View>
        }
      />
    </View>
  );
};

const flowStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0a1a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 48,
    paddingTop: 40,
    paddingBottom: 16,
  },
  headerIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(126,34,206,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 16,
  },
  headerIconText: {
    fontSize: 28,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 42,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 18,
    marginTop: 2,
  },
  categoriesRow: {
    flexDirection: 'row',
    paddingHorizontal: 48,
    marginBottom: 24,
    gap: 12,
  },
  flowCard: {
    flex: 1,
    maxWidth: '25%',
    padding: 8,
  },
  flowInner: {
    borderRadius: 16,
    padding: 20,
  },
  flowIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(126,34,206,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  flowIconText: {
    color: '#ffffff',
    fontSize: 20,
  },
  flowTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  flowDesc: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    marginBottom: 8,
  },
  flowMeta: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 13,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0f0a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 18,
    marginTop: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 12,
  },
  emptyText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyHint: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 16,
  },
});

export default FlowsScreen;
