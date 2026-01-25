import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Modal,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassView } from './ui/GlassView';
import { colors, spacing, fontSize, borderRadius } from '@olorin/design-tokens';
import { subtitlesService } from '../services/api';
import { isTV } from '../utils/platform';
import { logger } from '../utils/logger';

// Scoped logger for interactive subtitles
const subtitlesLogger = logger.scope('UI:InteractiveSubtitles');

interface SubtitleWord {
  word: string;
  start: number;
  end: number;
  is_hebrew: boolean;
}

interface SubtitleCue {
  index: number;
  start_time: number;
  end_time: number;
  text: string;
  text_nikud?: string;
  formatted_start: string;
  formatted_end: string;
  words: SubtitleWord[];
}

interface TranslationResult {
  word: string;
  translation: string;
  transliteration?: string;
  part_of_speech?: string;
  example?: string;
  example_translation?: string;
}

interface InteractiveSubtitlesProps {
  contentId: string;
  currentTime?: number;
  language?: string;
  onWordTranslate?: (translation: TranslationResult) => void;
}

/**
 * InteractiveSubtitles Component for TV App
 * Hebrew-first subtitle display with D-pad navigation for tap-to-translate.
 * Supports nikud toggle for heritage speakers.
 */
export const InteractiveSubtitles: React.FC<InteractiveSubtitlesProps> = ({
  contentId,
  currentTime = 0,
  language = 'he',
  onWordTranslate,
}) => {
  const { t } = useTranslation();
  const [cues, setCues] = useState<SubtitleCue[]>([]);
  const [currentCue, setCurrentCue] = useState<SubtitleCue | null>(null);
  const [showNikud, setShowNikud] = useState(false);
  const [hasNikud, setHasNikud] = useState(false);
  const [translation, setTranslation] = useState<TranslationResult | null>(null);
  const [showTranslation, setShowTranslation] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [focusedWordIndex, setFocusedWordIndex] = useState(-1);
  const [subtitlesMode, setSubtitlesMode] = useState<'view' | 'select'>('view');

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Fetch subtitle cues
  useEffect(() => {
    if (!contentId) return;

    const fetchCues = async () => {
      setIsLoading(true);
      try {
        const response = await subtitlesService.getCues(contentId, language, showNikud) as any;
        setCues(response.cues || []);
        setHasNikud(response.has_nikud || false);
      } catch (err) {
        subtitlesLogger.error('Failed to fetch subtitles', {
          contentId,
          language,
          showNikud,
          error: err instanceof Error ? err.message : String(err),
          stack: err instanceof Error ? err.stack : undefined,
        });
        setCues([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCues();
  }, [contentId, language, showNikud]);

  // Update current cue based on playback time
  useEffect(() => {
    if (!cues.length) {
      setCurrentCue(null);
      return;
    }

    const activeCue = cues.find(
      (cue) => currentTime >= cue.start_time && currentTime < cue.end_time
    );

    if (activeCue?.index !== currentCue?.index) {
      // Animate cue change
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }

    setCurrentCue(activeCue || null);
  }, [currentTime, cues, currentCue?.index, fadeAnim]);

  // Handle word selection for translation
  const handleWordSelect = useCallback(async (word: SubtitleWord, index: number) => {
    if (!word.is_hebrew) return;

    setFocusedWordIndex(index);
    setIsTranslating(true);
    setShowTranslation(true);

    try {
      const result = await subtitlesService.translateWord(word.word) as TranslationResult;
      setTranslation(result);
      onWordTranslate?.(result);
    } catch (err) {
      subtitlesLogger.error('Translation failed', {
        word: word.word,
        isHebrew: word.is_hebrew,
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      });
      setTranslation({ word: word.word, translation: t('subtitles.unavailable') });
    } finally {
      setIsTranslating(false);
    }
  }, [onWordTranslate, t]);

  // Toggle nikud display
  const toggleNikud = useCallback(async () => {
    if (!hasNikud && !showNikud) {
      // Generate nikud if not available
      try {
        await subtitlesService.generateNikud(contentId, language);
        setHasNikud(true);
      } catch (err) {
        subtitlesLogger.error('Failed to generate nikud', {
          contentId,
          language,
          error: err instanceof Error ? err.message : String(err),
          stack: err instanceof Error ? err.stack : undefined,
        });
        return;
      }
    }
    setShowNikud((prev) => !prev);
  }, [contentId, language, hasNikud, showNikud]);

  // Toggle word selection mode (for TV navigation)
  const toggleSelectMode = useCallback(() => {
    setSubtitlesMode((prev) => (prev === 'view' ? 'select' : 'view'));
    if (subtitlesMode === 'select') {
      setFocusedWordIndex(-1);
    } else if (currentCue?.words.length) {
      setFocusedWordIndex(0);
    }
  }, [subtitlesMode, currentCue]);

  // Navigate words with D-pad
  const navigateWord = useCallback((direction: 'left' | 'right') => {
    if (!currentCue || subtitlesMode !== 'select') return;

    const hebrewWords = currentCue.words.filter((w) => w.is_hebrew);
    const currentHebrewIndex = hebrewWords.findIndex(
      (_, i) => currentCue.words.indexOf(hebrewWords[i]) === focusedWordIndex
    );

    let newIndex: number;
    if (direction === 'left') {
      // RTL navigation - left means next word
      newIndex = currentHebrewIndex < hebrewWords.length - 1 ? currentHebrewIndex + 1 : 0;
    } else {
      // Right means previous word
      newIndex = currentHebrewIndex > 0 ? currentHebrewIndex - 1 : hebrewWords.length - 1;
    }

    const newWordIndex = currentCue.words.indexOf(hebrewWords[newIndex]);
    setFocusedWordIndex(newWordIndex);
  }, [currentCue, subtitlesMode, focusedWordIndex]);

  // Select focused word
  const selectFocusedWord = useCallback(() => {
    if (!currentCue || focusedWordIndex < 0) return;
    const word = currentCue.words[focusedWordIndex];
    if (word) {
      handleWordSelect(word, focusedWordIndex);
    }
  }, [currentCue, focusedWordIndex, handleWordSelect]);

  if (isLoading) {
    return (
      <View className="w-full items-center py-4">
        <ActivityIndicator color={colors.primary} size="small" />
      </View>
    );
  }

  if (!currentCue) {
    return (
      <View className="w-full items-center py-4">
        <View className="absolute top-2 right-4 flex-row gap-2 z-10">
          <TouchableOpacity
            className={`flex-row items-center gap-1 px-4 py-2 bg-white/15 rounded-full border border-white/25 ${showNikud ? 'bg-purple-500/50 border-blue-500/70' : ''}`}
            onPress={toggleNikud}
          >
            <Text className="text-[18px] font-semibold text-white">אָ</Text>
            <Text className="text-sm text-white">{t('subtitles.nikud')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View className="w-full items-center py-4">
      {/* Controls */}
      <View className="absolute top-2 right-4 flex-row gap-2 z-10">
        <TouchableOpacity
          className={`flex-row items-center gap-1 px-4 py-2 bg-white/15 rounded-full border border-white/25 ${showNikud ? 'bg-purple-500/50 border-blue-500/70' : ''}`}
          onPress={toggleNikud}
        >
          <Text className="text-[18px] font-semibold text-white">אָ</Text>
          <Text className="text-sm text-white">{t('subtitles.nikud')}</Text>
        </TouchableOpacity>

        {isTV && (
          <TouchableOpacity
            className={`flex-row items-center gap-1 px-4 py-2 bg-white/15 rounded-full border border-white/25 ${subtitlesMode === 'select' ? 'bg-purple-500/50 border-blue-500/70' : ''}`}
            onPress={toggleSelectMode}
          >
            <Text className="text-base">👆</Text>
            <Text className="text-sm text-white">
              {subtitlesMode === 'select' ? t('subtitles.selection') : t('subtitles.translation')}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Subtitle Text */}
      <Animated.View className="w-full items-center px-6" style={{ opacity: fadeAnim }}>
        <GlassView className={`px-6 py-4 rounded-2xl max-w-[85%]`} intensity="medium">
          <View className="flex-row-reverse flex-wrap justify-center gap-1">
            {currentCue.words.map((word, index) => (
              <TouchableOpacity
                key={`${currentCue.index}-${index}`}
                onPress={() => word.is_hebrew && handleWordSelect(word, index)}
                disabled={!word.is_hebrew}
                className={`px-1 py-0.5 rounded ${focusedWordIndex === index ? 'bg-blue-500/40' : ''}`}
              >
                <Text
                  className={`${isTV ? 'text-[28px]' : 'text-xl'} font-medium text-white ${focusedWordIndex === index ? 'text-[#60a5fa]' : ''}`}
                >
                  {word.word}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </GlassView>
      </Animated.View>

      {/* Timestamp */}
      <Text className="text-xs text-gray-500 mt-2">
        {currentCue.formatted_start} - {currentCue.formatted_end}
      </Text>

      {/* Translation Modal */}
      <Modal
        visible={showTranslation}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTranslation(false)}
      >
        <TouchableOpacity
          className="flex-1 bg-black/70 justify-center items-center"
          activeOpacity={1}
          onPress={() => setShowTranslation(false)}
        >
          <GlassView className={`${isTV ? 'w-[400px]' : 'w-[300px]'} max-h-[60%] p-6 rounded-3xl`} intensity="heavy">
            {isTranslating ? (
              <View className="items-center py-8">
                <ActivityIndicator color={colors.primary} />
                <Text className="text-sm text-gray-400 mt-2">{t('subtitles.translating')}</Text>
              </View>
            ) : translation ? (
              <ScrollView>
                <View className="mb-4 pb-4 border-b border-white/10">
                  <Text className={`${isTV ? 'text-[32px]' : 'text-[26px]'} font-semibold text-white text-right`}>{translation.word}</Text>
                  {translation.transliteration && (
                    <Text className="text-sm text-gray-400 italic mt-1">
                      {translation.transliteration}
                    </Text>
                  )}
                </View>

                <View className="flex-row items-baseline gap-2 mb-4">
                  <Text className={`${isTV ? 'text-[22px]' : 'text-lg'} font-medium text-purple-400 flex-1`}>{translation.translation}</Text>
                  {translation.part_of_speech && (
                    <View className="bg-white/10 px-2 py-0.5 rounded-full">
                      <Text className="text-xs text-gray-400">
                        {translation.part_of_speech}
                      </Text>
                    </View>
                  )}
                </View>

                {translation.example && (
                  <View className="mt-4 pt-4 border-t border-white/10">
                    <Text className="text-sm text-gray-400 text-right mb-1">
                      {translation.example}
                    </Text>
                    {translation.example_translation && (
                      <Text className="text-sm text-gray-500 italic">
                        {translation.example_translation}
                      </Text>
                    )}
                  </View>
                )}
              </ScrollView>
            ) : null}

            <TouchableOpacity
              className="mt-6 py-2 bg-white/10 rounded-lg items-center"
              onPress={() => setShowTranslation(false)}
            >
              <Text className="text-base text-white font-medium">{t('subtitles.close')}</Text>
            </TouchableOpacity>
          </GlassView>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

export default InteractiveSubtitles;
