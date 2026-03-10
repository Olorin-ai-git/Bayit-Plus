import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { GlassCard, GlassButton } from "@bayit/shared/ui";
import { colors, spacing } from "@olorin/design-tokens";
import { renderIcon } from "@olorin/shared-icons/web";
import { useDirection } from "@/hooks/useDirection";

interface WelcomeStepProps {
  onGetStarted: () => void;
}

const HIGHLIGHTS = [
  { iconName: "waveformMic", labelKey: "onboarding.highlight.dubbing" },
  { iconName: "captionsBubble", labelKey: "onboarding.highlight.subtitles" },
  { iconName: "brain", labelKey: "onboarding.highlight.ai" },
  { iconName: "bookClosed", labelKey: "onboarding.highlight.learning" },
];

export const WelcomeStep: React.FC<WelcomeStepProps> = ({ onGetStarted }) => {
  const { t } = useTranslation();
  const { textAlign } = useDirection();

  return (
    <View style={styles.container}>
      <View style={styles.logoWrap}>
        {renderIcon("bayitPlus", "xl", "primary")}
      </View>
      <Text style={[styles.title, { textAlign }]}>
        {t("onboarding.welcome.title")}
      </Text>
      <Text style={[styles.subtitle, { textAlign }]}>
        {t("onboarding.welcome.subtitle")}
      </Text>

      <View style={styles.highlights}>
        {HIGHLIGHTS.map((h) => (
          <GlassCard key={h.iconName} style={styles.highlightCard}>
            {renderIcon(h.iconName, "md", "discover")}
            <Text style={styles.highlightLabel}>{t(h.labelKey)}</Text>
          </GlassCard>
        ))}
      </View>

      <GlassButton
        title={t("onboarding.welcome.getStarted")}
        onPress={onGetStarted}
        variant="primary"
        size="lg"
      />
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
  logoWrap: { marginBottom: spacing.lg },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  highlights: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  highlightCard: {
    padding: spacing.md,
    alignItems: "center",
    width: 140,
    gap: spacing.xs,
  },
  highlightLabel: { fontSize: 12, color: colors.text, textAlign: "center" },
});
