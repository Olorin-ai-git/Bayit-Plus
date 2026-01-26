/**
 * TV Voice Permissions Steps Component
 * Renders individual permission request steps
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

type PermissionStep = 'intro' | 'microphone' | 'speech' | 'complete';

interface TVVoicePermissionsStepsProps {
  step: PermissionStep;
}

export const TVVoicePermissionsSteps: React.FC<TVVoicePermissionsStepsProps> = ({
  step,
}) => {
  const { t } = useTranslation();

  const renderIntro = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepIcon}>🎤</Text>
      <Text style={styles.stepTitle}>
        {t('voice.enable_title', 'Enable Voice Control')}
      </Text>
      <Text style={styles.stepDescription}>
        {t('voice.enable_description', 'Voice control lets you search, play content, and control playback using voice commands.')}
      </Text>
      <View style={styles.featuresList}>
        <Text style={styles.featureItem}>✓ {t('voice.feature_search', 'Search by voice')}</Text>
        <Text style={styles.featureItem}>✓ {t('voice.feature_play', 'Play content')}</Text>
        <Text style={styles.featureItem}>✓ {t('voice.feature_control', 'Control playback')}</Text>
      </View>
    </View>
  );

  const renderMicrophone = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepIcon}>🎙️</Text>
      <Text style={styles.stepTitle}>
        {t('voice.microphone_permission', 'Microphone Access')}
      </Text>
      <Text style={styles.stepDescription}>
        {t('voice.microphone_description', 'We need access to your microphone to listen to voice commands.')}
      </Text>
      <View style={styles.instructionsBox}>
        <Text style={styles.instructionTitle}>{t('voice.instructions', 'Instructions:')}</Text>
        <Text style={styles.instruction}>1. {t('voice.instruction_1', 'Allow microphone access')}</Text>
        <Text style={styles.instruction}>2. {t('voice.instruction_2', 'Position the remote near your mouth')}</Text>
        <Text style={styles.instruction}>3. {t('voice.instruction_3', 'Speak clearly and naturally')}</Text>
      </View>
    </View>
  );

  const renderSpeech = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepIcon}>🗣️</Text>
      <Text style={styles.stepTitle}>
        {t('voice.speech_recognition', 'Speech Recognition')}
      </Text>
      <Text style={styles.stepDescription}>
        {t('voice.speech_description', 'Enable speech recognition to convert your voice to text.')}
      </Text>
      <View style={styles.instructionsBox}>
        <Text style={styles.instructionTitle}>{t('voice.benefits', 'Benefits:')}</Text>
        <Text style={styles.instruction}>• {t('voice.benefit_1', 'Faster command processing')}</Text>
        <Text style={styles.instruction}>• {t('voice.benefit_2', 'Better accuracy')}</Text>
        <Text style={styles.instruction}>• {t('voice.benefit_3', 'Multi-language support')}</Text>
      </View>
    </View>
  );

  const renderComplete = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepIcon}>✓</Text>
      <Text style={styles.stepTitle}>
        {t('voice.setup_complete', 'Setup Complete!')}
      </Text>
      <Text style={styles.stepDescription}>
        {t('voice.setup_complete_description', 'Voice control is now enabled. You can start using voice commands right away.')}
      </Text>
      <View style={styles.completeTips}>
        <Text style={styles.tipTitle}>{t('voice.quick_tips', 'Quick Tips:')}</Text>
        <Text style={styles.tip}>• {t('voice.tip_1', 'Press Menu button to activate voice')}</Text>
        <Text style={styles.tip}>• {t('voice.tip_2', 'Use natural language')}</Text>
        <Text style={styles.tip}>• {t('voice.tip_3', 'Adjust settings anytime')}</Text>
      </View>
    </View>
  );

  switch (step) {
    case 'intro':
      return renderIntro();
    case 'microphone':
      return renderMicrophone();
    case 'speech':
      return renderSpeech();
    case 'complete':
      return renderComplete();
    default:
      return null;
  }
};

const styles = StyleSheet.create({
  stepContent: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 40,
  },
  stepIcon: {
    fontSize: 80,
    marginBottom: 24,
  },
  stepTitle: {
    fontSize: 48,
    fontWeight: '700',
    color: '#A855F7',
    marginBottom: 16,
    textAlign: 'center',
  },
  stepDescription: {
    fontSize: 28,
    fontWeight: '500',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 40,
  },
  featuresList: {
    width: '100%',
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(168, 85, 247, 0.3)',
    paddingHorizontal: 24,
    paddingVertical: 20,
    gap: 12,
  },
  featureItem: {
    fontSize: 24,
    fontWeight: '500',
    color: '#A855F7',
  },
  instructionsBox: {
    width: '100%',
    backgroundColor: 'rgba(107, 33, 168, 0.1)',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(107, 33, 168, 0.3)',
    paddingHorizontal: 24,
    paddingVertical: 20,
    gap: 12,
  },
  instructionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#A855F7',
    marginBottom: 12,
  },
  instruction: {
    fontSize: 22,
    fontWeight: '500',
    color: '#FFFFFF',
    lineHeight: 32,
  },
  completeTips: {
    width: '100%',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    paddingHorizontal: 24,
    paddingVertical: 20,
    gap: 12,
  },
  tipTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#10B981',
    marginBottom: 12,
  },
  tip: {
    fontSize: 22,
    fontWeight: '500',
    color: '#FFFFFF',
    lineHeight: 32,
  },
});

export default TVVoicePermissionsSteps;
