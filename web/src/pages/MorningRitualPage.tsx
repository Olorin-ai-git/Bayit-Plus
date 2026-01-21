import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, Pressable, ActivityIndicator, ScrollView, Image } from 'react-native';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@/hooks/useDirection';
import { ChevronLeft, ChevronRight, X, SkipForward } from 'lucide-react';
import { GlassView, GlassButton } from '@bayit/shared/ui';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import { ritualService } from '@/services/api';
import logger from '@/utils/logger';

interface PlaylistItem {
  id: string;
  title: string;
  type: 'live' | 'radio' | 'vod';
  stream_url?: string;
  thumbnail?: string;
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

export default function MorningRitualPage() {
  const { t } = useTranslation();
  const { isRTL, textAlign, flexDirection } = useDirection();
  const navigate = useNavigate();
  const [ritualData, setRitualData] = useState<RitualData | null>(null);
  const [aiBrief, setAIBrief] = useState<AIBrief | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showBrief, setShowBrief] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    fetchRitualData();
  }, []);

  const fetchRitualData = async () => {
    try {
      const [checkResult, briefResult] = await Promise.all([
        ritualService.check(),
        ritualService.getAIBrief(),
      ]);
      setRitualData(checkResult);
      setAIBrief(briefResult);
    } catch (err) {
      logger.error('Failed to fetch ritual data', 'MorningRitualPage', err);
      handleExit();
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    try {
      await ritualService.skipToday();
    } catch (err) {
      logger.error('Failed to skip ritual', 'MorningRitualPage', err);
    }
    handleExit();
  };

  const handleExit = () => {
    navigate('/');
  };

  const handleStart = () => {
    setShowBrief(false);
    if (ritualData?.playlist?.length) {
      setIsPlaying(true);
    }
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
          <Text className="text-6xl mb-6">☀️</Text>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text className="text-lg text-white/70 mt-4">{t('ritual.preparingRitual')}</Text>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#1e1b4b]">
      <View className="absolute inset-0 bg-purple-800/50" />

      {showBrief && aiBrief && (
        <View className="absolute inset-0 justify-center items-center bg-black/60 p-8 z-10">
          <Text className="text-8xl mb-8">☀️</Text>
          <Text className="text-4xl font-bold text-white mb-4 text-center">{t('ritual.greeting')}</Text>
          <Text className="text-xl text-white/90 mb-2 text-center">{t('ritual.israelUpdate')}</Text>
          <Text className="text-lg text-white/70 mb-8 text-center">{t('ritual.recommendation')}</Text>

          <View className="flex-row justify-center gap-8 mb-8 flex-wrap">
            <View className="items-center gap-1">
              <Text className="text-2xl">🇮🇱</Text>
              <Text className="text-xs text-white/50">{t('ritual.israelTime')}</Text>
              <Text className="text-lg font-semibold text-white">{aiBrief.israel_context?.israel_time}</Text>
            </View>

            <View className="items-center gap-1">
              <Text className="text-2xl">📅</Text>
              <Text className="text-xs text-white/50">{t('ritual.day')}</Text>
              <Text className="text-lg font-semibold text-white">{aiBrief.israel_context?.day_name_he}</Text>
            </View>

            {aiBrief.israel_context?.is_shabbat && (
              <GlassView className="flex-row items-center gap-2 px-6 py-2 rounded-lg">
                <Text className="text-2xl">🕯️</Text>
                <Text className="text-lg font-semibold text-yellow-400">{t('clock.shabbatShalom')}</Text>
              </GlassView>
            )}
          </View>

          <GlassButton
            title={t('ritual.letsStart')}
            onPress={handleStart}
            variant="primary"
            className="px-12 py-4"
          />
        </View>
      )}

      {!showBrief && (
        <View className="flex-1 z-[1]">
          <View className="flex-row justify-between items-center px-6 py-4 bg-black/40">
            <View className="flex-row items-center gap-4">
              <Text className="text-xl font-semibold text-white">{t('ritual.title')}</Text>
              <Text className="text-base text-white/70">{ritualData?.local_time}</Text>
            </View>

            <View className="flex-row gap-4">
              <Pressable className="flex-row items-center gap-1 px-6 py-2 rounded-full bg-white/15" onPress={handleSkip}>
                <SkipForward size={18} color={colors.text} />
                <Text className="text-sm text-white">{t('ritual.skipToday')}</Text>
              </Pressable>

              <Pressable className="flex-row items-center gap-1 px-6 py-2 rounded-full bg-white/25" onPress={handleExit}>
                <X size={18} color={colors.text} />
                <Text className="text-sm text-white">{t('ritual.finish')}</Text>
              </Pressable>
            </View>
          </View>

          <View className="flex-1 justify-center items-center p-6">
            {currentItem?.type === 'live' || currentItem?.type === 'vod' ? (
              <View className="w-[90%] max-w-[1200px] aspect-video rounded-2xl overflow-hidden relative">
                {currentItem.stream_url && (
                  <video
                    ref={videoRef}
                    src={currentItem.stream_url}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    autoPlay={isPlaying}
                    onEnded={handleNextItem}
                  />
                )}
                <GlassView className="absolute bottom-0 left-0 right-0 p-6">
                  <Text className="text-2xl font-semibold text-white mb-1">{currentItem.title}</Text>
                  <Text className="text-base text-white/70">{currentItem.category}</Text>
                </GlassView>
              </View>
            ) : currentItem?.type === 'radio' ? (
              <GlassView className="items-center p-8 rounded-2xl">
                <View className="w-[200px] h-[200px] mb-6 relative">
                  {currentItem.thumbnail && (
                    <Image source={{ uri: currentItem.thumbnail }} className="w-full h-full rounded-full" />
                  )}
                  <View className="absolute inset-0 justify-center items-center">
                    <View className="absolute w-full h-full rounded-full border-2 border-yellow-400 opacity-80" />
                    <View className="absolute w-full h-full rounded-full border-2 border-yellow-400 opacity-50" />
                    <View className="absolute w-full h-full rounded-full border-2 border-yellow-400 opacity-30" />
                  </View>
                </View>
                <Text className="text-2xl font-semibold text-white">{currentItem.title}</Text>
              </GlassView>
            ) : (
              <View className="p-8">
                <Text className="text-lg text-white/70">{t('ritual.noContentNow')}</Text>
              </View>
            )}
          </View>

          <GlassView className="p-4 rounded-t-2xl">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.md, paddingBottom: spacing.sm }}>
              {ritualData?.playlist?.map((item, index) => (
                <Pressable
                  key={item.id}
                  className={`flex-row items-center gap-4 rounded-lg p-2 pr-4 min-w-[200px] ${index === currentIndex ? 'bg-yellow-400/20 border border-yellow-400/50' : 'bg-white/10'}`}
                  onPress={() => setCurrentIndex(index)}
                >
                  {item.thumbnail && (
                    <Image source={{ uri: item.thumbnail }} className="w-12 h-12 rounded-lg" />
                  )}
                  <View className="flex-1 gap-1">
                    <Text className="text-sm font-medium text-white" numberOfLines={1}>{item.title}</Text>
                    <Text className="text-xs text-white/70">
                      {item.type === 'live' ? `🔴 ${t('ritual.typeLive')}` :
                       item.type === 'radio' ? `📻 ${t('ritual.typeRadio')}` : `🎬 ${t('ritual.typeVideo')}`}
                    </Text>
                  </View>
                  {index === currentIndex && <View className="w-2.5 h-2.5 rounded-full bg-orange-500" />}
                </Pressable>
              ))}
            </ScrollView>

            <View className="flex-row justify-center items-center gap-6 mt-2">
              <Pressable
                className={`w-10 h-10 rounded-full bg-white/15 justify-center items-center ${currentIndex === 0 ? 'opacity-50' : ''}`}
                onPress={handlePreviousItem}
                disabled={currentIndex === 0}
              >
                <ChevronRight size={20} color={colors.text} />
              </Pressable>

              <Text className="text-sm text-white/70">
                {currentIndex + 1} / {ritualData?.playlist?.length || 0}
              </Text>

              <Pressable
                className={`w-10 h-10 rounded-full bg-white/15 justify-center items-center ${currentIndex >= (ritualData?.playlist?.length || 0) - 1 ? 'opacity-50' : ''}`}
                onPress={handleNextItem}
                disabled={currentIndex >= (ritualData?.playlist?.length || 0) - 1}
              >
                <ChevronLeft size={20} color={colors.text} />
              </Pressable>
            </View>
          </GlassView>
        </View>
      )}
    </View>
  );
}
