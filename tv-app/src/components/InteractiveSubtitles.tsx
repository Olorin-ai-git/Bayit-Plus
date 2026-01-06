import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Modal,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { GlassView } from './ui/GlassView';
import { colors, spacing, fontSize, borderRadius } from '../theme';
import { subtitlesService } from '../services/api';
import { isTV } from '../utils/platform';

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
        console.error('Failed to fetch subtitles:', err);
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
      console.error('Translation failed:', err);
      setTranslation({ word: word.word, translation: 'Translation unavailable' });
    } finally {
      setIsTranslating(false);
    }
  }, [onWordTranslate]);

  // Toggle nikud display
  const toggleNikud = useCallback(async () => {
    if (!hasNikud && !showNikud) {
      // Generate nikud if not available
      try {
        await subtitlesService.generateNikud(contentId, language);
        setHasNikud(true);
      } catch (err) {
        console.error('Failed to generate nikud:', err);
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
      <View style={styles.container}>
        <ActivityIndicator color={colors.primary} size="small" />
      </View>
    );
  }

  if (!currentCue) {
    return (
      <View style={styles.container}>
        <View style={styles.controls}>
          <TouchableOpacity
            style={[styles.controlButton, showNikud && styles.controlButtonActive]}
            onPress={toggleNikud}
          >
            <Text style={styles.nikudIcon}>אָ</Text>
            <Text style={styles.controlLabel}>ניקוד</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.controlButton, showNikud && styles.controlButtonActive]}
          onPress={toggleNikud}
        >
          <Text style={styles.nikudIcon}>אָ</Text>
          <Text style={styles.controlLabel}>ניקוד</Text>
        </TouchableOpacity>

        {isTV && (
          <TouchableOpacity
            style={[styles.controlButton, subtitlesMode === 'select' && styles.controlButtonActive]}
            onPress={toggleSelectMode}
          >
            <Text style={styles.controlIcon}>👆</Text>
            <Text style={styles.controlLabel}>
              {subtitlesMode === 'select' ? 'בחירה' : 'תרגום'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Subtitle Text */}
      <Animated.View style={[styles.subtitleContainer, { opacity: fadeAnim }]}>
        <GlassView style={styles.subtitleGlass} intensity="medium">
          <View style={styles.subtitleText}>
            {currentCue.words.map((word, index) => (
              <TouchableOpacity
                key={`${currentCue.index}-${index}`}
                onPress={() => word.is_hebrew && handleWordSelect(word, index)}
                disabled={!word.is_hebrew}
                style={[
                  styles.wordContainer,
                  focusedWordIndex === index && styles.wordFocused,
                ]}
              >
                <Text
                  style={[
                    styles.word,
                    word.is_hebrew && styles.hebrewWord,
                    focusedWordIndex === index && styles.wordFocusedText,
                  ]}
                >
                  {word.word}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </GlassView>
      </Animated.View>

      {/* Timestamp */}
      <Text style={styles.timestamp}>
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
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowTranslation(false)}
        >
          <GlassView style={styles.translationModal} intensity="heavy">
            {isTranslating ? (
              <View style={styles.translationLoading}>
                <ActivityIndicator color={colors.primary} />
                <Text style={styles.loadingText}>מתרגם...</Text>
              </View>
            ) : translation ? (
              <ScrollView>
                <View style={styles.translationHeader}>
                  <Text style={styles.originalWord}>{translation.word}</Text>
                  {translation.transliteration && (
                    <Text style={styles.transliteration}>
                      {translation.transliteration}
                    </Text>
                  )}
                </View>

                <View style={styles.translationContent}>
                  <Text style={styles.translationText}>{translation.translation}</Text>
                  {translation.part_of_speech && (
                    <View style={styles.partOfSpeechBadge}>
                      <Text style={styles.partOfSpeechText}>
                        {translation.part_of_speech}
                      </Text>
                    </View>
                  )}
                </View>

                {translation.example && (
                  <View style={styles.exampleContainer}>
                    <Text style={styles.exampleHebrew}>{translation.example}</Text>
                    {translation.example_translation && (
                      <Text style={styles.exampleEnglish}>
                        {translation.example_translation}
                      </Text>
                    )}
                  </View>
                )}
              </ScrollView>
            ) : null}

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowTranslation(false)}
            >
              <Text style={styles.closeButtonText}>סגור</Text>
            </TouchableOpacity>
          </GlassView>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  controls: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.md,
    flexDirection: 'row',
    gap: spacing.sm,
    zIndex: 10,
  },
  controlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  controlButtonActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.5)',
    borderColor: 'rgba(59, 130, 246, 0.7)',
  },
  nikudIcon: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  controlIcon: {
    fontSize: 16,
  },
  controlLabel: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  subtitleContainer: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  subtitleGlass: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    maxWidth: '85%',
  },
  subtitleText: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  wordContainer: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  wordFocused: {
    backgroundColor: 'rgba(59, 130, 246, 0.4)',
  },
  word: {
    fontSize: isTV ? 28 : 20,
    fontWeight: '500',
    color: colors.text,
  },
  hebrewWord: {
    // Hebrew words are clickable
  },
  wordFocusedText: {
    color: '#60a5fa',
  },
  timestamp: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  translationModal: {
    width: isTV ? 400 : 300,
    maxHeight: '60%',
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
  },
  translationLoading: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  loadingText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  translationHeader: {
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  originalWord: {
    fontSize: isTV ? 32 : 26,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'right',
  },
  transliteration: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: spacing.xs,
  },
  translationContent: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  translationText: {
    fontSize: isTV ? 22 : 18,
    fontWeight: '500',
    color: colors.primary,
    flex: 1,
  },
  partOfSpeechBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  partOfSpeechText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  exampleContainer: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  exampleHebrew: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'right',
    marginBottom: spacing.xs,
  },
  exampleEnglish: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  closeButton: {
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: '500',
  },
});

export default InteractiveSubtitles;
