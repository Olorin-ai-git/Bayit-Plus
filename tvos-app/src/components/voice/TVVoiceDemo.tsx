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
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import LinearGradient from 'react-native-linear-gradient';
import { useVoiceTV } from '../../hooks/useVoiceTV';
import { useVoiceStore } from '../../stores/voiceStore';

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
  { text: 'Show me live TV channels', icon: '📺' },
  { text: 'Play the latest movie', icon: '🎬' },
  { text: 'Search for sports', icon: '⚽' },
  { text: 'Open my favorites', icon: '❤️' },
  { text: 'Go to settings', icon: '⚙️' },
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

  // Animation for showing demo
  useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, fadeAnim]);

  // Pulsing animation for menu button graphic
  useEffect(() => {
    if (currentStep === 0 && demoRunning) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [currentStep, demoRunning, pulseAnim]);

  // Animation for step transitions
  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: currentStep * -width,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [currentStep, slideAnim, width]);

  // Define demo steps
  const steps: DemoStep[] = [
    {
      id: 'menu-button',
      title: t('demo.step1_title', 'Press Menu Button'),
      description: t('demo.step1_desc', 'Long-press the Menu button for 500ms to activate voice'),
      icon: '🔘',
      action: () => moveToNextStep(),
      completed: completedSteps.has(0),
    },
    {
      id: 'speak',
      title: t('demo.step2_title', 'Speak Your Command'),
      description: t('demo.step2_desc', 'Say one of the sample commands shown below'),
      icon: '🎤',
      action: () => moveToNextStep(),
      completed: completedSteps.has(1),
    },
    {
      id: 'response',
      title: t('demo.step3_title', 'See Response'),
      description: t('demo.step3_desc', 'Your command is processed and executed'),
      icon: '✓',
      action: () => moveToNextStep(),
      completed: completedSteps.has(2),
    },
    {
      id: 'repeat',
      title: t('demo.step4_title', 'Try Another Command'),
      description: t('demo.step4_desc', 'Press Menu button again to give another command'),
      icon: '🔄',
      action: () => setDemoRunning(false),
      completed: completedSteps.has(3),
    },
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

  // Auto-advance demo if running
  useEffect(() => {
    if (!demoRunning) return;

    // Step-specific auto-advance logic
    if (currentStep === 0 && isListening) {
      // Auto-advance after Menu button is long-pressed
      setTimeout(() => moveToNextStep(), 1500);
    } else if (currentStep === 1 && transcript) {
      // Auto-advance after speech is recognized
      setTimeout(() => moveToNextStep(), 1500);
    } else if (currentStep === 2) {
      // Auto-advance after showing response
      setTimeout(() => moveToNextStep(), 2500);
    }
  }, [demoRunning, currentStep, isListening, transcript, moveToNextStep]);

  if (!visible) {
    return null;
  }

  const currentStepData = steps[currentStep];
  const progressPercentage = ((currentStep + 1) / steps.length) * 100;

  return (
    <Animated.View
      style={[
        styles.overlay,
        {
          opacity: fadeAnim,
          width,
          height,
        },
      ]}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      <LinearGradient
        colors={['rgba(0, 0, 0, 0.95)', 'rgba(13, 13, 26, 0.98)']}
        style={styles.container}
      >
        {/* Close Button */}
        <Pressable
          onPress={onDismiss}
          onFocus={() => setFocusedElementId('close')}
          onBlur={() => setFocusedElementId(null)}
          accessible
          accessibilityLabel={t('common.close', 'Close')}
          style={[
            styles.closeButton,
            focusedElementId === 'close' && styles.closeButtonFocused,
          ]}
        >
          <Text style={styles.closeButtonText}>✕</Text>
        </Pressable>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${progressPercentage}%` },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {t('demo.step_progress', {
              current: currentStep + 1,
              total: steps.length,
              defaultValue: `Step ${currentStep + 1} of ${steps.length}`,
            })}
          </Text>
        </View>

        {/* Steps Content */}
        <ScrollView
          style={styles.stepsContainer}
          scrollEnabled={false}
          showsVerticalScrollIndicator={false}
        >
          {steps.map((step, index) => (
            <View
              key={step.id}
              style={[
                styles.stepContent,
                { width },
                index === currentStep && styles.currentStepContent,
              ]}
            >
              {/* Step Icon */}
              <Text style={styles.stepIcon}>{step.icon}</Text>

              {/* Menu Button Graphic (Step 1) */}
              {step.id === 'menu-button' && demoRunning && (
                <Animated.View
                  style={[
                    styles.menuButtonGraphic,
                    { transform: [{ scale: pulseAnim }] },
                  ]}
                >
                  <Text style={styles.menuButtonText}>MENU</Text>
                </Animated.View>
              )}

              {/* Microphone Animation (Step 2) */}
              {step.id === 'speak' && isListening && (
                <View style={styles.microphoneContainer}>
                  <Text style={styles.microphoneIcon}>🎤</Text>
                  <Text style={styles.listeningText}>
                    {t('voice.listening', 'Listening...')}
                  </Text>
                </View>
              )}

              {/* Transcript Display (Step 2) */}
              {step.id === 'speak' && transcript && (
                <View style={styles.transcriptBox}>
                  <Text style={styles.transcriptLabel}>
                    {t('demo.you_said', 'You said:')}
                  </Text>
                  <Text style={styles.transcriptText}>{transcript}</Text>
                </View>
              )}

              {/* Sample Commands List */}
              {step.id === 'speak' && (
                <View style={styles.samplesContainer}>
                  <Text style={styles.samplesTitle}>
                    {t('demo.try_saying', 'Try saying:')}
                  </Text>
                  {SAMPLE_COMMANDS.map((cmd, idx) => (
                    <View
                      key={idx}
                      style={[
                        styles.sampleCommand,
                        focusedElementId === `sample-${idx}` &&
                          styles.sampleCommandFocused,
                      ]}
                    >
                      <Text style={styles.sampleIcon}>{cmd.icon}</Text>
                      <Text style={styles.sampleText}>{cmd.text}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Step Title and Description */}
              <Text style={styles.stepTitle}>{step.title}</Text>
              <Text style={styles.stepDescription}>{step.description}</Text>

              {/* Try It Button (if not running demo) */}
              {!demoRunning && (
                <Pressable
                  onPress={step.action}
                  onFocus={() => setFocusedElementId(`try-${step.id}`)}
                  onBlur={() => setFocusedElementId(null)}
                  accessible
                  accessibilityLabel={t('demo.try_it', 'Try it')}
                  style={[
                    styles.tryButton,
                    focusedElementId === `try-${step.id}` &&
                      styles.tryButtonFocused,
                  ]}
                >
                  <Text style={styles.tryButtonText}>
                    {t('demo.try_it', 'Try it')}
                  </Text>
                </Pressable>
              )}
            </View>
          ))}
        </ScrollView>

        {/* Bottom Navigation */}
        <View style={styles.bottomNav}>
          {/* Skip Button */}
          {showSkipButton && (
            <Pressable
              onPress={() => {
                setDemoRunning(false);
                onDismiss();
              }}
              onFocus={() => setFocusedElementId('skip')}
              onBlur={() => setFocusedElementId(null)}
              accessible
              accessibilityLabel={t('demo.skip_demo', 'Skip demo')}
              style={[
                styles.skipButton,
                focusedElementId === 'skip' && styles.skipButtonFocused,
              ]}
            >
              <Text style={styles.skipButtonText}>
                {t('demo.skip_demo', 'Skip Demo')}
              </Text>
            </Pressable>
          )}

          {/* Next Button */}
          {demoRunning && currentStep < steps.length - 1 && (
            <Pressable
              onPress={() => moveToNextStep()}
              onFocus={() => setFocusedElementId('next')}
              onBlur={() => setFocusedElementId(null)}
              accessible
              accessibilityLabel={t('common.next', 'Next')}
              style={[
                styles.nextButton,
                focusedElementId === 'next' && styles.nextButtonFocused,
              ]}
            >
              <Text style={styles.nextButtonText}>
                {t('common.next', 'Next')} →
              </Text>
            </Pressable>
          )}

          {/* Done Button */}
          {!demoRunning && (
            <Pressable
              onPress={() => {
                onDismiss();
                onComplete?.();
              }}
              onFocus={() => setFocusedElementId('done')}
              onBlur={() => setFocusedElementId(null)}
              accessible
              accessibilityLabel={t('common.done', 'Done')}
              style={[
                styles.doneButton,
                focusedElementId === 'done' && styles.doneButtonFocused,
              ]}
            >
              <Text style={styles.doneButtonText}>
                {t('common.done', 'Done')}
              </Text>
            </Pressable>
          )}
        </View>
      </LinearGradient>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 9999,
  },
  container: {
    flex: 1,
    paddingTop: 60,
    paddingBottom: 80,
    paddingHorizontal: 60,
  },
  closeButton: {
    position: 'absolute',
    top: 30,
    right: 40,
    width: 60,
    height: 60,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonFocused: {
    borderColor: '#A855F7',
    backgroundColor: 'rgba(168, 85, 247, 0.4)',
    transform: [{ scale: 1.1 }],
  },
  closeButtonText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  progressContainer: {
    marginBottom: 40,
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#A855F7',
  },
  progressText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#A855F7',
    textAlign: 'center',
  },
  stepsContainer: {
    flex: 1,
    marginBottom: 20,
  },
  stepContent: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  currentStepContent: {
    opacity: 1,
  },
  stepIcon: {
    fontSize: 120,
    marginBottom: 30,
  },
  menuButtonGraphic: {
    width: 200,
    height: 200,
    borderRadius: 16,
    backgroundColor: 'rgba(168, 85, 247, 0.3)',
    borderWidth: 4,
    borderColor: '#A855F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  menuButtonText: {
    fontSize: 48,
    fontWeight: '700',
    color: '#A855F7',
    letterSpacing: 2,
  },
  microphoneContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  microphoneIcon: {
    fontSize: 80,
    marginBottom: 12,
  },
  listeningText: {
    fontSize: 32,
    fontWeight: '600',
    color: '#A855F7',
  },
  transcriptBox: {
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#A855F7',
    padding: 24,
    marginBottom: 30,
    width: '100%',
  },
  transcriptLabel: {
    fontSize: 18,
    fontWeight: '500',
    color: '#AAAAAA',
    marginBottom: 8,
  },
  transcriptText: {
    fontSize: 28,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  samplesContainer: {
    width: '100%',
    marginBottom: 30,
  },
  samplesTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#A855F7',
    marginBottom: 16,
    textAlign: 'center',
  },
  sampleCommand: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    padding: 16,
    marginBottom: 12,
    gap: 12,
  },
  sampleCommandFocused: {
    backgroundColor: 'rgba(168, 85, 247, 0.3)',
    borderColor: '#A855F7',
    transform: [{ scale: 1.05 }],
  },
  sampleIcon: {
    fontSize: 32,
  },
  sampleText: {
    fontSize: 22,
    fontWeight: '500',
    color: '#FFFFFF',
    flex: 1,
  },
  stepTitle: {
    fontSize: 52,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
    textAlign: 'center',
  },
  stepDescription: {
    fontSize: 28,
    fontWeight: '400',
    color: '#CCCCCC',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 40,
  },
  tryButton: {
    backgroundColor: '#A855F7',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    paddingVertical: 16,
    paddingHorizontal: 40,
  },
  tryButtonFocused: {
    backgroundColor: '#C084FC',
    borderColor: '#FFFFFF',
    transform: [{ scale: 1.05 }],
  },
  tryButtonText: {
    fontSize: 28,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  bottomNav: {
    position: 'absolute',
    bottom: 30,
    left: 60,
    right: 60,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 20,
  },
  skipButton: {
    flex: 1,
    backgroundColor: 'transparent',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#AAAAAA',
    paddingVertical: 14,
  },
  skipButtonFocused: {
    borderColor: '#A855F7',
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
  },
  skipButtonText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#AAAAAA',
    textAlign: 'center',
  },
  nextButton: {
    flex: 1,
    backgroundColor: '#A855F7',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    paddingVertical: 14,
  },
  nextButtonFocused: {
    backgroundColor: '#C084FC',
    borderColor: '#FFFFFF',
  },
  nextButtonText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  doneButton: {
    flex: 1,
    backgroundColor: '#A855F7',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    paddingVertical: 14,
  },
  doneButtonFocused: {
    backgroundColor: '#C084FC',
    borderColor: '#FFFFFF',
  },
  doneButtonText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
});

export default TVVoiceDemo;
