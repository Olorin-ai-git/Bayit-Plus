/**
 * VoiceDecision - Voice-activated decision tree for interactive stories
 *
 * Displays decision options with voice keywords and a mic button
 * for voice input. Highlights active listening state.
 */
import React, { useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@bayit/shared-hooks';
import { GlassCard } from '@olorin/glass-ui/native';
import { NativeIcon } from '@olorin/shared-icons/native';
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens';
import logger from '@/utils/logger';

const moduleLogger = logger.scope('VoiceDecision');

interface Decision {
  id: string;
  text: string;
  voiceKeyword: string;
}

interface VoiceDecisionProps {
  decisions: Decision[];
  onDecision: (decision: Decision) => void;
  isListening: boolean;
}

export const VoiceDecision: React.FC<VoiceDecisionProps> = ({
  decisions,
  onDecision,
  isListening,
}) => {
  const { t } = useTranslation();
  const { isRTL, textAlign } = useDirection();

  const handleDecisionPress = useCallback(
    (decision: Decision) => {
      moduleLogger.debug('Decision selected manually', { decisionId: decision.id });
      onDecision(decision);
    },
    [onDecision],
  );

  return (
    <View
      style={styles.container}
      accessibilityLabel={t('missions.voiceDecision.sectionLabel')}
      accessibilityRole="radiogroup"
    >
      <Text style={[styles.promptText, { textAlign }]}>
        {t('missions.voiceDecision.prompt')}
      </Text>

      {isListening && (
        <View style={styles.listeningIndicator}>
          <View style={styles.listeningPulse} />
          <NativeIcon name="microphone" size="lg" color={colors.error} />
          <Text style={styles.listeningText}>
            {t('missions.voiceDecision.listening')}
          </Text>
        </View>
      )}

      <View style={styles.decisionsContainer}>
        {decisions.map((decision) => (
          <Pressable
            key={decision.id}
            onPress={() => handleDecisionPress(decision)}
            accessibilityLabel={decision.text}
            accessibilityHint={t('missions.voiceDecision.decisionHint', {
              keyword: decision.voiceKeyword,
            })}
            accessibilityRole="radio"
          >
            <GlassCard style={styles.decisionCard}>
              <View
                style={[
                  styles.decisionContent,
                  { flexDirection: isRTL ? 'row-reverse' : 'row' },
                ]}
              >
                <View style={styles.decisionTextContainer}>
                  <Text style={[styles.decisionText, { textAlign }]}>
                    {decision.text}
                  </Text>
                  <View
                    style={[
                      styles.keywordRow,
                      { flexDirection: isRTL ? 'row-reverse' : 'row' },
                    ]}
                  >
                    <NativeIcon name="microphone" size="xs" color={colors.primary} />
                    <Text style={styles.keywordText}>
                      {t('missions.voiceDecision.say', {
                        keyword: decision.voiceKeyword,
                      })}
                    </Text>
                  </View>
                </View>
                <View style={styles.decisionArrow}>
                  <NativeIcon
                    name={isRTL ? 'chevronLeft' : 'chevronRight'}
                    size="sm"
                    color={colors.textMuted}
                  />
                </View>
              </View>
            </GlassCard>
          </Pressable>
        ))}
      </View>

      {!isListening && (
        <Text style={[styles.hintText, { textAlign }]}>
          {t('missions.voiceDecision.tapOrSpeak')}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
  },
  promptText: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.lg,
  },
  listeningIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
    paddingVertical: spacing.sm,
  },
  listeningPulse: {
    width: 12,
    height: 12,
    borderRadius: borderRadius.full,
    backgroundColor: colors.error,
    opacity: 0.6,
  },
  listeningText: {
    fontSize: fontSize.sm,
    color: colors.error,
    fontWeight: '600',
  },
  decisionsContainer: {
    gap: spacing.sm,
  },
  decisionCard: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  decisionContent: {
    alignItems: 'center',
    gap: spacing.md,
  },
  decisionTextContainer: {
    flex: 1,
    gap: spacing.xs,
  },
  decisionText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  keywordRow: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  keywordText: {
    fontSize: fontSize.xs,
    color: colors.primary,
    fontWeight: '500',
  },
  decisionArrow: {
    opacity: 0.5,
  },
  hintText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.md,
  },
});
