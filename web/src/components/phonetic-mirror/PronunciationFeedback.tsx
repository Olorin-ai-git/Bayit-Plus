/**
 * PronunciationFeedback Component
 * Per-word color-coded pronunciation scores with issue type indicators.
 */

import React from 'react';
import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { PhonemeFeedback } from '@/stores/phoneticMirrorStore.types';
import { styles } from './PronunciationFeedback.styles';

interface PronunciationFeedbackProps {
  feedback: PhonemeFeedback[];
}

const SCORE_COLORS = {
  excellent: '#34C759',
  good: '#30D158',
  fair: '#FF9F0A',
  poor: '#FF3B30',
};

const ISSUE_LABELS: Record<string, string> = {
  stress_wrong: 'phoneticMirror.issues.stressWrong',
  vowel_swap: 'phoneticMirror.issues.vowelSwap',
  consonant_swap: 'phoneticMirror.issues.consonantSwap',
  missing_sound: 'phoneticMirror.issues.missingSound',
  extra_sound: 'phoneticMirror.issues.extraSound',
};

function getScoreColor(score: number): string {
  if (score >= 0.9) return SCORE_COLORS.excellent;
  if (score >= 0.7) return SCORE_COLORS.good;
  if (score >= 0.5) return SCORE_COLORS.fair;
  return SCORE_COLORS.poor;
}

export function PronunciationFeedback({ feedback }: PronunciationFeedbackProps) {
  const { t } = useTranslation();

  if (!feedback || feedback.length === 0) return null;

  return (
    <View style={styles.container}>
      {feedback.map((item, index) => {
        const color = getScoreColor(item.score);
        const bgColor = `${color}20`;
        const scorePercent = Math.round(item.score * 100);

        return (
          <View
            key={`${item.word_he}-${index}`}
            style={[styles.wordRow, { backgroundColor: bgColor }]}
          >
            <Text style={styles.wordText}>{item.word_he}</Text>
            <View style={styles.wordDetails}>
              <View style={[styles.scoreChip, { backgroundColor: color }]}>
                <Text style={styles.scoreChipText}>{scorePercent}%</Text>
              </View>
              {item.issue_type && (
                <Text style={styles.issueTag}>
                  {t(ISSUE_LABELS[item.issue_type] || item.issue_type)}
                </Text>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}
