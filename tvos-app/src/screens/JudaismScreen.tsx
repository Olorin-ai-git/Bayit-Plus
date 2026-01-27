/**
 * JudaismScreen - Jewish educational content
 *
 * Features:
 * - Torah study content
 * - Holiday specials
 * - Prayers and blessings
 * - Educational series
 */

import React, { useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, Star as StarIcon } from 'lucide-react-native';
import { api } from '@bayit/shared-services';
import { TVHeader } from '../components/TVHeader';
import { ContentCard } from '../components/ContentCard';
import { queryKeys } from '../config/queryClient';
import { config } from '../config/appConfig';

interface JewishContent {
  id: string;
  title: string;
  subtitle?: string;
  thumbnail?: string;
  type: 'torah' | 'holiday' | 'prayer' | 'series' | 'lecture';
  category?: string;
  rabbi?: string;
}

const CATEGORIES = [
  'All',
  'Torah Study',
  'Holidays',
  'Prayers',
  'Ethics',
  'History',
  'Kabbalah',
];

const HOLIDAYS = [
  'All Year',
  'Shabbat',
  'Rosh Hashanah',
  'Yom Kippur',
  'Sukkot',
  'Hanukkah',
  'Purim',
  'Passover',
];

export const JudaismScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedHoliday, setSelectedHoliday] = useState('All Year');
  const [focusedIndex, setFocusedIndex] = useState(0);

  const { data: jewishContent, isLoading } = useQuery({
    queryKey: queryKeys.jewish.content(selectedCategory, selectedHoliday),
    queryFn: async () => {
      const response = await api.get('/content/jewish', {
        params: {
          category: selectedCategory === 'All' ? undefined : selectedCategory,
          holiday: selectedHoliday === 'All Year' ? undefined : selectedHoliday,
        },
      });
      return response.data;
    },
  });

  const handleItemSelect = (item: JewishContent) => {
    navigation.navigate('Player', {
      vodId: item.id,
      category: 'jewish',
    });
  };

  const renderCategory = ({ item }: { item: string }) => {
    const isSelected = selectedCategory === item;
    return (
      <Pressable onPress={() => setSelectedCategory(item)} style={styles.filterButton}>
        <View style={[styles.filter, isSelected && styles.filterSelected]}>
          <Text style={[styles.filterText, isSelected && styles.filterTextSelected]}>
            {item}
          </Text>
        </View>
      </Pressable>
    );
  };

  const renderHoliday = ({ item }: { item: string }) => {
    const isSelected = selectedHoliday === item;
    return (
      <Pressable onPress={() => setSelectedHoliday(item)} style={styles.filterButton}>
        <View style={[styles.filter, isSelected && styles.filterSelected]}>
          <Text style={[styles.filterText, isSelected && styles.filterTextSelected]}>
            {item}
          </Text>
        </View>
      </Pressable>
    );
  };

  const renderItem = ({ item, index }: { item: JewishContent; index: number }) => (
    <ContentCard
      id={item.id}
      title={item.title}
      subtitle={item.rabbi || item.subtitle}
      thumbnail={item.thumbnail}
      type={item.type as any}
      focused={focusedIndex === index}
      hasTVPreferredFocus={index === 0}
      onPress={() => handleItemSelect(item)}
    />
  );

  return (
    <View style={styles.container}>
      <TVHeader currentScreen="judaism" navigation={navigation} />

      <View style={styles.content}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={styles.iconContainer}>
            <BookOpen size={48} color="#A855F7" />
          </View>
          <Text style={styles.title}>Torah & Judaism</Text>
          <View style={styles.starBadge}>
            <StarIcon size={24} color="#fbbf24" fill="#fbbf24" />
          </View>
        </View>

        {/* Category Filters */}
        <Text style={styles.filterLabel}>Category</Text>
        <FlatList
          horizontal
          data={CATEGORIES}
          renderItem={renderCategory}
          keyExtractor={(item) => item}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContent}
        />

        {/* Holiday Filters */}
        <Text style={styles.filterLabel}>Holiday / Occasion</Text>
        <FlatList
          horizontal
          data={HOLIDAYS}
          renderItem={renderHoliday}
          keyExtractor={(item) => item}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContent}
        />

        {/* Content Grid */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading content...</Text>
          </View>
        ) : jewishContent && jewishContent.length > 0 ? (
          <FlatList
            data={jewishContent}
            renderItem={renderItem}
            keyExtractor={(item: JewishContent) => item.id}
            numColumns={6}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.gridContent}
            columnWrapperStyle={styles.gridRow}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <BookOpen size={64} color="rgba(255,255,255,0.3)" />
            <Text style={styles.emptyText}>No content available</Text>
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
    backgroundColor: 'rgba(168,85,247,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: config.tv.minTitleTextSizePt,
    fontWeight: '700',
    color: '#ffffff',
    flex: 1,
  },
  starBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(251,191,36,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
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
    backgroundColor: '#A855F7',
    borderColor: '#A855F7',
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
