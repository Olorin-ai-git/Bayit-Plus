/**
 * JudaismScreen - Jewish educational content
 *
 * Features:
 * - Torah study content
 * - Holiday specials
 * - Prayers and blessings
 * - Educational series
 */

import React, { useState} from 'react';
import { View, Text, FlatList, Pressable, StyleSheet} from 'react-native';
import { useQuery} from '@tanstack/react-query';
import { useTranslation} from 'react-i18next';
import { BookOpen, Star as StarIcon} from 'lucide-react-native';
import { api} from '@bayit/shared-services';
import { TVHeader} from '../components/TVHeader';
import { ContentCard} from '../components/ContentCard';
import { queryKeys} from '../config/queryClient';
import { config} from '../config/appConfig';
import { styles } from './styles/JudaismScreen.styles';

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

export const JudaismScreen: React.FC<{ navigation: any}> = ({ navigation}) => {
  const { t} = useTranslation();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedHoliday, setSelectedHoliday] = useState('All Year');
  const [focusedIndex, setFocusedIndex] = useState(0);

  const { data: jewishContent, isLoading} = useQuery({
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

  const renderCategory = ({ item}: { item: string}) => {
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

  const renderHoliday = ({ item}: { item: string}) => {
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

  const renderItem = ({ item, index}: { item: JewishContent; index: number}) => (
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
          <Text style={styles.title}>{t('tvos.judaism.title')}</Text>
          <View style={styles.starBadge}>
            <StarIcon size={24} color="#fbbf24" fill="#fbbf24" />
          </View>
        </View>

        {/* Category Filters */}
        <Text style={styles.filterLabel}>{t('tvos.judaism.category')}</Text>
        <FlatList
          horizontal
          data={CATEGORIES}
          renderItem={renderCategory}
          keyExtractor={(item) => item}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContent}
        />

        {/* Holiday Filters */}
        <Text style={styles.filterLabel}>{t('tvos.judaism.holidayOccasion')}</Text>
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
            <Text style={styles.loadingText}>{t('tvos.judaism.loading')}</Text>
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
            <Text style={styles.emptyText}>{t('tvos.judaism.empty')}</Text>
          </View>
        )}
      </View>
    </View>
  );
};

