/**
 * VoiceDemoStepContent - Individual step rendering for TVVoiceDemo
 * Extracted from TVVoiceDemo.tsx for file size compliance
 */

import React from 'react';
import { View, Text, Pressable, Animated } from 'react-native';
import styles from './styles/TVVoiceDemo.styles';

interface SampleCommand {
  text: string;
  icon: string;
}

interface DemoStep {
  id: string;
  title: string;
  description: string;
  icon: string;
  action: () => void;
  completed: boolean;
}

interface VoiceDemoStepContentProps {
  step: DemoStep;
  index: number;
  currentStep: number;
  width: number;
  demoRunning: boolean;
  pulseAnim: Animated.Value;
  isListening: boolean;
  transcript: string;
  sampleCommands: SampleCommand[];
  focusedElementId: string | null;
  setFocusedElementId: (id: string | null) => void;
  t: (key: string, defaultValue?: string) => string;
}

export const VoiceDemoStepContent: React.FC<VoiceDemoStepContentProps> = ({
  step,
  index,
  currentStep,
  width,
  demoRunning,
  pulseAnim,
  isListening,
  transcript,
  sampleCommands,
  focusedElementId,
  setFocusedElementId,
  t,
}) => {
  return (
    <View
      style={[
        styles.stepContent,
        { width },
        index === currentStep && styles.currentStepContent,
      ]}
    >
      <Text style={styles.stepIcon}>{step.icon}</Text>

      {step.id === 'menu-button' && demoRunning && (
        <Animated.View style={[styles.menuButtonGraphic, { transform: [{ scale: pulseAnim }] }]}>
          <Text style={styles.menuButtonText}>MENU</Text>
        </Animated.View>
      )}

      {step.id === 'speak' && isListening && (
        <View style={styles.microphoneContainer}>
          <View style={styles.microphoneIconContainer}>
            <Text style={styles.microphoneIconText}>MIC</Text>
          </View>
          <Text style={styles.listeningText}>{t('voice.listening', 'Listening...')}</Text>
        </View>
      )}

      {step.id === 'speak' && transcript && (
        <View style={styles.transcriptBox}>
          <Text style={styles.transcriptLabel}>{t('demo.you_said', 'You said:')}</Text>
          <Text style={styles.transcriptText}>{transcript}</Text>
        </View>
      )}

      {step.id === 'speak' && (
        <View style={styles.samplesContainer}>
          <Text style={styles.samplesTitle}>{t('demo.try_saying', 'Try saying:')}</Text>
          {sampleCommands.map((cmd, idx) => (
            <View
              key={idx}
              style={[
                styles.sampleCommand,
                focusedElementId === `sample-${idx}` && styles.sampleCommandFocused,
              ]}
            >
              <Text style={styles.sampleIcon}>{cmd.icon}</Text>
              <Text style={styles.sampleText}>{cmd.text}</Text>
            </View>
          ))}
        </View>
      )}

      <Text style={styles.stepTitle}>{step.title}</Text>
      <Text style={styles.stepDescription}>{step.description}</Text>

      {!demoRunning && (
        <Pressable
          onPress={step.action}
          onFocus={() => setFocusedElementId(`try-${step.id}`)}
          onBlur={() => setFocusedElementId(null)}
          accessible accessibilityLabel={t('demo.try_it', 'Try it')}
          style={[styles.tryButton, focusedElementId === `try-${step.id}` && styles.tryButtonFocused]}
        >
          <Text style={styles.tryButtonText}>{t('demo.try_it', 'Try it')}</Text>
        </Pressable>
      )}
    </View>
  );
};
