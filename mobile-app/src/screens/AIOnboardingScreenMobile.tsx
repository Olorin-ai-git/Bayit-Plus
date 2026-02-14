/**
 * AIOnboardingScreenMobile - Multi-step AI features onboarding
 *
 * Steps: AI Dubbing, Smart Subtitles, TalkBack, AI Companion.
 * Skip/Next/Get Started navigation with step indicators.
 */
import React, { useCallback } from 'react';
import { View, Text, Pressable, SafeAreaView, ScrollView, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { useDirection } from '@bayit/shared-hooks';
import { GlassButton } from '@olorin/glass-ui/native';
import { GlassLoadingSpinner } from '@bayit/shared/ui';
import { NativeIcon } from '@olorin/shared-icons/native';
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens';
import { useAIOnboarding, AIOnboardingStep } from '../hooks/useAIOnboarding';
import logger from '@/utils/logger';

const moduleLogger = logger.scope('AIOnboardingScreenMobile');
const STEP_ICONS: Record<AIOnboardingStep, string> = { dubbing: 'languages', subtitles: 'subtitles', talkback: 'microphone', companion: 'sparkles' };

export const AIOnboardingScreenMobile: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const { isRTL, textAlign } = useDirection();

  const {
    currentStep,
    currentStepId,
    totalSteps,
    isLoading,
    goToNext,
    goToPrevious,
    skipOnboarding,
    completeOnboarding,
  } = useAIOnboarding();

  const isLastStep = currentStep === totalSteps - 1;
  const isFirstStep = currentStep === 0;

  const handleSkip = useCallback(async () => {
    try { await skipOnboarding(); navigation.goBack(); }
    catch (err) { moduleLogger.error('Skip onboarding failed', { error: err }); }
  }, [skipOnboarding, navigation]);

  const handleComplete = useCallback(async () => {
    try { await completeOnboarding(); navigation.goBack(); }
    catch (err) { moduleLogger.error('Complete onboarding failed', { error: err }); }
  }, [completeOnboarding, navigation]);

  const handleNext = useCallback(() => {
    if (isLastStep) { handleComplete(); } else { goToNext(); }
  }, [isLastStep, handleComplete, goToNext]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <GlassLoadingSpinner size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.topBar, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={styles.topBarSpacer} />
        <Pressable
          onPress={handleSkip}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel={t('common.skip')}
          accessibilityHint={t('aiOnboarding.skipHint')}
          accessibilityRole="button"
        >
          <Text style={styles.skipText}>{t('common.skip')}</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.iconContainer}>
          <NativeIcon
            name={STEP_ICONS[currentStepId]}
            size="2xl"
            color={colors.primary}
          />
        </View>

        <Text style={[styles.stepTitle, { textAlign }]}>
          {t(`aiOnboarding.steps.${currentStepId}.title`)}
        </Text>
        <Text style={[styles.stepDescription, { textAlign }]}>
          {t(`aiOnboarding.steps.${currentStepId}.description`)}
        </Text>

        <View style={styles.featureList}>
          {([1, 2, 3] as const).map((featureNum) => {
            const featureKey = `aiOnboarding.steps.${currentStepId}.features.${featureNum}`;
            return (
              <View
                key={featureNum}
                style={[styles.featureRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
              >
                <View style={styles.featureBullet}>
                  <NativeIcon name="checkCircle" size="sm" color={colors.primary} />
                </View>
                <Text style={[styles.featureText, { textAlign }]}>
                  {t(featureKey)}
                </Text>
              </View>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.bottomSection}>
        <View style={styles.dotsRow}>
          {Array.from({ length: totalSteps }).map((_, idx) => (
            <View
              key={idx}
              style={[
                styles.dot,
                idx === currentStep && styles.dotActive,
                idx < currentStep && styles.dotCompleted,
              ]}
            />
          ))}
        </View>

        <View style={[styles.buttonRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          {!isFirstStep && (
            <GlassButton
              variant="secondary"
              onPress={goToPrevious}
              style={styles.backButton}
              accessibilityLabel={t('common.back')}
              accessibilityRole="button"
            >
              {t('common.back')}
            </GlassButton>
          )}
          <GlassButton
            variant="primary"
            onPress={handleNext}
            style={styles.nextButton}
            accessibilityLabel={isLastStep ? t('aiOnboarding.getStarted') : t('common.next')}
            accessibilityRole="button"
          >
            {isLastStep ? t('aiOnboarding.getStarted') : t('common.next')}
          </GlassButton>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  topBar: { justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  topBarSpacer: { width: spacing.xxl },
  skipText: { fontSize: fontSize.md, color: colors.textMuted, fontWeight: '500' },
  scrollContent: { flexGrow: 1, paddingHorizontal: spacing.xl, justifyContent: 'center' },
  iconContainer: {
    width: 80, height: 80, borderRadius: borderRadius.full, backgroundColor: colors.glassMedium,
    justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginBottom: spacing.xl,
  },
  stepTitle: { fontSize: fontSize.xxl, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  stepDescription: { fontSize: fontSize.md, color: colors.textSecondary, lineHeight: fontSize.md * 1.6, marginBottom: spacing.xl },
  featureList: { gap: spacing.md },
  featureRow: { alignItems: 'flex-start', gap: spacing.sm },
  featureBullet: { marginTop: 2 },
  featureText: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: fontSize.sm * 1.5, flex: 1 },
  bottomSection: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl },
  dotsRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing.xs, marginBottom: spacing.lg },
  dot: { width: 8, height: 8, borderRadius: borderRadius.full, backgroundColor: colors.textMuted, opacity: 0.3 },
  dotActive: { backgroundColor: colors.primary, opacity: 1, width: 24 },
  dotCompleted: { backgroundColor: colors.primary, opacity: 0.6 },
  buttonRow: { gap: spacing.sm },
  backButton: { flex: 1 },
  nextButton: { flex: 2 },
});

export default AIOnboardingScreenMobile;
