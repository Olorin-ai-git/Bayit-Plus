/**
 * FavoritesScreen - User's favorited content
 *
 * Features:
 * - Favorited movies, series, channels, podcasts
 * - Category filters (All, Movies, Series, Live TV, Radio, Podcasts)
 * - 6-column grid layout
 * - Quick access to favorites
 */

import React, { useState} from 'react';
import { View, Text, FlatList, Pressable, StyleSheet} from 'react-native';
import { useQuery} from '@tanstack/react-query';
import { useTranslation} from 'react-i18next';
import { Star} from 'lucide-react-native';
import { api} from '@bayit/shared-services';
import { TVHeader} from '../components/TVHeader';
import { ContentCard} from '../components/ContentCard';
import { queryKeys} from '../config/queryClient';
import { config} from '../config/appConfig';
import { styles } from './styles/FavoritesScreen.styles';

interface FavoriteItem {
  id: string;
  title: string;
  subtitle?: string;
  thumbnail?: string;
  type: 'movie' | 'series' | 'channel' | 'radio' | 'podcast';
  added_at: string;
}

const CATEGORIES = ['All', 'Movies', 'Series', 'Live TV', 'Radio', 'Podcasts'];

export const FavoritesScreen: React.FC<{ navigation: any}> = ({ navigation}) => {
  const { t} = useTranslation();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [focusedIndex, setFocusedIndex] = useState(0);

  const { data: favorites, isLoading} = useQuery({
    queryKey: queryKeys.user.favorites(selectedCategory),
    queryFn: async () => {
      const response = await api.get('/user/favorites', {
        params: {
          category: selectedCategory === 'All' ? undefined : selectedCategory.toLowerCase(),
       },
     });
      return response.data;
   },
 });

  const handleItemSelect = (item: FavoriteItem) => {
    switch (item.type) {
      case 'movie':
      case 'series':
        navigation.navigate('Player', { vodId: item.id});
        break;
      case 'channel':
        navigation.navigate('Player', { channelId: item.id});
        break;
      case 'radio':
        navigation.navigate('Player', { stationId: item.id});
        break;
      case 'podcast':
        navigation.navigate('Player', { podcastId: item.id});
        break;
   }
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

  const renderItem = ({ item, index}: { item: FavoriteItem; index: number}) => (
    <ContentCard
      id={item.id}
      title={item.title}
      subtitle={item.subtitle}
      thumbnail={item.thumbnail}
      type={item.type}
      focused={focusedIndex === index}
      hasTVPreferredFocus={index === 0}
      onPress={() => handleItemSelect(item)}
    />
  );

  return (
    <View style={styles.container}>
      <TVHeader currentScreen="favorites" navigation={navigation} />

      <View style={styles.content}>
        <View style={styles.headerRow}>
          <Star size={48} color="#A855F7" />
          <Text style={styles.title}>{t('tvos.favorites.title')}</Text>
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

        {/* Favorites Grid */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>{t('tvos.favorites.loading')}</Text>
          </View>
        ) : favorites && favorites.length > 0 ? (
          <FlatList
            data={favorites}
            renderItem={renderItem}
            keyExtractor={(item: FavoriteItem) => item.id}
            numColumns={6}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.gridContent}
            columnWrapperStyle={styles.gridRow}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Star size={64} color="rgba(255,255,255,0.3)" />
            <Text style={styles.emptyText}>{t('tvos.favorites.empty')}</Text>
            <Text style={styles.emptySubtext}>
              {t('tvos.favorites.emptyHint')}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

