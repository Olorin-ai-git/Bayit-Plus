/**
 * FlowsScreen - Content flows and playlists
 *
 * Features:
 * - Curated content playlists
 * - Continuous playback flows
 * - Themed collections
 * - Auto-play sequences
 */

import React, { useState} from 'react';
import { View, Text, FlatList, Pressable,Image} from 'react-native';
import { useQuery} from '@tanstack/react-query';
import { useTranslation} from 'react-i18next';
import { Play, List, Shuffle} from 'lucide-react-native';
import { api} from '@bayit/shared-services';
import { TVHeader} from '../components/TVHeader';
import { queryKeys} from '../config/queryClient';
import { config} from '../config/appConfig';
import { styles } from './styles/FlowsScreen.styles';

interface Flow {
  id: string;
  title: string;
  description?: string;
  thumbnail?: string;
  item_count: number;
  duration_minutes?: number;
  category?: string;
  is_shuffle?: boolean;
}

const CATEGORIES = ['All', 'Trending', 'Relaxing', 'Comedy', 'News', 'Music', 'Educational'];

export const FlowsScreen: React.FC<{ navigation: any}> = ({ navigation}) => {
  const { t} = useTranslation();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [focusedFlow, setFocusedFlow] = useState<string | null>(null);

  const { data: flows, isLoading} = useQuery({
    queryKey: queryKeys.flows.all(selectedCategory),
    queryFn: async () => {
      const response = await api.get('/content/flows', {
        params: {
          category: selectedCategory === 'All' ? undefined : selectedCategory,
       },
     });
      return response.data;
   },
 });

  const handleFlowSelect = (flow: Flow) => {
    navigation.navigate('FlowPlayer', { flowId: flow.id});
 };

  const renderCategory = ({ item}: { item: string}) => {
    const isSelected = selectedCategory === item;
    return (
      <Pressable onPress={() => setSelectedCategory(item)} style={styles.categoryButton}>
        <View style={[styles.category, isSelected && styles.categorySelected]}>
          <Text style={[styles.categoryText, isSelected && styles.categoryTextSelected]}>
            {item}
          </Text>
        </View>
      </Pressable>
    );
 };

  const renderFlow = ({ item, index}: { item: Flow; index: number}) => {
    const isFocused = focusedFlow === item.id;
    const durationHours = item.duration_minutes
      ? Math.floor(item.duration_minutes / 60)
      : 0;
    const durationMins = item.duration_minutes
      ? item.duration_minutes % 60
      : 0;

    return (
      <Pressable
        onPress={() => handleFlowSelect(item)}
        onFocus={() => setFocusedFlow(item.id)}
        hasTVPreferredFocus={index === 0}
        style={styles.flowButton}
      >
        <View style={[styles.flowCard, isFocused && styles.flowCardFocused]}>
          {/* Thumbnail */}
          <View style={styles.thumbnailContainer}>
            {item.thumbnail ? (
              <Image source={{ uri: item.thumbnail}} style={styles.thumbnail} />
            ) : (
              <View style={styles.thumbnailPlaceholder}>
                <List size={48} color="#A855F7" />
              </View>
            )}
            {/* Play Overlay */}
            {isFocused && (
              <View style={styles.playOverlay}>
                <Play size={40} color="#ffffff" fill="#ffffff" />
              </View>
            )}
          </View>

          {/* Info */}
          <View style={styles.flowInfo}>
            <Text style={styles.flowTitle} numberOfLines={2}>
              {item.title}
            </Text>
            {item.description && (
              <Text style={styles.flowDescription} numberOfLines={2}>
                {item.description}
              </Text>
            )}
            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <List size={16} color="rgba(255,255,255,0.6)" />
                <Text style={styles.metaText}>{item.item_count} {t('tvos.flows.items')}</Text>
              </View>
              {item.duration_minutes && (
                <View style={styles.metaItem}>
                  <Text style={styles.metaText}>
                    {durationHours > 0 && `${durationHours}h `}
                    {durationMins}m
                  </Text>
                </View>
              )}
              {item.is_shuffle && (
                <View style={styles.shuffleBadge}>
                  <Shuffle size={16} color="#A855F7" />
                </View>
              )}
            </View>
          </View>
        </View>
      </Pressable>
    );
 };

  return (
    <View style={styles.container}>
      <TVHeader currentScreen="flows" navigation={navigation} />

      <View style={styles.content}>
        <View style={styles.headerRow}>
          <List size={48} color="#A855F7" />
          <Text style={styles.title}>{t('tvos.flows.title')}</Text>
        </View>

        {/* Category Filters */}
        <FlatList
          horizontal
          data={CATEGORIES}
          renderItem={renderCategory}
          keyExtractor={(item) => item}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContent}
        />

        {/* Flows Grid */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>{t('tvos.flows.loading')}</Text>
          </View>
        ) : flows && flows.length > 0 ? (
          <FlatList
            data={flows}
            renderItem={renderFlow}
            keyExtractor={(item: Flow) => item.id}
            numColumns={4}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.gridContent}
            columnWrapperStyle={styles.gridRow}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <List size={64} color="rgba(255,255,255,0.3)" />
            <Text style={styles.emptyText}>{t('tvos.flows.empty')}</Text>
          </View>
        )}
      </View>
    </View>
  );
};

