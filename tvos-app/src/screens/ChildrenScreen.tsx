/**
 * ChildrenScreen - Kids-safe content
 *
 * Features:
 * - Age-appropriate content filtering
 * - Colorful, kid-friendly UI
 * - Parental controls indicator
 * - Cartoons, educational content, kids shows
 */

import React, { useState} from 'react';
import { View, Text, FlatList, Pressable, StyleSheet} from 'react-native';
import { useTranslation} from 'react-i18next';
import { useQuery} from '@tanstack/react-query';
import { Baby, Star, Film, Tv} from 'lucide-react-native';
import { api} from '@bayit/shared-services';
import { TVHeader} from '../components/TVHeader';
import { ContentCard} from '../components/ContentCard';
import { queryKeys} from '../config/queryClient';
import { config} from '../config/appConfig';
import { styles } from './styles/ChildrenScreen.styles';

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

export const ChildrenScreen: React.FC<{ navigation: any}> = ({ navigation}) => {
  const { t} = useTranslation();
  const [selectedAge, setSelectedAge] = useState('All Ages');
  const [selectedType, setSelectedType] = useState('All');
  const [focusedIndex, setFocusedIndex] = useState(0);

  const { data: kidsContent, isLoading} = useQuery({
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

  const renderAgeGroup = ({ item}: { item: string}) => {
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

  const renderContentType = ({ item}: { item: string}) => {
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

  const renderItem = ({ item, index}: { item: KidsContent; index: number}) => (
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
          <Text style={styles.educationalText}>{t('tvos.children.educational', 'Educational')}</Text>
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
          <Text style={styles.title}>{t('tvos.children.title', 'Kids Zone')}</Text>
          <View style={styles.safeModeBadge}>
            <Text style={styles.safeModeText}>{t('tvos.children.safeMode', 'Safe Mode')}</Text>
          </View>
        </View>

        {/* Age Group Filters */}
        <Text style={styles.filterLabel}>{t('tvos.children.ageGroup', 'Age Group')}</Text>
        <FlatList
          horizontal
          data={AGE_GROUPS}
          renderItem={renderAgeGroup}
          keyExtractor={(item) => item}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContent}
        />

        {/* Content Type Filters */}
        <Text style={styles.filterLabel}>{t('tvos.children.contentType', 'Content Type')}</Text>
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
            <Text style={styles.loadingText}>{t('tvos.children.loading', 'Loading kids content...')}</Text>
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
            <Text style={styles.emptyText}>{t('tvos.children.empty', 'No kids content available')}</Text>
          </View>
        )}
      </View>
    </View>
  );
};

