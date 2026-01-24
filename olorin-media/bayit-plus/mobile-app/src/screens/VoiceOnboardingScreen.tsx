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

import logger from '@/utils/logger';


const moduleLogger = logger.scope('VoiceOnboardingScreen');

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
        moduleLogger.debug('Wake word detected:', detection.wakeWord);
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
          <View className="flex-1 items-center justify-center">
            <View className="mb-8">
              <Sparkles size={64} color={colors.primary} />
            </View>

            <Text className="text-3xl font-bold text-white text-center mb-6">{t('voiceOnboarding.welcome.title')}</Text>

            <Text className="text-base text-white/60 text-center leading-6 mb-8">
              {t('voiceOnboarding.welcome.description')}
            </Text>

            <View className="w-full mb-12">
              <FeatureItem icon={<Mic size={24} color={colors.primary} />} text={t('voiceOnboarding.features.voiceCommands')} />
              <FeatureItem icon={<Volume2 size={24} color={colors.primary} />} text={t('voiceOnboarding.features.tts')} />
              <FeatureItem icon={<Sparkles size={24} color={colors.primary} />} text={t('voiceOnboarding.features.wakeWord')} />
            </View>

            <Pressable className="w-full bg-[#7e22ce] rounded-xl py-6 items-center" onPress={() => setCurrentStep('permissions')}>
              <Text className="text-lg font-bold text-white">{t('voiceOnboarding.getStarted')}</Text>
            </Pressable>
          </View>
        );

      case 'permissions':
        return (
          <View className="flex-1 items-center justify-center">
            <View className="mb-8">
              <Mic size={64} color={colors.primary} />
            </View>

            <Text className="text-3xl font-bold text-white text-center mb-6">{t('voiceOnboarding.permissions.title')}</Text>

            <Text className="text-base text-white/60 text-center leading-6 mb-8">
              {t('voiceOnboarding.permissions.description')}
            </Text>

            <View className="bg-[#7e22ce]/20 rounded-xl p-6 mb-8">
              <Text className="text-sm text-white/60 leading-5">
                <Text className="font-bold text-[#7e22ce]">{t('voiceOnboarding.permissions.privacyLabel')}</Text> {t('voiceOnboarding.permissions.privacy')}
              </Text>
            </View>

            {isLoading ? (
              <ActivityIndicator size="large" color={colors.primary} className="my-8" />
            ) : (
              <Pressable className="w-full bg-[#7e22ce] rounded-xl py-6 items-center" onPress={handleRequestPermissions}>
                <Text className="text-lg font-bold text-white">{t('voiceOnboarding.grantPermissions')}</Text>
              </Pressable>
            )}
          </View>
        );

      case 'test-wake-word':
        return (
          <View className="flex-1 items-center justify-center">
            <Text className="text-3xl font-bold text-white text-center mb-6">{t('voiceOnboarding.testWakeWord.title')}</Text>

            <Text className="text-base text-white/60 text-center leading-6 mb-8">
              {t('voiceOnboarding.testWakeWord.description')}
            </Text>

            {isTestingWakeWord && <VoiceWaveform isListening={true} barCount={7} color={colors.primary} />}

            {wakeWordDetected && (
              <View className="items-center my-8">
                <Check size={48} color={colors.success} />
                <Text className="text-lg font-semibold text-green-500 mt-4">{t('voiceOnboarding.testWakeWord.success')}</Text>
              </View>
            )}

            <View className="w-full gap-4">
              {!isTestingWakeWord ? (
                <Pressable className="w-full bg-[#7e22ce] rounded-xl py-6 items-center" onPress={handleTestWakeWord}>
                  <Text className="text-lg font-bold text-white">{t('voiceOnboarding.startTest')}</Text>
                </Pressable>
              ) : (
                <Pressable className="w-full bg-white/10 rounded-xl py-6 items-center" onPress={handleSkipWakeWord}>
                  <Text className="text-lg font-bold text-white/60">{t('common.skip')}</Text>
                </Pressable>
              )}
            </View>
          </View>
        );

      case 'complete':
        return (
          <View className="flex-1 items-center justify-center">
            <View className="mb-8">
              <Check size={64} color={colors.success} />
            </View>

            <Text className="text-3xl font-bold text-white text-center mb-6">{t('voiceOnboarding.complete.title')}</Text>

            <Text className="text-base text-white/60 text-center leading-6 mb-8">
              {t('voiceOnboarding.complete.description')}
            </Text>

            <View className="w-full bg-white/5 rounded-xl p-6 mb-8">
              <Text className="text-base font-bold text-white mb-4">{t('voiceOnboarding.complete.tryCommands')}</Text>
              <Text className="text-sm text-white/60 mb-2">• {t('voiceOnboarding.complete.examples.goHome')}</Text>
              <Text className="text-sm text-white/60 mb-2">• {t('voiceOnboarding.complete.examples.playChannel')}</Text>
              <Text className="text-sm text-white/60 mb-2">• {t('voiceOnboarding.complete.examples.openWidget')}</Text>
              <Text className="text-sm text-white/60 mb-2">• {t('voiceOnboarding.complete.examples.switchLanguage')}</Text>
            </View>

            <Pressable className="w-full bg-[#7e22ce] rounded-xl py-6 items-center" onPress={handleComplete}>
              <Text className="text-lg font-bold text-white">{t('voiceOnboarding.complete.startUsing')}</Text>
            </Pressable>
          </View>
        );
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#1a1525]">
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: spacing.xl, paddingVertical: spacing.xxxl }} showsVerticalScrollIndicator={false}>
        {renderStep()}
      </ScrollView>

      {/* Step indicator */}
      <View className="flex-row justify-center items-center py-6 gap-2">
        {['welcome', 'permissions', 'test-wake-word', 'complete'].map((step, index) => (
          <View
            key={step}
            className={`h-2 rounded ${
              currentStep === step
                ? 'w-6 bg-[#7e22ce]'
                : ['welcome', 'permissions', 'test-wake-word', 'complete'].indexOf(currentStep) > index
                  ? 'w-2 bg-green-500'
                  : 'w-2 bg-white/20'
            }`}
          />
        ))}
      </View>
    </SafeAreaView>
  );
}

// Feature list item component
function FeatureItem({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <View className="flex-row items-center mb-6">
      <View className="w-10 h-10 rounded-full bg-[#7e22ce]/20 justify-center items-center mr-6">{icon}</View>
      <Text className="flex-1 text-base text-white/60 leading-[22px]">{text}</Text>
    </View>
  );
}
