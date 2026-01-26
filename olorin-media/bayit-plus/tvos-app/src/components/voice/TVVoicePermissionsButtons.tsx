/**
 * TV Voice Permissions Buttons Component
 * Renders buttons for each permission step
 */

import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

type PermissionStep = 'intro' | 'microphone' | 'speech' | 'complete';

interface TVVoicePermissionsButtonsProps {
  step: PermissionStep;
  focusedButton: string | null;
  isRequesting: boolean;
  onFocus: (id: string) => void;
  onBlur: () => void;
  onNextStep: () => void;
  onRequestPermission: (type: 'microphone' | 'speech') => Promise<void>;
  onComplete?: () => void;
  onCancel?: () => void;
}

export const TVVoicePermissionsButtons: React.FC<TVVoicePermissionsButtonsProps> = ({
  step,
  focusedButton,
  isRequesting,
  onFocus,
  onBlur,
  onNextStep,
  onRequestPermission,
  onComplete,
  onCancel,
}) => {
  const { t } = useTranslation();

  const renderIntroButtons = () => (
    <>
      <Pressable
        onPress={onNextStep}
        onFocus={() => onFocus('next')}
        onBlur={onBlur}
        accessible
        accessibilityLabel={t('voice.get_started', 'Get Started')}
        style={[
          styles.button,
          styles.primaryButton,
          {
            borderColor: focusedButton === 'next' ? '#A855F7' : 'transparent',
            transform: [{ scale: focusedButton === 'next' ? 1.05 : 1 }],
          },
        ]}
      >
        <Text style={styles.primaryButtonText}>
          {t('voice.get_started', 'Get Started')}
        </Text>
      </Pressable>

      <Pressable
        onPress={onCancel}
        onFocus={() => onFocus('skip')}
        onBlur={onBlur}
        accessible
        accessibilityLabel={t('voice.skip', 'Skip')}
        style={[
          styles.button,
          styles.secondaryButton,
          {
            borderColor: focusedButton === 'skip' ? '#A855F7' : 'transparent',
            transform: [{ scale: focusedButton === 'skip' ? 1.05 : 1 }],
          },
        ]}
      >
        <Text style={styles.secondaryButtonText}>
          {t('voice.skip', 'Skip')}
        </Text>
      </Pressable>
    </>
  );

  const renderPermissionButtons = () => (
    <>
      <Pressable
        onPress={() => onRequestPermission(step === 'microphone' ? 'microphone' : 'speech')}
        onFocus={() => onFocus('allow')}
        onBlur={onBlur}
        disabled={isRequesting}
        accessible
        accessibilityLabel={t('voice.allow', 'Allow')}
        style={[
          styles.button,
          styles.primaryButton,
          {
            borderColor: focusedButton === 'allow' ? '#A855F7' : 'transparent',
            transform: [{ scale: focusedButton === 'allow' ? 1.05 : 1 }],
            opacity: isRequesting ? 0.6 : 1,
          },
        ]}
      >
        <Text style={styles.primaryButtonText}>
          {t('voice.allow', 'Allow')}
        </Text>
      </Pressable>

      <Pressable
        onPress={onCancel}
        onFocus={() => onFocus('deny')}
        onBlur={onBlur}
        accessible
        accessibilityLabel={t('voice.deny', 'Deny')}
        style={[
          styles.button,
          styles.secondaryButton,
          {
            borderColor: focusedButton === 'deny' ? '#A855F7' : 'transparent',
            transform: [{ scale: focusedButton === 'deny' ? 1.05 : 1 }],
          },
        ]}
      >
        <Text style={styles.secondaryButtonText}>
          {t('voice.deny', 'Deny')}
        </Text>
      </Pressable>
    </>
  );

  const renderCompleteButtons = () => (
    <Pressable
      onPress={onComplete}
      onFocus={() => onFocus('finish')}
      onBlur={onBlur}
      accessible
      accessibilityLabel={t('voice.finish', 'Finish')}
      style={[
        styles.button,
        styles.primaryButton,
        {
          borderColor: focusedButton === 'finish' ? '#A855F7' : 'transparent',
          transform: [{ scale: focusedButton === 'finish' ? 1.05 : 1 }],
        },
      ]}
    >
      <Text style={styles.primaryButtonText}>
        {t('voice.finish', 'Finish')}
      </Text>
    </Pressable>
  );

  switch (step) {
    case 'intro':
      return renderIntroButtons();
    case 'microphone':
    case 'speech':
      return renderPermissionButtons();
    case 'complete':
      return renderCompleteButtons();
    default:
      return null;
  }
};

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 40,
    paddingVertical: 20,
    borderRadius: 12,
    borderWidth: 4,
    minHeight: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: 'rgba(168, 85, 247, 0.3)',
    borderColor: 'rgba(168, 85, 247, 0.2)',
  },
  primaryButtonText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#A855F7',
  },
  secondaryButton: {
    backgroundColor: 'rgba(107, 33, 168, 0.1)',
    borderColor: 'rgba(107, 33, 168, 0.2)',
  },
  secondaryButtonText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#9CA3AF',
  },
});

export default TVVoicePermissionsButtons;
