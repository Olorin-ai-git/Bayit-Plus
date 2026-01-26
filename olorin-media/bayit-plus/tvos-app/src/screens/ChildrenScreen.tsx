/**
 * ChildrenScreen - Kids-safe content
 *
 * Features:
 * - Age-appropriate content filtering
 * - Colorful, kid-friendly UI
 * - Parental controls indicator
 * - Cartoons, educational content, kids shows
 */

import React, { useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Baby, Star, Film, Tv } from 'lucide-react-native';
import { api } from '@bayit/shared-services';
import { TVHeader } from '../components/TVHeader';
import { ContentCard } from '../components/ContentCard';
import { queryKeys } from '../config/queryClient';
import { config } from '../config/appConfig';

interface KidsContent {
  id: string;
  title: string;
  subtitle?: string;
  thumbnail?: string;
  type: 'movie' | 'series' | 'episode';
  age_rating: string;
  is_educational?: boolean;
}

const AGE_GROUPS = ['All Ages', '3-5', '6-8', '9-12'];
const CONTENT_TYPES = ['All', 'Cartoons', 'Educational', 'Movies', 'Series'];

export const ChildrenScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [selectedAge, setSelectedAge] = useState('All Ages');
  const [selectedType, setSelectedType] = useState('All');
  const [focusedIndex, setFocusedIndex] = useState(0);

  const { data: kidsContent, isLoading } = useQuery({
    queryKey: queryKeys.kids.content(selectedAge, selectedType),
    queryFn: async () => {
      const response = await api.get('/content/kids', {
        params: {
          age_group: selectedAge === 'All Ages' ? undefined : selectedAge,
          type: selectedType === 'All' ? undefined : selectedType.toLowerCase(),
        },
      });
      return response.data;
    },
  });

  const handleItemSelect = (item: KidsContent) => {
    navigation.navigate('Player', {
      vodId: item.id,
      kidsMode: true,
    });
  };

  const renderAgeGroup = ({ item }: { item: string }) => {
    const isSelected = selectedAge === item;
    return (
      <Pressable onPress={() => setSelectedAge(item)} style={styles.filterButton}>
        <View style={[styles.filter, isSelected && styles.filterSelected]}>
          <Text style={[styles.filterText, isSelected && styles.filterTextSelected]}>
            {item}
          </Text>
        </View>
      </Pressable>
    );
  };

  const renderContentType = ({ item }: { item: string }) => {
    const isSelected = selectedType === item;
    return (
      <Pressable onPress={() => setSelectedType(item)} style={styles.filterButton}>
        <View style={[styles.filter, isSelected && styles.filterSelected]}>
          <Text style={[styles.filterText, isSelected && styles.filterTextSelected]}>
            {item}
          </Text>
        </View>
      </Pressable>
    );
  };

  const renderItem = ({ item, index }: { item: KidsContent; index: number }) => (
    <View style={styles.cardWrapper}>
      <ContentCard
        id={item.id}
        title={item.title}
        subtitle={item.subtitle || item.age_rating}
        thumbnail={item.thumbnail}
        type={item.type}
        focused={focusedIndex === index}
        hasTVPreferredFocus={index === 0}
        onPress={() => handleItemSelect(item)}
      />
      {item.is_educational && (
        <View style={styles.educationalBadge}>
          <Star size={16} color="#10b981" fill="#10b981" />
          <Text style={styles.educationalText}>Educational</Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <TVHeader currentScreen="children" navigation={navigation} />

      <View style={styles.content}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={styles.iconContainer}>
            <Baby size={48} color="#10b981" />
          </View>
          <Text style={styles.title}>Kids Zone</Text>
          <View style={styles.safeModeBadge}>
            <Text style={styles.safeModeText}>Safe Mode</Text>
          </View>
        </View>

        {/* Age Group Filters */}
        <Text style={styles.filterLabel}>Age Group</Text>
        <FlatList
          horizontal
          data={AGE_GROUPS}
          renderItem={renderAgeGroup}
          keyExtractor={(item) => item}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContent}
        />

        {/* Content Type Filters */}
        <Text style={styles.filterLabel}>Content Type</Text>
        <FlatList
          horizontal
          data={CONTENT_TYPES}
          renderItem={renderContentType}
          keyExtractor={(item) => item}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContent}
        />

        {/* Content Grid */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading kids content...</Text>
          </View>
        ) : kidsContent && kidsContent.length > 0 ? (
          <FlatList
            data={kidsContent}
            renderItem={renderItem}
            keyExtractor={(item: KidsContent) => item.id}
            numColumns={6}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.gridContent}
            columnWrapperStyle={styles.gridRow}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Baby size={64} color="rgba(255,255,255,0.3)" />
            <Text style={styles.emptyText}>No kids content available</Text>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 24,
    marginBottom: 24,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(16,185,129,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: config.tv.minTitleTextSizePt,
    fontWeight: '700',
    color: '#ffffff',
    flex: 1,
  },
  safeModeBadge: {
    backgroundColor: '#10b981',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  safeModeText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
  },
  filterLabel: {
    fontSize: 24,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 12,
  },
  filtersContent: {
    gap: 12,
    marginBottom: 24,
  },
  filterButton: {
    marginRight: 12,
  },
  filter: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  filterSelected: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  filterText: {
    fontSize: config.tv.minButtonTextSizePt,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
  },
  filterTextSelected: {
    color: '#ffffff',
  },
  gridContent: {
    paddingBottom: config.tv.safeZoneMarginPt,
  },
  gridRow: {
    gap: 16,
    marginBottom: 16,
  },
  cardWrapper: {
    position: 'relative',
  },
  educationalBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16,185,129,0.9)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  educationalText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: config.tv.minBodyTextSizePt,
    color: 'rgba(255,255,255,0.7)',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  emptyText: {
    fontSize: config.tv.minTitleTextSizePt,
    color: 'rgba(255,255,255,0.8)',
  },
});
