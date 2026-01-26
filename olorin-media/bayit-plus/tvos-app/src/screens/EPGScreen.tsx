/**
 * EPGScreen - Electronic Program Guide
 *
 * Features:
 * - Time-based program grid
 * - Channel listings with current/upcoming shows
 * - Quick navigation to live content
 * - Focus navigation through time slots
 */

import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, Image } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Clock, Tv } from 'lucide-react-native';
import { api } from '@bayit/shared-services';
import { TVHeader } from '../components/TVHeader';
import { queryKeys } from '../config/queryClient';
import { config } from '../config/appConfig';

interface EPGProgram {
  id: string;
  title: string;
  channel_id: string;
  channel_name: string;
  channel_logo?: string;
  start_time: string;
  end_time: string;
  description?: string;
  is_live: boolean;
}

interface TimeSlot {
  hour: string;
  programs: EPGProgram[];
}

const TIME_SLOTS = Array.from({ length: 24 }, (_, i) => {
  const hour = i.toString().padStart(2, '0');
  return `${hour}:00`;
});

export const EPGScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [selectedHour, setSelectedHour] = useState<string>('');
  const [focusedProgram, setFocusedProgram] = useState<string | null>(null);

  // Get current hour on mount
  useEffect(() => {
    const now = new Date();
    const currentHour = now.getHours().toString().padStart(2, '0');
    setSelectedHour(`${currentHour}:00`);
  }, []);

  const { data: epgData, isLoading } = useQuery({
    queryKey: queryKeys.epg.schedule(selectedHour),
    queryFn: async () => {
      const response = await api.get('/epg/schedule', {
        params: { hour: selectedHour },
      });
      return response.data;
    },
    enabled: !!selectedHour,
  });

  const handleProgramSelect = (program: EPGProgram) => {
    if (program.is_live) {
      navigation.navigate('Player', { channelId: program.channel_id });
    }
  };

  const renderTimeSlot = ({ item }: { item: string }) => {
    const isSelected = selectedHour === item;
    const isCurrent = item === selectedHour;
    return (
      <Pressable onPress={() => setSelectedHour(item)}>
        <View style={[styles.timeSlot, isSelected && styles.timeSlotSelected]}>
          <Clock size={20} color={isSelected ? '#ffffff' : 'rgba(255,255,255,0.6)'} />
          <Text style={[styles.timeText, isSelected && styles.timeTextSelected]}>
            {item}
          </Text>
          {isCurrent && <View style={styles.currentBadge} />}
        </View>
      </Pressable>
    );
  };

  const renderProgram = ({ item, index }: { item: EPGProgram; index: number }) => {
    const isFocused = focusedProgram === item.id;
    const startTime = new Date(item.start_time);
    const endTime = new Date(item.end_time);
    const duration = Math.round((endTime.getTime() - startTime.getTime()) / 60000);

    return (
      <Pressable
        onPress={() => handleProgramSelect(item)}
        onFocus={() => setFocusedProgram(item.id)}
        hasTVPreferredFocus={index === 0}
        style={styles.programButton}
      >
        <View style={[styles.programCard, isFocused && styles.programCardFocused]}>
          {/* Channel Logo */}
          <View style={styles.channelLogoContainer}>
            {item.channel_logo ? (
              <Image source={{ uri: item.channel_logo }} style={styles.channelLogo} />
            ) : (
              <Tv size={32} color="#A855F7" />
            )}
          </View>

          {/* Program Info */}
          <View style={styles.programInfo}>
            <Text style={styles.channelName} numberOfLines={1}>
              {item.channel_name}
            </Text>
            <Text style={styles.programTitle} numberOfLines={2}>
              {item.title}
            </Text>
            <View style={styles.timeRow}>
              <Text style={styles.timeLabel}>
                {startTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                {' - '}
                {endTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </Text>
              <Text style={styles.durationLabel}>{duration} min</Text>
            </View>
            {item.description && (
              <Text style={styles.programDescription} numberOfLines={2}>
                {item.description}
              </Text>
            )}
          </View>

          {/* Live Badge */}
          {item.is_live && (
            <View style={styles.liveBadgeContainer}>
              <View style={styles.liveBadge} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          )}
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <TVHeader currentScreen="epg" navigation={navigation} />

      <View style={styles.content}>
        <Text style={styles.title}>TV Guide</Text>

        {/* Time Slots */}
        <FlatList
          horizontal
          data={TIME_SLOTS}
          renderItem={renderTimeSlot}
          keyExtractor={(item) => item}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.timeSlotsContent}
        />

        {/* Program Grid */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading TV guide...</Text>
          </View>
        ) : epgData && epgData.length > 0 ? (
          <FlatList
            data={epgData}
            renderItem={renderProgram}
            keyExtractor={(item: EPGProgram) => item.id}
            numColumns={2}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.gridContent}
            columnWrapperStyle={styles.gridRow}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Tv size={64} color="rgba(255,255,255,0.3)" />
            <Text style={styles.emptyText}>No programs scheduled</Text>
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
  title: {
    fontSize: config.tv.minTitleTextSizePt,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 24,
    marginBottom: 24,
  },
  timeSlotsContent: {
    gap: 12,
    marginBottom: 32,
  },
  timeSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    marginRight: 12,
  },
  timeSlotSelected: {
    backgroundColor: '#A855F7',
  },
  timeText: {
    fontSize: config.tv.minButtonTextSizePt,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
  },
  timeTextSelected: {
    color: '#ffffff',
  },
  currentBadge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
  },
  gridContent: {
    paddingBottom: config.tv.safeZoneMarginPt,
  },
  gridRow: {
    gap: 16,
    marginBottom: 16,
  },
  programButton: {
    flex: 1,
  },
  programCard: {
    backgroundColor: 'rgba(20,20,35,0.85)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
    flexDirection: 'row',
    gap: 12,
    minHeight: 140,
  },
  programCardFocused: {
    borderColor: '#A855F7',
    borderWidth: config.tv.focusBorderWidth,
    transform: [{ scale: 1.02 }],
  },
  channelLogoContainer: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 12,
  },
  channelLogo: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  programInfo: {
    flex: 1,
    gap: 4,
  },
  channelName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#A855F7',
  },
  programTitle: {
    fontSize: config.tv.minBodyTextSizePt,
    fontWeight: '700',
    color: '#ffffff',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timeLabel: {
    fontSize: 20,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
  },
  durationLabel: {
    fontSize: 18,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.5)',
  },
  programDescription: {
    fontSize: 20,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.6)',
    marginTop: 4,
  },
  liveBadgeContainer: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16,185,129,0.2)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  liveBadge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
  },
  liveText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10b981',
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
