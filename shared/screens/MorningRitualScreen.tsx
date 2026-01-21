import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Dimensions,
  Image,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import Video from 'react-native-video';
import { GlassView } from '../components/ui/GlassView';
import { colors, spacing, fontSize, borderRadius } from '../theme';
import { ritualService } from '../services/api';
import { isTV } from '../utils/platform';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface PlaylistItem {
  id: string;
  title: string;
  type: 'live' | 'radio' | 'vod';
  stream_url?: string;
  thumbnail?: string;
  duration_hint?: number;
  duration?: number;
  category: string;
}

interface AIBrief {
  greeting: string;
  israel_update: string;
  recommendation: string;
  mood: string;
  israel_context: {
    israel_time: string;
    day_name_he: string;
    is_shabbat: boolean;
  };
}

interface RitualData {
  is_ritual_time: boolean;
  ritual_enabled: boolean;
  local_time: string;
  playlist?: PlaylistItem[];
  ai_brief?: AIBrief;
}

/**
 * MorningRitualScreen for TV App
 * Full-screen morning ritual experience optimized for D-pad navigation.
 */
export default function MorningRitualScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const [ritualData, setRitualData] = useState<RitualData | null>(null);
  const [aiBrief, setAIBrief] = useState<AIBrief | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showBrief, setShowBrief] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [focusedButton, setFocusedButton] = useState<string>('start');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const sunAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(sunAnim, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      }),
    ]).start();

    fetchRitualData();
  }, []);

  const fetchRitualData = async () => {
    try {
      const [checkResult, briefResult] = await Promise.all([
        ritualService.check(),
        ritualService.getAIBrief(),
      ]) as [any, any];

      setRitualData(checkResult);
      setAIBrief(briefResult);

      // Auto-hide brief after 6 seconds on TV
      setTimeout(() => {
        setShowBrief(false);
        if (checkResult.playlist?.length) {
          setIsPlaying(true);
        }
      }, 6000);
    } catch (err) {
      console.error('Failed to fetch ritual data:', err);
      handleExit();
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    try {
      await ritualService.skipToday();
    } catch (err) {
      console.error('Failed to skip ritual:', err);
    }
    handleExit();
  };

  const handleExit = () => {
    navigation.navigate('Home' as never);
  };

  const handleNextItem = useCallback(() => {
    if (!ritualData?.playlist) return;

    if (currentIndex < ritualData.playlist.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      handleExit();
    }
  }, [currentIndex, ritualData]);

  const handlePreviousItem = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  }, [currentIndex]);

  const currentItem = ritualData?.playlist?.[currentIndex];

  if (loading) {
    return (
      <View className="flex-1 bg-[#1e1b4b]">
        <View className="flex-1 justify-center items-center">
          <Animated.Text
            className={`mb-4 ${isTV ? 'text-[80px]' : 'text-[64px]'}`}
            style={{ transform: [{ scale: sunAnim }] }}
          >
            ☀️
          </Animated.Text>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text className="text-white/70 text-lg mt-4">{t('ritual.preparingRitual')}</Text>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#1e1b4b]">
      {/* Gradient Background */}
      <View className="absolute inset-0">
        <View className="flex-1 bg-purple-800/50" />
      </View>

      {/* AI Brief Overlay */}
      {showBrief && aiBrief && (
        <Animated.View
          className="absolute inset-0 justify-center items-center bg-black/60 px-8"
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }}
        >
          <Animated.Text
            className={`mb-8 ${isTV ? 'text-[100px]' : 'text-[80px]'}`}
            style={{ transform: [{ scale: sunAnim }] }}
          >
            ☀️
          </Animated.Text>

          <Text className={`${isTV ? 'text-5xl' : 'text-4xl'} font-bold text-white mb-4 text-center`}>{aiBrief.greeting}</Text>
          <Text className={`${isTV ? 'text-2xl' : 'text-xl'} text-white/90 mb-2 text-center`}>{aiBrief.israel_update}</Text>
          <Text className={`${isTV ? 'text-xl' : 'text-lg'} text-white/70 mb-8 text-center`}>{aiBrief.recommendation}</Text>

          <View className="flex-row justify-center gap-8 mb-8 flex-wrap">
            <View className="items-center gap-1">
              <Text className={isTV ? 'text-[32px]' : 'text-2xl'}>🇮🇱</Text>
              <Text className="text-sm text-white/50">{t('ritual.israelTime')}</Text>
              <Text className={`${isTV ? 'text-[22px]' : 'text-lg'} font-semibold text-white`}>{aiBrief.israel_context?.israel_time}</Text>
            </View>

            <View className="items-center gap-1">
              <Text className={isTV ? 'text-[32px]' : 'text-2xl'}>📅</Text>
              <Text className="text-sm text-white/50">{t('ritual.day')}</Text>
              <Text className={`${isTV ? 'text-[22px]' : 'text-lg'} font-semibold text-white`}>{aiBrief.israel_context?.day_name_he}</Text>
            </View>

            {aiBrief.israel_context?.is_shabbat && (
              <GlassView className="flex-row items-center gap-2 px-4 py-2 rounded-lg" intensity="medium">
                <Text className={isTV ? 'text-[32px]' : 'text-2xl'}>🕯️</Text>
                <Text className="text-lg font-semibold text-yellow-400">{t('clock.shabbatShalom')}</Text>
              </GlassView>
            )}
          </View>

          <TouchableOpacity
            className={`bg-orange-500 rounded-full ${focusedButton === 'start' ? 'border-[3px] border-purple-500 scale-105' : ''}`}
            style={{ paddingHorizontal: isTV ? 60 : 48, paddingVertical: isTV ? 20 : 16 }}
            onPress={() => setShowBrief(false)}
            onFocus={() => setFocusedButton('start')}
          >
            <Text className={`${isTV ? 'text-[22px]' : 'text-lg'} font-semibold text-[#1e1b4b]`}>{t('ritual.letsStart')}</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Main Content */}
      {!showBrief && (
        <View className="flex-1">
          {/* Header */}
          <View className="flex-row justify-between items-center px-4 py-3 bg-black/40">
            <View className="flex-row items-center gap-4">
              <Text className={`${isTV ? 'text-2xl' : 'text-xl'} font-semibold text-white`}>{t('ritual.title')}</Text>
              <Text className="text-base text-white/70">{ritualData?.local_time}</Text>
            </View>

            <View className="flex-row gap-4">
              <TouchableOpacity
                className={`px-4 py-2 rounded-full bg-white/15 ${focusedButton === 'skip' ? 'border-[3px] border-purple-500' : ''}`}
                onPress={handleSkip}
                onFocus={() => setFocusedButton('skip')}
              >
                <Text className="text-base text-white">{t('ritual.skipToday')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                className={`px-4 py-2 rounded-full bg-white/25 ${focusedButton === 'exit' ? 'border-[3px] border-purple-500' : ''}`}
                onPress={handleExit}
                onFocus={() => setFocusedButton('exit')}
              >
                <Text className="text-base text-white">{t('ritual.finish')}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Player Area */}
          <View className="flex-1 justify-center items-center p-4">
            {currentItem?.type === 'live' || currentItem?.type === 'vod' ? (
              <View className="w-[90%] aspect-video rounded-2xl overflow-hidden">
                {currentItem.stream_url && (
                  <Video
                    source={{ uri: currentItem.stream_url }}
                    className="w-full h-full"
                    resizeMode="cover"
                    paused={!isPlaying}
                    onEnd={handleNextItem}
                  />
                )}
                <GlassView className="absolute bottom-0 left-0 right-0 p-4" intensity="medium">
                  <Text className={`${isTV ? 'text-[28px]' : 'text-2xl'} font-semibold text-white mb-1`}>{currentItem.title}</Text>
                  <Text className="text-base text-white/70">{currentItem.category}</Text>
                </GlassView>
              </View>
            ) : currentItem?.type === 'radio' ? (
              <GlassView className="items-center p-8 rounded-2xl" intensity="medium">
                <View className={`${isTV ? 'w-[250px] h-[250px]' : 'w-[200px] h-[200px]'} mb-4 relative`}>
                  {currentItem.thumbnail && (
                    <Image
                      source={{ uri: currentItem.thumbnail }}
                      className="w-full h-full rounded-full"
                    />
                  )}
                  <View className="absolute inset-0 justify-center items-center">
                    <Animated.View className="absolute w-full h-full rounded-full border-2 border-yellow-400" style={{ opacity: 0.8 }} />
                    <Animated.View className="absolute w-full h-full rounded-full border-2 border-yellow-400" style={{ opacity: 0.5 }} />
                    <Animated.View className="absolute w-full h-full rounded-full border-2 border-yellow-400" style={{ opacity: 0.3 }} />
                  </View>
                </View>
                <Text className={`${isTV ? 'text-[28px]' : 'text-2xl'} font-semibold text-white`}>{currentItem.title}</Text>
              </GlassView>
            ) : (
              <View className="p-8">
                <Text className="text-lg text-white/70">{t('ritual.noContentNow')}</Text>
              </View>
            )}
          </View>

          {/* Playlist Bar */}
          <GlassView className="p-3 rounded-t-2xl" intensity="light">
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerClassName="gap-4 pb-2"
            >
              {ritualData?.playlist?.map((item, index) => (
                <TouchableOpacity
                  key={item.id}
                  className={`flex-row items-center gap-4 rounded-lg p-2 pr-4 ${isTV ? 'min-w-[250px]' : 'min-w-[200px]'} ${
                    index === currentIndex ? 'bg-yellow-400/20 border border-yellow-400/50' : 'bg-white/10'
                  } ${focusedButton === `item-${index}` ? 'border-[3px] border-purple-500' : ''}`}
                  onPress={() => setCurrentIndex(index)}
                  onFocus={() => setFocusedButton(`item-${index}`)}
                >
                  {item.thumbnail && (
                    <Image
                      source={{ uri: item.thumbnail }}
                      className={`${isTV ? 'w-[60px] h-[60px]' : 'w-12 h-12'} rounded-md`}
                    />
                  )}
                  <View className="flex-1 gap-1">
                    <Text className="text-base font-medium text-white" numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text className="text-sm text-white/70">
                      {item.type === 'live' ? `🔴 ${t('ritual.typeLive')}` :
                       item.type === 'radio' ? `📻 ${t('ritual.typeRadio')}` : `🎬 ${t('ritual.typeVideo')}`}
                    </Text>
                  </View>
                  {index === currentIndex && (
                    <View className="w-[10px] h-[10px] rounded-full bg-orange-500" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View className="flex-row justify-center items-center gap-4 mt-2">
              <TouchableOpacity
                className={`${isTV ? 'w-[50px] h-[50px]' : 'w-10 h-10'} rounded-full bg-white/15 justify-center items-center ${
                  focusedButton === 'prev' ? 'border-[3px] border-purple-500' : ''
                }`}
                onPress={handlePreviousItem}
                onFocus={() => setFocusedButton('prev')}
                disabled={currentIndex === 0}
              >
                <Text className={`${isTV ? 'text-2xl' : 'text-lg'} text-white`}>←</Text>
              </TouchableOpacity>

              <Text className="text-base text-white/70">
                {currentIndex + 1} / {ritualData?.playlist?.length || 0}
              </Text>

              <TouchableOpacity
                className={`${isTV ? 'w-[50px] h-[50px]' : 'w-10 h-10'} rounded-full bg-white/15 justify-center items-center ${
                  focusedButton === 'next' ? 'border-[3px] border-purple-500' : ''
                }`}
                onPress={handleNextItem}
                onFocus={() => setFocusedButton('next')}
                disabled={currentIndex >= (ritualData?.playlist?.length || 0) - 1}
              >
                <Text className={`${isTV ? 'text-2xl' : 'text-lg'} text-white`}>→</Text>
              </TouchableOpacity>
            </View>
          </GlassView>
        </View>
      )}
    </View>
  );
}
