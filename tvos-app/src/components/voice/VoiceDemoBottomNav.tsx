/**
 * VoiceDemoBottomNav - Bottom navigation for TVVoiceDemo
 * Extracted from TVVoiceDemo.tsx for file size compliance
 */

import React from 'react';
import { View, Text, Pressable } from 'react-native';
import styles from './styles/TVVoiceDemo.styles';

interface VoiceDemoBottomNavProps {
  showSkipButton: boolean;
  demoRunning: boolean;
  currentStep: number;
  stepsLength: number;
  focusedElementId: string | null;
  setFocusedElementId: (id: string | null) => void;
  onSkip: () => void;
  onNext: () => void;
  onDone: () => void;
  t: (key: string, defaultValue?: string) => string;
}

export const VoiceDemoBottomNav: React.FC<VoiceDemoBottomNavProps> = ({
  showSkipButton,
  demoRunning,
  currentStep,
  stepsLength,
  focusedElementId,
  setFocusedElementId,
  onSkip,
  onNext,
  onDone,
  t,
}) => {
  return (
    <View style={styles.bottomNav}>
      {showSkipButton && (
        <Pressable
          onPress={onSkip}
          onFocus={() => setFocusedElementId('skip')}
          onBlur={() => setFocusedElementId(null)}
          accessible accessibilityLabel={t('demo.skip_demo', 'Skip demo')}
          style={[styles.skipButton, focusedElementId === 'skip' && styles.skipButtonFocused]}
        >
          <Text style={styles.skipButtonText}>{t('demo.skip_demo', 'Skip Demo')}</Text>
        </Pressable>
      )}

      {demoRunning && currentStep < stepsLength - 1 && (
        <Pressable
          onPress={onNext}
          onFocus={() => setFocusedElementId('next')}
          onBlur={() => setFocusedElementId(null)}
          accessible accessibilityLabel={t('common.next', 'Next')}
          style={[styles.nextButton, focusedElementId === 'next' && styles.nextButtonFocused]}
        >
          <Text style={styles.nextButtonText}>{t('common.next', 'Next')} &rarr;</Text>
        </Pressable>
      )}

      {!demoRunning && (
        <Pressable
          onPress={onDone}
          onFocus={() => setFocusedElementId('done')}
          onBlur={() => setFocusedElementId(null)}
          accessible accessibilityLabel={t('common.done', 'Done')}
          style={[styles.doneButton, focusedElementId === 'done' && styles.doneButtonFocused]}
        >
          <Text style={styles.doneButtonText}>{t('common.done', 'Done')}</Text>
        </Pressable>
      )}
    </View>
  );
};
