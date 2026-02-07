/**
 * SearchScreen - TV search with voice-first approach
 * Voice search primary (Menu button), on-screen keyboard fallback, category filters
 */

import React, { useState, useCallback} from 'react';
import { View, Text, TextInput, FlatList, Pressable} from 'react-native';
import { useTranslation} from 'react-i18next';
import { useQuery} from '@tanstack/react-query';
import { Search, Mic} from 'lucide-react-native';
import { api} from '@bayit/shared-services';
import { TVHeader} from '../components/TVHeader';
import { ContentCard} from '../components/ContentCard';
import { useVoiceTV} from '../hooks/useVoiceTV';
import { config} from '../config/appConfig';
import { styles } from './styles/SearchScreen.styles';

interface SearchResult {
  id: string;
  title: string;
  subtitle?: string;
  thumbnail?: string;
  type: 'live_channel' | 'vod' | 'radio' | 'podcast';
}

interface SearchScreenProps {
  navigation: any;
}

const CATEGORIES = ['All', 'Live TV', 'Movies', 'Series', 'Radio', 'Podcasts'];

export const SearchScreen: React.FC<SearchScreenProps> = ({ navigation}) => {
  const { t} = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [focusedResultIndex, setFocusedResultIndex] = useState(0);

  const { startListening, isListening, transcript} = useVoiceTV();

  // Search API query
  const { data: searchResults, isLoading} = useQuery({
    queryKey: ['search', searchQuery, selectedCategory],
    queryFn: async () => {
      const response = await api.get('/search', {
        params: {
          q: searchQuery,
          category: selectedCategory === 'All' ? undefined : selectedCategory,
       },
     });
      return response.data;
   },
    enabled: searchQuery.length >= 2,
 });

  // Update search from voice transcript
  React.useEffect(() => {
    if (transcript) {
      setSearchQuery(transcript);
   }
 }, [transcript]);

  const handleResultSelect = useCallback((result: SearchResult) => {
    switch (result.type) {
      case 'live_channel':
        navigation.navigate('Player', { channelId: result.id});
        break;
      case 'vod':
        navigation.navigate('Player', { vodId: result.id});
        break;
      case 'radio':
        navigation.navigate('Radio', { stationId: result.id});
        break;
      case 'podcast':
        navigation.navigate('Podcasts', { podcastId: result.id});
        break;
   }
 }, [navigation]);

  const renderCategory = useCallback(({ item}: { item: string}) => {
    const isSelected = selectedCategory === item;

    return (
      <Pressable
        onPress={() => setSelectedCategory(item)}
        accessible
        accessibilityLabel={`Filter by ${item}`}
        style={styles.categoryButton}
      >
        <View style={[styles.category, isSelected && styles.categorySelected]}>
          <Text style={[styles.categoryText, isSelected && styles.categoryTextSelected]}>
            {item}
          </Text>
        </View>
      </Pressable>
    );
 }, [selectedCategory]);

  const renderResult = useCallback(({ item, index}: { item: SearchResult; index: number}) => (
    <ContentCard
      id={item.id}
      title={item.title}
      subtitle={item.subtitle}
      thumbnail={item.thumbnail}
      type={item.type}
      focused={focusedResultIndex === index}
      hasTVPreferredFocus={index === 0}
      onPress={() => handleResultSelect(item)}
    />
  ), [focusedResultIndex, handleResultSelect]);

  return (
    <View style={styles.container}>
      <TVHeader currentScreen="search" navigation={navigation} />

      <View style={styles.content}>
        {/* Search Header */}
        <View style={styles.searchHeader}>
          <Text style={styles.title}>{t('tvos.search.title', 'Search')}</Text>

          {/* Voice Search Button */}
          <Pressable
            onPress={startListening}
            style={[styles.voiceButton, isListening && styles.voiceButtonActive]}
            accessible
            accessibilityLabel={t('tvos.search.voiceSearch')}
            hasTVPreferredFocus
          >
            <Mic size={28} color={isListening ? '#A855F7' : '#ffffff'} />
            <Text style={styles.voiceButtonText}>
              {isListening ? t('tvos.search.listening', 'Listening...') : t('tvos.search.voiceSearch', 'Voice Search')}
            </Text>
          </Pressable>
        </View>

        {/* Search Input */}
        <View style={styles.searchInputContainer}>
          <Search size={24} color="rgba(255,255,255,0.5)" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('tvos.search.placeholder', 'Search for content...')}
            placeholderTextColor="rgba(255,255,255,0.5)"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus={false}
            returnKeyType="search"
          />
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

        {/* Search Results */}
        {searchQuery.length >= 2 && (
          <View style={styles.resultsContainer}>
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>{t('tvos.search.searching', 'Searching...')}</Text>
              </View>
            ) : searchResults && searchResults.length > 0 ? (
              <FlatList
                data={searchResults}
                renderItem={renderResult}
                keyExtractor={(item: SearchResult) => item.id}
                numColumns={6}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.resultsContent}
                columnWrapperStyle={styles.resultsRow}
              />
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>{t('tvos.search.noResults', 'No results found')}</Text>
                <Text style={styles.emptySubtext}>{t('tvos.search.tryDifferent', 'Try a different search term')}</Text>
              </View>
            )}
          </View>
        )}

        {/* Empty State */}
        {searchQuery.length === 0 && (
          <View style={styles.emptyContainer}>
            <Search size={64} color="rgba(255,255,255,0.3)" />
            <Text style={styles.emptyText}>{t('tvos.search.searchForContent', 'Search for content')}</Text>
            <Text style={styles.emptySubtext}>
              {t('tvos.search.useVoiceOrType', 'Use voice search or type to find movies, shows, and more')}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

