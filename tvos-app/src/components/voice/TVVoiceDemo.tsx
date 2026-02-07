/**
 * DEMO-ONLY: TVVoiceDemo Component
 * Step-by-step voice command demonstration for tvOS
 * This file may include demo-specific behavior. Not used in production.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Animated,
  Dimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import LinearGradient from 'react-native-linear-gradient';
import { useVoiceTV } from '../../hooks/useVoiceTV';
import { useVoiceStore } from '../../stores/voiceStore';
import { VoiceDemoStepContent } from './VoiceDemoStepContent';
import { VoiceDemoBottomNav } from './VoiceDemoBottomNav';
import styles from './styles/TVVoiceDemo.styles';

interface TVVoiceDemoProps {
  visible: boolean;
  onDismiss: () => void;
  onComplete?: () => void;
  autoStart?: boolean;
}

interface DemoStep {
  id: string;
  title: string;
  description: string;
  icon: string;
  action: () => void;
  completed: boolean;
}

const SAMPLE_COMMANDS = [
  { text: 'Show me live TV channels', icon: 'TV' },
  { text: 'Play the latest movie', icon: 'Film' },
  { text: 'Search for sports', icon: 'Sports' },
  { text: 'Open my favorites', icon: 'Fav' },
  { text: 'Go to settings', icon: 'Cog' },
];

export const TVVoiceDemo: React.FC<TVVoiceDemoProps> = ({
  visible,
  onDismiss,
  onComplete,
  autoStart = false,
}) => {
  const { t } = useTranslation();
  const { isListening, transcript } = useVoiceTV();
  const { isListening: isVoiceStoreListening } = useVoiceStore();

  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [focusedElementId, setFocusedElementId] = useState<string | null>(null);
  const [demoRunning, setDemoRunning] = useState(autoStart);
  const [showSkipButton, setShowSkipButton] = useState(true);

  const fadeAnim = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const { width, height } = Dimensions.get('window');

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: visible ? 1 : 0,
      duration: visible ? 400 : 300,
      useNativeDriver: true,
    }).start();
  }, [visible, fadeAnim]);

  useEffect(() => {
    if (currentStep === 0 && demoRunning) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.15, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [currentStep, demoRunning, pulseAnim]);

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: currentStep * -width,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [currentStep, slideAnim, width]);

  const steps: DemoStep[] = [
    { id: 'menu-button', title: t('demo.step1_title', 'Press Menu Button'), description: t('demo.step1_desc', 'Long-press the Menu button for 500ms to activate voice'), icon: '1', action: () => moveToNextStep(), completed: completedSteps.has(0) },
    { id: 'speak', title: t('demo.step2_title', 'Speak Your Command'), description: t('demo.step2_desc', 'Say one of the sample commands shown below'), icon: '2', action: () => moveToNextStep(), completed: completedSteps.has(1) },
    { id: 'response', title: t('demo.step3_title', 'See Response'), description: t('demo.step3_desc', 'Your command is processed and executed'), icon: '3', action: () => moveToNextStep(), completed: completedSteps.has(2) },
    { id: 'repeat', title: t('demo.step4_title', 'Try Another Command'), description: t('demo.step4_desc', 'Press Menu button again to give another command'), icon: '4', action: () => setDemoRunning(false), completed: completedSteps.has(3) },
  ];

  const moveToNextStep = useCallback(() => {
    const newCompleted = new Set(completedSteps);
    newCompleted.add(currentStep);
    setCompletedSteps(newCompleted);
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setDemoRunning(false);
      onComplete?.();
    }
  }, [currentStep, completedSteps, steps.length, onComplete]);

  useEffect(() => {
    if (!demoRunning) return;
    if (currentStep === 0 && isListening) {
      setTimeout(() => moveToNextStep(), 1500);
    } else if (currentStep === 1 && transcript) {
      setTimeout(() => moveToNextStep(), 1500);
    } else if (currentStep === 2) {
      setTimeout(() => moveToNextStep(), 2500);
    }
  }, [demoRunning, currentStep, isListening, transcript, moveToNextStep]);

  if (!visible) return null;

  const progressPercentage = ((currentStep + 1) / steps.length) * 100;

  return (
    <Animated.View
      style={[styles.overlay, { opacity: fadeAnim, width, height }]}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      <LinearGradient colors={['rgba(0, 0, 0, 0.95)', 'rgba(13, 13, 26, 0.98)']} style={styles.container}>
        <Pressable
          onPress={onDismiss}
          onFocus={() => setFocusedElementId('close')}
          onBlur={() => setFocusedElementId(null)}
          accessible accessibilityLabel={t('common.close', 'Close')}
          style={[styles.closeButton, focusedElementId === 'close' && styles.closeButtonFocused]}
        >
          <Text style={styles.closeButtonText}>&#x2715;</Text>
        </Pressable>

        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progressPercentage}%` }]} />
          </View>
          <Text style={styles.progressText}>
            {t('demo.step_progress', { current: currentStep + 1, total: steps.length, defaultValue: `Step ${currentStep + 1} of ${steps.length}` })}
          </Text>
        </View>

        <ScrollView style={styles.stepsContainer} scrollEnabled={false} showsVerticalScrollIndicator={false}>
          {steps.map((step, index) => (
            <VoiceDemoStepContent
              key={step.id}
              step={step}
              index={index}
              currentStep={currentStep}
              width={width}
              demoRunning={demoRunning}
              pulseAnim={pulseAnim}
              isListening={isListening}
              transcript={transcript}
              sampleCommands={SAMPLE_COMMANDS}
              focusedElementId={focusedElementId}
              setFocusedElementId={setFocusedElementId}
              t={t}
            />
          ))}
        </ScrollView>

        <VoiceDemoBottomNav
          showSkipButton={showSkipButton}
          demoRunning={demoRunning}
          currentStep={currentStep}
          stepsLength={steps.length}
          focusedElementId={focusedElementId}
          setFocusedElementId={setFocusedElementId}
          onSkip={() => { setDemoRunning(false); onDismiss(); }}
          onNext={() => moveToNextStep()}
          onDone={() => { onDismiss(); onComplete?.(); }}
          t={t}
        />
      </LinearGradient>
    </Animated.View>
  );
};

export default TVVoiceDemo;
