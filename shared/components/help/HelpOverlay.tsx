/**
 * HelpOverlay - First-time user guide overlay
 * Highlights UI elements and provides step-by-step onboarding
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDirection } from '../../hooks/useDirection';
import { isTV } from '../../utils/platform';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface HighlightArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface OverlayStep {
  /** i18n key for step title */
  titleKey: string;
  /** i18n key for step description */
  descriptionKey: string;
  /** Area to highlight on screen */
  highlightArea?: HighlightArea;
  /** Position of the tooltip relative to highlight */
  tooltipPosition?: 'top' | 'bottom' | 'left' | 'right';
}

interface HelpOverlayProps {
  /** Whether the overlay is visible */
  visible: boolean;
  /** Steps to guide through */
  steps: OverlayStep[];
  /** Callback when overlay is dismissed */
  onComplete: () => void;
  /** Callback when user skips the tutorial */
  onSkip?: () => void;
  /** Whether to show skip button */
  showSkip?: boolean;
}

export const HelpOverlay: React.FC<HelpOverlayProps> = ({
  visible,
  steps,
  onComplete,
  onSkip,
  showSkip = true,
}) => {
  const { t } = useTranslation();
  const { isRTL, textAlign, flexDirection } = useDirection();

  const [currentStep, setCurrentStep] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const currentStepData = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  useEffect(() => {
    if (visible) {
      setCurrentStep(0);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // Pulse animation for highlight
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [visible, fadeAnim, pulseAnim]);

  const handleNext = useCallback(() => {
    if (isLastStep) {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        onComplete();
      });
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  }, [isLastStep, fadeAnim, onComplete]);

  const handlePrevious = useCallback(() => {
    if (!isFirstStep) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [isFirstStep]);

  const handleSkip = useCallback(() => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      onSkip?.();
      onComplete();
    });
  }, [fadeAnim, onSkip, onComplete]);

  const getTooltipStyle = () => {
    if (!currentStepData?.highlightArea) {
      return {
        position: 'absolute' as const,
        bottom: SCREEN_HEIGHT * 0.2,
        left: 16,
        right: 16,
      };
    }

    const { highlightArea, tooltipPosition = 'bottom' } = currentStepData;
    const tooltipMargin = 16;

    switch (tooltipPosition) {
      case 'top':
        return {
          position: 'absolute' as const,
          bottom: SCREEN_HEIGHT - highlightArea.y + tooltipMargin,
          left: 16,
          right: 16,
        };
      case 'bottom':
        return {
          position: 'absolute' as const,
          top: highlightArea.y + highlightArea.height + tooltipMargin,
          left: 16,
          right: 16,
        };
      case 'left':
        return {
          position: 'absolute' as const,
          top: highlightArea.y,
          right: SCREEN_WIDTH - highlightArea.x + tooltipMargin,
          maxWidth: SCREEN_WIDTH * 0.4,
        };
      case 'right':
        return {
          position: 'absolute' as const,
          top: highlightArea.y,
          left: highlightArea.x + highlightArea.width + tooltipMargin,
          maxWidth: SCREEN_WIDTH * 0.4,
        };
      default:
        return {
          position: 'absolute' as const,
          bottom: SCREEN_HEIGHT * 0.2,
          left: 16,
          right: 16,
        };
    }
  };

  if (!visible || steps.length === 0) {
    return null;
  }

  return (
    <Modal visible={visible} transparent animationType="none">
      <Animated.View className="flex-1 bg-black/85" style={{ opacity: fadeAnim }}>
        {/* Highlight Cutout */}
        {currentStepData?.highlightArea && (
          <Animated.View
            className="absolute rounded-lg border-2 border-purple-500 bg-transparent shadow-purple-500/50"
            style={{
              top: currentStepData.highlightArea.y - 8,
              left: currentStepData.highlightArea.x - 8,
              width: currentStepData.highlightArea.width + 16,
              height: currentStepData.highlightArea.height + 16,
              transform: [{ scale: pulseAnim }],
              shadowColor: '#a855f7',
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.5,
              shadowRadius: 20,
            }}
          />
        )}

        {/* Tooltip */}
        <View className="bg-[rgba(30,30,40,0.98)] rounded-2xl p-6 border border-white/10" style={getTooltipStyle()}>
          {/* Step Indicator */}
          <View className="flex-row justify-center gap-2 mb-4">
            {steps.map((_, index) => (
              <View
                key={index}
                className={`h-2 rounded ${
                  index === currentStep
                    ? 'w-6 bg-purple-500'
                    : 'w-2 bg-white/30'
                }`}
              />
            ))}
          </View>

          {/* Content */}
          <Text className={`text-white font-bold mb-2 ${isTV ? 'text-2xl' : 'text-xl'}`} style={{ textAlign }}>
            {t(currentStepData.titleKey)}
          </Text>
          <Text className={`text-white/70 mb-6 ${isTV ? 'text-base leading-[26px]' : 'text-sm leading-[22px]'}`} style={{ textAlign }}>
            {t(currentStepData.descriptionKey)}
          </Text>

          {/* Navigation */}
          <View className="items-center gap-3" style={{ flexDirection }}>
            {!isFirstStep && (
              <TouchableOpacity
                className={`px-6 bg-white/10 rounded-lg ${isTV ? 'py-3' : 'py-2'}`}
                onPress={handlePrevious}
              >
                <Text className={`text-white/70 font-semibold ${isTV ? 'text-base' : 'text-sm'}`}>
                  {t('help.previous', 'Previous')}
                </Text>
              </TouchableOpacity>
            )}
            <View className="flex-1" />
            <TouchableOpacity
              className={`px-6 bg-purple-500 rounded-lg ${isTV ? 'py-3' : 'py-2'}`}
              onPress={handleNext}
            >
              <Text className={`text-white font-semibold ${isTV ? 'text-base' : 'text-sm'}`}>
                {isLastStep
                  ? t('help.getStarted', 'Get Started')
                  : t('help.next', 'Next')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Skip Button */}
          {showSkip && !isLastStep && (
            <TouchableOpacity className="self-center mt-4 p-2" onPress={handleSkip}>
              <Text className={`text-white/70 underline ${isTV ? 'text-sm' : 'text-xs'}`}>
                {t('help.skipTutorial', 'Skip tutorial')}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>
    </Modal>
  );
};

export default HelpOverlay;
