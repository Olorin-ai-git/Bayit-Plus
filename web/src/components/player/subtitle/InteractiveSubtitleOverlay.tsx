import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { View, Text, StyleSheet } from "react-native";
import {
  colors,
  spacing,
  borderRadius,
  fontSize,
  glass,
} from "@olorin/design-tokens";
import {
  SubtitleCue,
  SubtitleSettings,
  getLanguageInfo,
} from "@/types/subtitle";
import { InteractiveWord } from "./InteractiveWord";
import { TranslationPopup } from "./TranslationPopup";
import { subtitlesService } from "@/services/api";
import { logger } from "@bayit/shared-utils/logger";

interface InteractiveSubtitleOverlayProps {
  currentTime: number;
  subtitles: SubtitleCue[];
  language: string;
  enabled: boolean;
  settings: SubtitleSettings;
  onWordTap: (word: string) => void;
}

interface TranslationData {
  word: string;
  translation: string;
  transliteration: string;
  example?: string;
  position: { x: number; y: number };
}

export const InteractiveSubtitleOverlay: React.FC<
  InteractiveSubtitleOverlayProps
> = ({ currentTime, subtitles, language, enabled, settings, onWordTap }) => {
  const { t } = useTranslation();
  const [selectedWordIndex, setSelectedWordIndex] = useState<number | null>(
    null,
  );
  const [translation, setTranslation] = useState<TranslationData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const languageInfo = getLanguageInfo(language);
  const isRTL = languageInfo?.rtl || false;

  const activeCues = subtitles.filter(
    (cue) => currentTime >= cue.start_time && currentTime <= cue.end_time,
  );

  useEffect(() => {
    setSelectedWordIndex(null);
    setTranslation(null);
  }, [activeCues.length > 0 ? activeCues[0]?.id : null]);

  const handleWordTap = async (word: string, index: number, event: any) => {
    setSelectedWordIndex(index);
    onWordTap(word);

    setIsLoading(true);
    try {
      const result = (await subtitlesService.translateWord(
        word,
        language,
      )) as unknown as {
        translation: string;
        transliteration: string;
        example?: string;
      };

      const rect = event.target.getBoundingClientRect();
      setTranslation({
        word,
        translation: result.translation,
        transliteration: result.transliteration,
        example: result.example,
        position: {
          x: rect.left + rect.width / 2,
          y: rect.top - spacing.md,
        },
      });

      logger.info("Word translation fetched", { word, language });
    } catch (error) {
      logger.error("Failed to translate word", { word, language, error });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseTranslation = () => {
    setTranslation(null);
    setSelectedWordIndex(null);
  };

  if (!enabled || activeCues.length === 0) {
    return null;
  }

  const words = activeCues
    .map((cue) => cue.text)
    .join(" ")
    .split(" ");

  return (
    <View style={styles.container}>
      <View style={[styles.wordsContainer, isRTL && styles.rtlContainer]}>
        {words.map((word, index) => (
          <InteractiveWord
            key={`${index}-${word}`}
            word={word}
            index={index}
            isHighlighted={selectedWordIndex === index}
            isRTL={isRTL}
            onWordTap={(w, i) => handleWordTap(w, i, event)}
          />
        ))}
      </View>

      {translation && (
        <TranslationPopup
          word={translation.word}
          translation={translation.translation}
          transliteration={translation.transliteration}
          example={translation.example}
          position={translation.position}
          onClose={handleCloseTranslation}
        />
      )}

      {isLoading && (
        <View style={styles.loadingIndicator}>
          <Text style={styles.loadingText}>{t("common.loading")}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: spacing.xl,
    left: "50%",
    transform: [{ translateX: "-50%" }],
    maxWidth: "80%",
    alignItems: "center",
    zIndex: 100,
  },
  wordsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.md,
    backgroundColor: glass.surface.medium,
    backdropFilter: glass.blur.lg,
    borderRadius: borderRadius.lg,
  },
  rtlContainer: {
    flexDirection: "row-reverse",
  },
  loadingIndicator: {
    position: "absolute",
    top: -spacing.xl,
    padding: spacing.sm,
    backgroundColor: glass.surface.dark,
    borderRadius: borderRadius.md,
  },
  loadingText: {
    fontSize: fontSize.sm,
    color: colors.neutral[300],
  },
});
