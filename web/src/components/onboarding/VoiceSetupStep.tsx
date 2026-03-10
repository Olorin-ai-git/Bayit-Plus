import React, { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { GlassCard, GlassButton } from "@bayit/shared/ui";
import { colors, spacing, borderRadius } from "@olorin/design-tokens";
import { renderIcon } from "@olorin/shared-icons/web";
import { useDirection } from "@/hooks/useDirection";
import logger from "@bayit/shared-utils/logger";

const voiceLogger = logger.scope("VoiceSetupStep");

interface VoiceSetupStepProps {
  onComplete: () => void;
  onSkip: () => void;
}

export const VoiceSetupStep: React.FC<VoiceSetupStepProps> = ({
  onComplete,
  onSkip,
}) => {
  const { t } = useTranslation();
  const { textAlign } = useDirection();
  const [micGranted, setMicGranted] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);

  const requestMicrophone = async () => {
    setIsRequesting(true);
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicGranted(true);
      onComplete();
    } catch (err) {
      voiceLogger.warn("Microphone permission denied", { err });
    } finally {
      setIsRequesting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        {renderIcon("micSignal", "xl", micGranted ? "success" : "discover")}
      </View>
      <Text style={[styles.title, { textAlign }]}>
        {t("onboarding.voice.title")}
      </Text>
      <Text style={[styles.subtitle, { textAlign }]}>
        {t("onboarding.voice.subtitle")}
      </Text>

      {micGranted ? (
        <GlassCard style={styles.successCard}>
          <Text style={styles.successText}>
            {t("onboarding.voice.granted")}
          </Text>
        </GlassCard>
      ) : (
        <View style={styles.actions}>
          <GlassButton
            title={t("onboarding.voice.enable")}
            onPress={requestMicrophone}
            variant="primary"
            size="md"
            disabled={isRequesting}
          />
          <GlassButton
            title={t("common.skip")}
            onPress={onSkip}
            variant="ghost"
            size="sm"
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
  },
  iconWrap: { marginBottom: spacing.lg },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.xl,
    maxWidth: 400,
  },
  actions: { gap: spacing.md, alignItems: "center" },
  successCard: {
    padding: spacing.md,
    backgroundColor: "rgba(34, 197, 94, 0.1)",
    borderRadius: borderRadius.md,
  },
  successText: { fontSize: 14, color: "#22c55e", fontWeight: "600" },
});
