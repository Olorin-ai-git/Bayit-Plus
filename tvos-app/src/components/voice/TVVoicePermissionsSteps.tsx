/**
 * TV Voice Permissions Steps Component
 * Renders individual permission request steps
 */

import React from 'react';
import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { styles } from './styles/TVVoicePermissionsSteps.styles';

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
      <View style={styles.stepIconContainer}>
        <Text style={styles.stepIconText}>MIC</Text>
      </View>
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
      <View style={styles.stepIconContainer}>
        <Text style={styles.stepIconText}>2</Text>
      </View>
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
      <View style={styles.stepIconContainer}>
        <Text style={styles.stepIconText}>3</Text>
      </View>
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
      <View style={[styles.stepIconContainer, styles.stepIconSuccess]}>
        <Text style={styles.stepIconText}>OK</Text>
      </View>
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

export default TVVoicePermissionsSteps;
