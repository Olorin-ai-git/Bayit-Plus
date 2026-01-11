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
import { speechService, wakeWordService, ttsService } from '../services';
import { VoiceWaveform } from '../components/voice';

type OnboardingStep = 'welcome' | 'permissions' | 'test-wake-word' | 'complete';

export default function VoiceOnboardingScreen() {
  const navigation = useNavigation();

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
        await ttsService.speak('Permissions granted! Let\'s test the wake word detection.');
      } else {
        Alert.alert(
          'Permission Required',
          'Voice commands require microphone and speech recognition permissions. Please enable them in Settings.',
          [{ text: 'OK' }]
        );
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to request permissions');
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
        ttsService.speak('Great! Wake word detected. You\'re all set!');

        // Move to complete step
        setTimeout(() => {
          setCurrentStep('complete');
        }, 2000);
      });

      // Start wake word detection
      await wakeWordService.startListening();

      // Speak instructions
      await ttsService.speak('Say "Hey Bayit" or "Bayit Plus" to test wake word detection.');
    } catch (error: any) {
      Alert.alert('Error', 'Failed to start wake word detection: ' + error.message);
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
              <Sparkles size={64} color="#00aaff" />
            </View>

            <Text style={styles.title}>Welcome to Voice Control</Text>

            <Text style={styles.description}>
              Control Bayit+ with your voice! Navigate, play content, and manage widgets hands-free.
            </Text>

            <View style={styles.featureList}>
              <FeatureItem icon={<Mic size={24} color="#00aaff" />} text="Voice commands in Hebrew, English, and Spanish" />
              <FeatureItem icon={<Volume2 size={24} color="#00aaff" />} text="Natural text-to-speech responses" />
              <FeatureItem icon={<Sparkles size={24} color="#00aaff" />} text="Wake word detection: 'Hey Bayit'" />
            </View>

            <Pressable style={styles.primaryButton} onPress={() => setCurrentStep('permissions')}>
              <Text style={styles.primaryButtonText}>Get Started</Text>
            </Pressable>
          </View>
        );

      case 'permissions':
        return (
          <View style={styles.stepContainer}>
            <View style={styles.iconContainer}>
              <Mic size={64} color="#00aaff" />
            </View>

            <Text style={styles.title}>Enable Voice Access</Text>

            <Text style={styles.description}>
              Bayit+ needs access to your microphone and speech recognition to understand your voice commands.
            </Text>

            <View style={styles.permissionInfo}>
              <Text style={styles.permissionText}>
                <Text style={styles.permissionLabel}>Privacy:</Text> All voice processing happens on your device.
                Your voice data is never sent to the cloud.
              </Text>
            </View>

            {isLoading ? (
              <ActivityIndicator size="large" color="#00aaff" style={styles.loader} />
            ) : (
              <Pressable style={styles.primaryButton} onPress={handleRequestPermissions}>
                <Text style={styles.primaryButtonText}>Grant Permissions</Text>
              </Pressable>
            )}
          </View>
        );

      case 'test-wake-word':
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.title}>Test Wake Word</Text>

            <Text style={styles.description}>
              Try saying "Hey Bayit" or "Bayit Plus" to activate voice commands.
            </Text>

            {isTestingWakeWord && <VoiceWaveform isListening={true} barCount={7} color="#00aaff" />}

            {wakeWordDetected && (
              <View style={styles.successContainer}>
                <Check size={48} color="#00ff88" />
                <Text style={styles.successText}>Wake word detected!</Text>
              </View>
            )}

            <View style={styles.buttonGroup}>
              {!isTestingWakeWord ? (
                <Pressable style={styles.primaryButton} onPress={handleTestWakeWord}>
                  <Text style={styles.primaryButtonText}>Start Test</Text>
                </Pressable>
              ) : (
                <Pressable style={styles.secondaryButton} onPress={handleSkipWakeWord}>
                  <Text style={styles.secondaryButtonText}>Skip</Text>
                </Pressable>
              )}
            </View>
          </View>
        );

      case 'complete':
        return (
          <View style={styles.stepContainer}>
            <View style={styles.iconContainer}>
              <Check size={64} color="#00ff88" />
            </View>

            <Text style={styles.title}>You're All Set!</Text>

            <Text style={styles.description}>
              Voice control is now enabled. Tap the voice button or say "Hey Bayit" to start using voice commands.
            </Text>

            <View style={styles.exampleCommands}>
              <Text style={styles.exampleTitle}>Try these commands:</Text>
              <Text style={styles.exampleCommand}>• "Go to home"</Text>
              <Text style={styles.exampleCommand}>• "Play Channel 13"</Text>
              <Text style={styles.exampleCommand}>• "Open podcast widget"</Text>
              <Text style={styles.exampleCommand}>• "Switch to Hebrew"</Text>
            </View>

            <Pressable style={styles.primaryButton} onPress={handleComplete}>
              <Text style={styles.primaryButtonText}>Start Using Voice</Text>
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
    backgroundColor: '#0d0d1a',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  stepContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  featureList: {
    width: '100%',
    marginBottom: 40,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 170, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  featureText: {
    flex: 1,
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 22,
  },
  permissionInfo: {
    backgroundColor: 'rgba(0, 170, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 32,
  },
  permissionText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 20,
  },
  permissionLabel: {
    fontWeight: '700',
    color: '#00aaff',
  },
  loader: {
    marginVertical: 32,
  },
  successContainer: {
    alignItems: 'center',
    marginVertical: 32,
  },
  successText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#00ff88',
    marginTop: 12,
  },
  exampleCommands: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 20,
    marginBottom: 32,
  },
  exampleTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
  },
  exampleCommand: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 8,
  },
  buttonGroup: {
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    width: '100%',
    backgroundColor: '#00aaff',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  secondaryButton: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  stepDotActive: {
    width: 24,
    backgroundColor: '#00aaff',
  },
  stepDotCompleted: {
    backgroundColor: '#00ff88',
  },
});
