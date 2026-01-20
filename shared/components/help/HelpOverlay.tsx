/**
 * HelpOverlay - First-time user guide overlay
 * Highlights UI elements and provides step-by-step onboarding
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius } from '../../theme';
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
        left: spacing.lg,
        right: spacing.lg,
      };
    }

    const { highlightArea, tooltipPosition = 'bottom' } = currentStepData;
    const tooltipMargin = spacing.lg;

    switch (tooltipPosition) {
      case 'top':
        return {
          position: 'absolute' as const,
          bottom: SCREEN_HEIGHT - highlightArea.y + tooltipMargin,
          left: spacing.lg,
          right: spacing.lg,
        };
      case 'bottom':
        return {
          position: 'absolute' as const,
          top: highlightArea.y + highlightArea.height + tooltipMargin,
          left: spacing.lg,
          right: spacing.lg,
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
          left: spacing.lg,
          right: spacing.lg,
        };
    }
  };

  if (!visible || steps.length === 0) {
    return null;
  }

  return (
    <Modal visible={visible} transparent animationType="none">
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        {/* Highlight Cutout */}
        {currentStepData?.highlightArea && (
          <Animated.View
            style={[
              styles.highlightCutout,
              {
                top: currentStepData.highlightArea.y - 8,
                left: currentStepData.highlightArea.x - 8,
                width: currentStepData.highlightArea.width + 16,
                height: currentStepData.highlightArea.height + 16,
                transform: [{ scale: pulseAnim }],
              },
            ]}
          />
        )}

        {/* Tooltip */}
        <View style={[styles.tooltipContainer, getTooltipStyle()]}>
          {/* Step Indicator */}
          <View style={styles.stepIndicator}>
            {steps.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.stepDot,
                  index === currentStep && styles.stepDotActive,
                ]}
              />
            ))}
          </View>

          {/* Content */}
          <Text style={[styles.tooltipTitle, { textAlign }]}>
            {t(currentStepData.titleKey)}
          </Text>
          <Text style={[styles.tooltipDescription, { textAlign }]}>
            {t(currentStepData.descriptionKey)}
          </Text>

          {/* Navigation */}
          <View style={[styles.navigation, { flexDirection }]}>
            {!isFirstStep && (
              <TouchableOpacity
                style={styles.navButtonSecondary}
                onPress={handlePrevious}
              >
                <Text style={styles.navButtonSecondaryText}>
                  {t('help.previous', 'Previous')}
                </Text>
              </TouchableOpacity>
            )}
            <View style={styles.navSpacer} />
            <TouchableOpacity
              style={styles.navButtonPrimary}
              onPress={handleNext}
            >
              <Text style={styles.navButtonPrimaryText}>
                {isLastStep
                  ? t('help.getStarted', 'Get Started')
                  : t('help.next', 'Next')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Skip Button */}
          {showSkip && !isLastStep && (
            <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
              <Text style={styles.skipButtonText}>
                {t('help.skipTutorial', 'Skip tutorial')}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
  },
  highlightCutout: {
    position: 'absolute',
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: 'transparent',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  tooltipContainer: {
    backgroundColor: 'rgba(30, 30, 40, 0.98)',
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  stepDotActive: {
    backgroundColor: colors.primary,
    width: 24,
  },
  tooltipTitle: {
    fontSize: isTV ? 24 : 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  tooltipDescription: {
    fontSize: isTV ? 16 : 14,
    color: colors.textSecondary,
    lineHeight: isTV ? 26 : 22,
    marginBottom: spacing.xl,
  },
  navigation: {
    alignItems: 'center',
    gap: spacing.md,
  },
  navSpacer: {
    flex: 1,
  },
  navButtonPrimary: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
  },
  navButtonPrimaryText: {
    fontSize: isTV ? 16 : 14,
    fontWeight: '600',
    color: colors.text,
  },
  navButtonSecondary: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: borderRadius.lg,
  },
  navButtonSecondaryText: {
    fontSize: isTV ? 16 : 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  skipButton: {
    alignSelf: 'center',
    marginTop: spacing.lg,
    padding: spacing.sm,
  },
  skipButtonText: {
    fontSize: isTV ? 14 : 12,
    color: colors.textSecondary,
    textDecorationLine: 'underline',
  },
});

export default HelpOverlay;
