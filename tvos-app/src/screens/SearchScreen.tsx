/**
 * SearchScreen - TV search with voice-first approach
 *
 * Features:
 * - Voice search primary (Menu button long-press)
 * - On-screen keyboard fallback
 * - Search suggestions (6 items per row)
 * - Category filters
 * - Siri TV search integration
 */

import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, FlatList, Pressable, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Search, Mic } from 'lucide-react-native';
import { api } from '@bayit/shared-services';
import { TVHeader } from '../components/TVHeader';
import { ContentCard } from '../components/ContentCard';
import { useVoiceTV } from '../hooks/useVoiceTV';
import { config } from '../config/appConfig';

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

export const SearchScreen: React.FC<SearchScreenProps> = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [focusedResultIndex, setFocusedResultIndex] = useState(0);

  const { startListening, isListening, transcript } = useVoiceTV();

  // Search API query
  const { data: searchResults, isLoading } = useQuery({
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
        navigation.navigate('Player', { channelId: result.id });
        break;
      case 'vod':
        navigation.navigate('Player', { vodId: result.id });
        break;
      case 'radio':
        navigation.navigate('Radio', { stationId: result.id });
        break;
      case 'podcast':
        navigation.navigate('Podcasts', { podcastId: result.id });
        break;
    }
  }, [navigation]);

  const renderCategory = useCallback(({ item }: { item: string }) => {
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

  const renderResult = useCallback(({ item, index }: { item: SearchResult; index: number }) => (
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
          <Text style={styles.title}>Search</Text>

          {/* Voice Search Button */}
          <Pressable
            onPress={startListening}
            style={[styles.voiceButton, isListening && styles.voiceButtonActive]}
            accessible
            accessibilityLabel="Voice search"
            hasTVPreferredFocus
          >
            <Mic size={28} color={isListening ? '#A855F7' : '#ffffff'} />
            <Text style={styles.voiceButtonText}>
              {isListening ? 'Listening...' : 'Voice Search'}
            </Text>
          </Pressable>
        </View>

        {/* Search Input */}
        <View style={styles.searchInputContainer}>
          <Search size={24} color="rgba(255,255,255,0.5)" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search for content..."
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
                <Text style={styles.loadingText}>Searching...</Text>
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
                <Text style={styles.emptyText}>No results found</Text>
                <Text style={styles.emptySubtext}>Try a different search term</Text>
              </View>
            )}
          </View>
        )}

        {/* Empty State */}
        {searchQuery.length === 0 && (
          <View style={styles.emptyContainer}>
            <Search size={64} color="rgba(255,255,255,0.3)" />
            <Text style={styles.emptyText}>Search for content</Text>
            <Text style={styles.emptySubtext}>
              Use voice search or type to find movies, shows, and more
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  content: {
    flex: 1,
    paddingHorizontal: config.tv.safeZoneMarginPt,
  },
  searchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 24,
  },
  title: {
    fontSize: config.tv.minTitleTextSizePt,
    fontWeight: '700',
    color: '#ffffff',
  },
  voiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    backgroundColor: 'rgba(20,20,35,0.85)',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  voiceButtonActive: {
    borderColor: '#A855F7',
    backgroundColor: 'rgba(168,85,247,0.1)',
  },
  voiceButtonText: {
    fontSize: config.tv.minButtonTextSizePt,
    fontWeight: '600',
    color: '#ffffff',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(20,20,35,0.85)',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    height: 68,
    fontSize: config.tv.minBodyTextSizePt,
    fontWeight: '400',
    color: '#ffffff',
  },
  categoriesContent: {
    gap: 12,
    marginBottom: 32,
  },
  categoryButton: {
    marginRight: 12,
  },
  category: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  categorySelected: {
    backgroundColor: '#A855F7',
    borderColor: '#A855F7',
  },
  categoryText: {
    fontSize: config.tv.minButtonTextSizePt,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
  },
  categoryTextSelected: {
    color: '#ffffff',
  },
  resultsContainer: {
    flex: 1,
  },
  resultsContent: {
    paddingBottom: config.tv.safeZoneMarginPt,
  },
  resultsRow: {
    gap: 16,
    marginBottom: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: config.tv.minBodyTextSizePt,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.7)',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: config.tv.minTitleTextSizePt,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: config.tv.minBodyTextSizePt,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
  },
});
