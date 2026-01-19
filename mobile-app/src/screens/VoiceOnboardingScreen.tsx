/**
 * VoiceOnboarding Screen
 * First-time setup wizard for voice features
 *
 * Features:
 * - Explain voice functionality
 * - Request microphone + speech permissions
 * - Test wake word detection
 * - Configure voice preferences
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mic, Volume2, Sparkles, Check } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { speechService, wakeWordService, ttsService } from '../services';
import { VoiceWaveform } from '../components/voice';
import { colors, spacing } from '../theme';

type OnboardingStep = 'welcome' | 'permissions' | 'test-wake-word' | 'complete';

export default function VoiceOnboardingScreen() {
  const navigation = useNavigation();
  const { t } = useTranslation();

  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome');
  const [hasPermissions, setHasPermissions] = useState(false);
  const [isTestingWakeWord, setIsTestingWakeWord] = useState(false);
  const [wakeWordDetected, setWakeWordDetected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Handle permission request
  const handleRequestPermissions = useCallback(async () => {
    setIsLoading(true);

    try {
      const result = await speechService.requestPermissions();

      if (result.granted) {
        setHasPermissions(true);
        setCurrentStep('test-wake-word');

        // Speak welcome message
        await ttsService.speak(t('voiceOnboarding.permissionsGranted'));
      } else {
        Alert.alert(
          t('voiceOnboarding.permissionRequired.title'),
          t('voiceOnboarding.permissionRequired.message'),
          [{ text: t('common.ok') }]
        );
      }
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message || t('voiceOnboarding.permissionError'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Test wake word detection
  const handleTestWakeWord = useCallback(async () => {
    setIsTestingWakeWord(true);
    setWakeWordDetected(false);

    try {
      // Add detection listener
      wakeWordService.addDetectionListener((detection) => {
        console.log('Wake word detected:', detection.wakeWord);
        setWakeWordDetected(true);
        setIsTestingWakeWord(false);

        // Stop listening
        wakeWordService.stopListening();

        // Speak confirmation
        ttsService.speak(t('voiceOnboarding.wakeWordSuccess'));

        // Move to complete step
        setTimeout(() => {
          setCurrentStep('complete');
        }, 2000);
      });

      // Start wake word detection
      await wakeWordService.startListening();

      // Speak instructions
      await ttsService.speak(t('voiceOnboarding.speakWakeWord'));
    } catch (error: any) {
      Alert.alert(t('common.error'), t('voiceOnboarding.wakeWordError', { error: error.message }));
      setIsTestingWakeWord(false);
    }
  }, []);

  // Skip wake word test
  const handleSkipWakeWord = useCallback(async () => {
    if (isTestingWakeWord) {
      await wakeWordService.stopListening();
      setIsTestingWakeWord(false);
    }
    setCurrentStep('complete');
  }, [isTestingWakeWord]);

  // Complete onboarding
  const handleComplete = useCallback(() => {
    // Navigate back to main app
    navigation.goBack();
  }, [navigation]);

  // Render current step
  const renderStep = () => {
    switch (currentStep) {
      case 'welcome':
        return (
          <View style={styles.stepContainer}>
            <View style={styles.iconContainer}>
              <Sparkles size={64} color={colors.primary} />
            </View>

            <Text style={styles.title}>{t('voiceOnboarding.welcome.title')}</Text>

            <Text style={styles.description}>
              {t('voiceOnboarding.welcome.description')}
            </Text>

            <View style={styles.featureList}>
              <FeatureItem icon={<Mic size={24} color={colors.primary} />} text={t('voiceOnboarding.features.voiceCommands')} />
              <FeatureItem icon={<Volume2 size={24} color={colors.primary} />} text={t('voiceOnboarding.features.tts')} />
              <FeatureItem icon={<Sparkles size={24} color={colors.primary} />} text={t('voiceOnboarding.features.wakeWord')} />
            </View>

            <Pressable style={styles.primaryButton} onPress={() => setCurrentStep('permissions')}>
              <Text style={styles.primaryButtonText}>{t('voiceOnboarding.getStarted')}</Text>
            </Pressable>
          </View>
        );

      case 'permissions':
        return (
          <View style={styles.stepContainer}>
            <View style={styles.iconContainer}>
              <Mic size={64} color={colors.primary} />
            </View>

            <Text style={styles.title}>{t('voiceOnboarding.permissions.title')}</Text>

            <Text style={styles.description}>
              {t('voiceOnboarding.permissions.description')}
            </Text>

            <View style={styles.permissionInfo}>
              <Text style={styles.permissionText}>
                <Text style={styles.permissionLabel}>{t('voiceOnboarding.permissions.privacyLabel')}</Text> {t('voiceOnboarding.permissions.privacy')}
              </Text>
            </View>

            {isLoading ? (
              <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
            ) : (
              <Pressable style={styles.primaryButton} onPress={handleRequestPermissions}>
                <Text style={styles.primaryButtonText}>{t('voiceOnboarding.grantPermissions')}</Text>
              </Pressable>
            )}
          </View>
        );

      case 'test-wake-word':
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.title}>{t('voiceOnboarding.testWakeWord.title')}</Text>

            <Text style={styles.description}>
              {t('voiceOnboarding.testWakeWord.description')}
            </Text>

            {isTestingWakeWord && <VoiceWaveform isListening={true} barCount={7} color={colors.primary} />}

            {wakeWordDetected && (
              <View style={styles.successContainer}>
                <Check size={48} color={colors.success} />
                <Text style={styles.successText}>{t('voiceOnboarding.testWakeWord.success')}</Text>
              </View>
            )}

            <View style={styles.buttonGroup}>
              {!isTestingWakeWord ? (
                <Pressable style={styles.primaryButton} onPress={handleTestWakeWord}>
                  <Text style={styles.primaryButtonText}>{t('voiceOnboarding.startTest')}</Text>
                </Pressable>
              ) : (
                <Pressable style={styles.secondaryButton} onPress={handleSkipWakeWord}>
                  <Text style={styles.secondaryButtonText}>{t('common.skip')}</Text>
                </Pressable>
              )}
            </View>
          </View>
        );

      case 'complete':
        return (
          <View style={styles.stepContainer}>
            <View style={styles.iconContainer}>
              <Check size={64} color={colors.success} />
            </View>

            <Text style={styles.title}>{t('voiceOnboarding.complete.title')}</Text>

            <Text style={styles.description}>
              {t('voiceOnboarding.complete.description')}
            </Text>

            <View style={styles.exampleCommands}>
              <Text style={styles.exampleTitle}>{t('voiceOnboarding.complete.tryCommands')}</Text>
              <Text style={styles.exampleCommand}>• {t('voiceOnboarding.complete.examples.goHome')}</Text>
              <Text style={styles.exampleCommand}>• {t('voiceOnboarding.complete.examples.playChannel')}</Text>
              <Text style={styles.exampleCommand}>• {t('voiceOnboarding.complete.examples.openWidget')}</Text>
              <Text style={styles.exampleCommand}>• {t('voiceOnboarding.complete.examples.switchLanguage')}</Text>
            </View>

            <Pressable style={styles.primaryButton} onPress={handleComplete}>
              <Text style={styles.primaryButtonText}>{t('voiceOnboarding.complete.startUsing')}</Text>
            </Pressable>
          </View>
        );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {renderStep()}
      </ScrollView>

      {/* Step indicator */}
      <View style={styles.stepIndicator}>
        {['welcome', 'permissions', 'test-wake-word', 'complete'].map((step, index) => (
          <View
            key={step}
            style={[
              styles.stepDot,
              currentStep === step && styles.stepDotActive,
              ['welcome', 'permissions', 'test-wake-word', 'complete'].indexOf(currentStep) > index &&
                styles.stepDotCompleted,
            ]}
          />
        ))}
      </View>
    </SafeAreaView>
  );
}

// Feature list item component
function FeatureItem({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <View style={styles.featureItem}>
      <View style={styles.featureIcon}>{icon}</View>
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxxl,
  },
  stepContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginBottom: spacing.xxl,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  description: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.xxl,
  },
  featureList: {
    width: '100%',
    marginBottom: spacing.xxxl,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${colors.primary}20`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.lg,
  },
  featureText: {
    flex: 1,
    fontSize: 16,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  permissionInfo: {
    backgroundColor: `${colors.primary}20`,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.xxl,
  },
  permissionText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  permissionLabel: {
    fontWeight: '700',
    color: colors.primary,
  },
  loader: {
    marginVertical: spacing.xxl,
  },
  successContainer: {
    alignItems: 'center',
    marginVertical: spacing.xxl,
  },
  successText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.success,
    marginTop: spacing.md,
  },
  exampleCommands: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.xxl,
  },
  exampleTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
  },
  exampleCommand: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  buttonGroup: {
    width: '100%',
    gap: spacing.md,
  },
  primaryButton: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  secondaryButton: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  stepDotActive: {
    width: 24,
    backgroundColor: colors.primary,
  },
  stepDotCompleted: {
    backgroundColor: colors.success,
  },
});
