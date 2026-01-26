/**
 * TV Voice Permissions Screen Component
 * Multi-step permission request flow with visual instructions
 * Handles microphone and speech recognition permissions
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Animated,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import LinearGradient from 'react-native-linear-gradient';
import { TVVoicePermissionsSteps } from './TVVoicePermissionsSteps';
import { TVVoicePermissionsButtons } from './TVVoicePermissionsButtons';

type PermissionStep = 'intro' | 'microphone' | 'speech' | 'complete';

interface TVVoicePermissionsScreenProps {
  onComplete?: () => void;
  onCancel?: () => void;
  onPermissionRequest?: (type: 'microphone' | 'speech') => Promise<boolean>;
}

export const TVVoicePermissionsScreen: React.FC<
  TVVoicePermissionsScreenProps
> = ({ onComplete, onCancel, onPermissionRequest }) => {
  const { t } = useTranslation();
  const [step, setStep] = useState<PermissionStep>('intro');
  const [focusedButton, setFocusedButton] = useState<string | null>(null);
  const [isRequesting, setIsRequesting] = useState(false);
  const fadeAnim = React.useRef(new Animated.Value(1)).current;

  const handleNextStep = async () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();

    setTimeout(() => {
      const steps: PermissionStep[] = ['intro', 'microphone', 'speech', 'complete'];
      const currentIndex = steps.indexOf(step);
      if (currentIndex < steps.length - 1) {
        setStep(steps[currentIndex + 1]);
      }

      fadeAnim.setValue(1);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }, 200);
  };

  const handleRequestPermission = async (type: 'microphone' | 'speech') => {
    setIsRequesting(true);
    const result = await onPermissionRequest?.(type);
    setIsRequesting(false);
    if (result) {
      await handleNextStep();
    }
  };

  const STEPS: PermissionStep[] = ['intro', 'microphone', 'speech', 'complete'];
  const currentStepIndex = STEPS.indexOf(step);

  return (
    <LinearGradient
      colors={['#111827', '#1F2937']}
      style={styles.container}
    >
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.contentContainer}>
          <Animated.View style={{ opacity: fadeAnim }}>
            <TVVoicePermissionsSteps step={step} />
          </Animated.View>

          <View style={styles.buttonContainer}>
            <TVVoicePermissionsButtons
              step={step}
              focusedButton={focusedButton}
              isRequesting={isRequesting}
              onFocus={setFocusedButton}
              onBlur={() => setFocusedButton(null)}
              onNextStep={handleNextStep}
              onRequestPermission={handleRequestPermission}
              onComplete={onComplete}
              onCancel={onCancel}
            />
          </View>

          {/* Progress indicator */}
          <View style={styles.progressContainer}>
            {STEPS.map((s, index) => (
              <View
                key={s}
                style={[
                  styles.progressDot,
                  {
                    backgroundColor:
                      index <= currentStepIndex ? '#A855F7' : '#4B5563',
                  },
                ]}
              />
            ))}
          </View>
        </View>
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 60,
    paddingVertical: 60,
    alignItems: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 20,
    justifyContent: 'center',
    marginBottom: 40,
  },
  progressContainer: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
  },
  progressDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
});

export default TVVoicePermissionsScreen;
