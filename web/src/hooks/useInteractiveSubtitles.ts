import { useState, useEffect, useCallback } from 'react';
import { SubtitleCue } from '@/types/subtitle';
import { subtitlesService } from '@/services/api';
import { logger } from '@bayit/shared-utils/logger';

interface UseInteractiveSubtitlesOptions {
  contentId?: string;
  language: string;
  subtitles: SubtitleCue[];
  currentTime: number;
  enabled: boolean;
}

interface TranslationResult {
  word: string;
  translation: string;
  transliteration: string;
  example?: string;
}

interface UseInteractiveSubtitlesReturn {
  activeCues: SubtitleCue[];
  selectedWord: string | null;
  translation: TranslationResult | null;
  isTranslating: boolean;
  interactiveMode: boolean;
  handleWordTap: (word: string) => Promise<void>;
  clearSelection: () => void;
  toggleInteractiveMode: () => void;
}

export const useInteractiveSubtitles = ({
  contentId,
  language,
  subtitles,
  currentTime,
  enabled
}: UseInteractiveSubtitlesOptions): UseInteractiveSubtitlesReturn => {
  const [activeCues, setActiveCues] = useState<SubtitleCue[]>([]);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [translation, setTranslation] = useState<TranslationResult | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [interactiveMode, setInteractiveMode] = useState(false);
  const [lastCueId, setLastCueId] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setActiveCues([]);
      return;
    }

    const active = subtitles.filter(
      (cue) => currentTime >= cue.start_time && currentTime <= cue.end_time
    );

    setActiveCues(active);

    const currentCueId = active.length > 0 ? (active[0].id ?? null) : null;
    if (currentCueId !== lastCueId) {
      clearSelection();
      setLastCueId(currentCueId);
    }
  }, [currentTime, subtitles, enabled, lastCueId]);

  const handleWordTap = useCallback(
    async (word: string) => {
      if (!interactiveMode || !word.trim()) {
        return;
      }

      setSelectedWord(word);
      setIsTranslating(true);

      try {
        const result = await subtitlesService.translateWord(word, language) as { translation: string; transliteration: string; example?: string };

        setTranslation({
          word,
          translation: result.translation,
          transliteration: result.transliteration,
          example: result.example
        });

        logger.info('Word translation successful', {
          word,
          language,
          contentId
        });
      } catch (error) {
        logger.error('Word translation failed', {
          word,
          language,
          contentId,
          error
        });
        setTranslation(null);
      } finally {
        setIsTranslating(false);
      }
    },
    [interactiveMode, language, contentId]
  );

  const clearSelection = useCallback(() => {
    setSelectedWord(null);
    setTranslation(null);
  }, []);

  const toggleInteractiveMode = useCallback(() => {
    setInteractiveMode((prev) => !prev);
    if (interactiveMode) {
      clearSelection();
    }
    logger.info('Interactive subtitle mode toggled', {
      enabled: !interactiveMode,
      contentId
    });
  }, [interactiveMode, contentId, clearSelection]);

  return {
    activeCues,
    selectedWord,
    translation,
    isTranslating,
    interactiveMode,
    handleWordTap,
    clearSelection,
    toggleInteractiveMode
  };
};
