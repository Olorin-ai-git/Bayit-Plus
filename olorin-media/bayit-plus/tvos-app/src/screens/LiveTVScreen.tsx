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

import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, Image } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '@bayit/shared-services';
import { TVHeader } from '../components/TVHeader';
import { queryKeys } from '../config/queryClient';
import { config } from '../config/appConfig';

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

export const LiveTVScreen: React.FC<LiveTVScreenProps> = ({ navigation }) => {
  const [focusedChannel, setFocusedChannel] = useState<string | null>(null);

  // Fetch live channels
  const { data: channels, isLoading } = useQuery({
    queryKey: queryKeys.live.channels(),
    queryFn: async () => {
      const response = await api.get('/channels');
      return response.data;
    },
  });

  const handleChannelSelect = useCallback((channel: Channel) => {
    setFocusedChannel(channel.id);
    navigation.navigate('Player', { channelId: channel.id });
  }, [navigation]);

  const renderChannel = useCallback(({ item, index }: { item: Channel; index: number }) => {
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
                source={{ uri: item.logo }}
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
        <Text style={styles.title}>Live TV Channels</Text>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading channels...</Text>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  content: {
    flex: 1,
    paddingHorizontal: config.tv.safeZoneMarginPt,
  },
  title: {
    fontSize: config.tv.minTitleTextSizePt,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 24,
    marginBottom: 32,
  },
  gridContent: {
    paddingBottom: config.tv.safeZoneMarginPt,
  },
  row: {
    gap: 20,
    marginBottom: 20,
  },
  channelButton: {
    width: 220,
  },
  channelCard: {
    backgroundColor: 'rgba(20,20,35,0.85)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
    gap: 12,
  },
  channelCardFocused: {
    borderColor: '#A855F7',
    borderWidth: config.tv.focusBorderWidth,
    transform: [{ scale: config.tv.focusScaleFactor }],
  },
  logoContainer: {
    width: 120,
    height: 120,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 12,
  },
  logo: {
    width: 100,
    height: 100,
  },
  logoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 12,
    backgroundColor: 'rgba(168,85,247,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoPlaceholderText: {
    fontSize: 48,
    fontWeight: '700',
    color: '#A855F7',
  },
  channelInfo: {
    gap: 4,
  },
  channelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  channelNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#A855F7',
  },
  liveBadge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
  },
  channelName: {
    fontSize: config.tv.minButtonTextSizePt,
    fontWeight: '600',
    color: '#ffffff',
    lineHeight: config.tv.minButtonTextSizePt * 1.2,
  },
  programTitle: {
    fontSize: 18,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 22,
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
});
