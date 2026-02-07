/**
 * LiveTVScreen - Live TV channel grid for TV
 *
 * Features:
 * - 5x4 channel grid (20 visible)
 * - 120x120 channel logos
 * - Focus navigation
 * - Mini EPG overlay
 * - Channel number quick input
 */

import React, { useState, useCallback} from 'react';
import { View, Text, FlatList, Pressable,Image} from 'react-native';
import { useQuery} from '@tanstack/react-query';
import { useTranslation} from 'react-i18next';
import { api} from '@bayit/shared-services';
import { TVHeader} from '../components/TVHeader';
import { queryKeys} from '../config/queryClient';
import { config} from '../config/appConfig';
import { styles } from './styles/LiveTVScreen.styles';

interface Channel {
  id: string;
  name: string;
  number: number;
  logo: string;
  is_live: boolean;
  current_program?: {
    title: string;
    start_time: string;
    end_time: string;
 };
}

interface LiveTVScreenProps {
  navigation: any;
}

export const LiveTVScreen: React.FC<LiveTVScreenProps> = ({ navigation}) => {
  const { t} = useTranslation();
  const [focusedChannel, setFocusedChannel] = useState<string | null>(null);

  // Fetch live channels
  const { data: channels, isLoading} = useQuery({
    queryKey: queryKeys.live.channels(),
    queryFn: async () => {
      const response = await api.get('/channels');
      return response.data;
   },
 });

  const handleChannelSelect = useCallback((channel: Channel) => {
    setFocusedChannel(channel.id);
    navigation.navigate('Player', { channelId: channel.id});
 }, [navigation]);

  const renderChannel = useCallback(({ item, index}: { item: Channel; index: number}) => {
    const isFocused = focusedChannel === item.id;

    return (
      <Pressable
        onPress={() => handleChannelSelect(item)}
        onFocus={() => setFocusedChannel(item.id)}
        hasTVPreferredFocus={index === 0}
        accessible
        accessibilityLabel={`Channel ${item.number}: ${item.name}`}
        accessibilityRole="button"
        style={styles.channelButton}
      >
        <View
          style={[
            styles.channelCard,
            isFocused && styles.channelCardFocused,
          ]}
        >
          {/* Channel Logo */}
          <View style={styles.logoContainer}>
            {item.logo ? (
              <Image
                source={{ uri: item.logo}}
                style={styles.logo}
                resizeMode="contain"
              />
            ) : (
              <View style={styles.logoPlaceholder}>
                <Text style={styles.logoPlaceholderText}>{item.number}</Text>
              </View>
            )}
          </View>

          {/* Channel Info */}
          <View style={styles.channelInfo}>
            <View style={styles.channelHeader}>
              <Text style={styles.channelNumber}>{item.number}</Text>
              {item.is_live && <View style={styles.liveBadge} />}
            </View>
            <Text style={styles.channelName} numberOfLines={2} ellipsizeMode="tail">
              {item.name}
            </Text>
            {item.current_program && (
              <Text style={styles.programTitle} numberOfLines={1} ellipsizeMode="tail">
                {item.current_program.title}
              </Text>
            )}
          </View>
        </View>
      </Pressable>
    );
 }, [focusedChannel, handleChannelSelect]);

  const keyExtractor = useCallback((item: Channel) => item.id, []);

  return (
    <View style={styles.container}>
      <TVHeader currentScreen="live-tv" navigation={navigation} />

      {/* Channel Grid */}
      <View style={styles.content}>
        <Text style={styles.title}>{t('liveTV.channels')}</Text>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>{t('liveTV.loadingChannels')}</Text>
          </View>
        ) : (
          <FlatList
            data={channels}
            renderItem={renderChannel}
            keyExtractor={keyExtractor}
            numColumns={5}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.gridContent}
            columnWrapperStyle={styles.row}
          />
        )}
      </View>
    </View>
  );
};

