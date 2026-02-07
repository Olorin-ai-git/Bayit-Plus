/**
 * RadioScreen - Radio stations grid
 *
 * Features:
 * - Radio station grid (6 columns)
 * - Station logos and names
 * - Genre filters
 * - Now playing indicator
 */

import React, { useState} from 'react';
import { View, Text, FlatList, Pressable,Image} from 'react-native';
import { useTranslation} from 'react-i18next';
import { useQuery} from '@tanstack/react-query';
import { Radio} from 'lucide-react-native';
import { api} from '@bayit/shared-services';
import { TVHeader} from '../components/TVHeader';
import { config} from '../config/appConfig';
import { styles } from './styles/RadioScreen.styles';

interface RadioStation {
  id: string;
  name: string;
  logo?: string;
  genre?: string;
  frequency?: string;
  is_playing?: boolean;
}

const GENRES = ['All', 'News', 'Music', 'Talk', 'Sports', 'Religious'];

export const RadioScreen: React.FC<{ navigation: any}> = ({ navigation}) => {
  const { t} = useTranslation();
  const [selectedGenre, setSelectedGenre] = useState('All');
  const [focusedStation, setFocusedStation] = useState<string | null>(null);

  const { data: stations, isLoading} = useQuery({
    queryKey: ['radio', selectedGenre],
    queryFn: async () => {
      const response = await api.get('/radio/stations', {
        params: { genre: selectedGenre === 'All' ? undefined : selectedGenre},
     });
      return response.data;
   },
 });

  const handleStationSelect = (station: RadioStation) => {
    navigation.navigate('Player', { stationId: station.id});
 };

  const renderGenre = ({ item}: { item: string}) => {
    const isSelected = selectedGenre === item;
    return (
      <Pressable onPress={() => setSelectedGenre(item)}>
        <View style={[styles.genre, isSelected && styles.genreSelected]}>
          <Text style={[styles.genreText, isSelected && styles.genreTextSelected]}>
            {item}
          </Text>
        </View>
      </Pressable>
    );
 };

  const renderStation = ({ item, index}: { item: RadioStation; index: number}) => {
    const isFocused = focusedStation === item.id;
    return (
      <Pressable
        onPress={() => handleStationSelect(item)}
        onFocus={() => setFocusedStation(item.id)}
        hasTVPreferredFocus={index === 0}
        style={styles.stationButton}
      >
        <View style={[styles.stationCard, isFocused && styles.stationCardFocused]}>
          <View style={styles.logoContainer}>
            {item.logo ? (
              <Image source={{ uri: item.logo}} style={styles.logo} resizeMode="contain" />
            ) : (
              <Radio size={48} color="#A855F7" />
            )}
          </View>
          <Text style={styles.stationName} numberOfLines={2}>
            {item.name}
          </Text>
          {item.frequency && (
            <Text style={styles.frequency}>{item.frequency}</Text>
          )}
          {item.is_playing && <View style={styles.playingBadge} />}
        </View>
      </Pressable>
    );
 };

  return (
    <View style={styles.container}>
      <TVHeader currentScreen="radio" navigation={navigation} />

      <View style={styles.content}>
        <Text style={styles.title}>{t('tvos.radio.title', 'Radio Stations')}</Text>

        <FlatList
          horizontal
          data={GENRES}
          renderItem={renderGenre}
          keyExtractor={(item) => item}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.genresContent}
        />

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>{t('tvos.radio.loading', 'Loading stations...')}</Text>
          </View>
        ) : stations && stations.length > 0 ? (
          <FlatList
            data={stations}
            renderItem={renderStation}
            keyExtractor={(item: RadioStation) => item.id}
            numColumns={6}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.gridContent}
            columnWrapperStyle={styles.gridRow}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>{t('tvos.radio.empty', 'No stations available')}</Text>
          </View>
        )}
      </View>
    </View>
  );
};

