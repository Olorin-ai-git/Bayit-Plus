import { View, Text, StyleSheet, Pressable } from "react-native";
import { useTranslation } from "react-i18next";
import { GlassCard, GlassButton } from "@bayit/shared/ui";
import { Sparkles, X } from "lucide-react";
import { colors, spacing, fontSize, borderRadius } from "@olorin/design-tokens";

interface AIGatewayCardProps {
  onConnectYouTube: () => void;
  onLearnMore: () => void;
  onDismiss: () => void;
  showDontShowAgain: boolean;
  onDontShowAgain: () => void;
}

export function AIGatewayCard({
  onConnectYouTube,
  onLearnMore,
  onDismiss,
  showDontShowAgain,
  onDontShowAgain,
}: AIGatewayCardProps) {
  const { t } = useTranslation();

  return (
    <GlassCard style={styles.container}>
      <Pressable style={styles.dismissButton} onPress={onDismiss}>
        <X size={16} color={colors.textSecondary} />
      </Pressable>

      <View style={styles.header}>
        <Sparkles size={20} color={colors.primary.DEFAULT} />
        <Text style={styles.title} numberOfLines={2}>
          {t("ai.gateway.title")}
        </Text>
      </View>

      <Text style={styles.subtitle} numberOfLines={3}>
        {t("ai.gateway.subtitle")}
      </Text>

      <View style={styles.actions}>
        <GlassButton
          label={t("ai.gateway.connectYouTube")}
          onPress={onConnectYouTube}
          variant="primary"
          size="sm"
          style={styles.connectButton}
        />
        <Pressable onPress={onLearnMore} style={styles.learnMoreButton}>
          <Text style={styles.learnMoreText}>{t("ai.gateway.learnMore")}</Text>
        </Pressable>
      </View>

      {showDontShowAgain && (
        <Pressable onPress={onDontShowAgain} style={styles.dontShowRow}>
          <Text style={styles.dontShowText}>
            {t("ai.gateway.dontShowAgain")}
          </Text>
        </Pressable>
      )}
    </GlassCard>
  );
}

interface MoreContentCardProps {
  onExplore: () => void;
  onDismiss: () => void;
}

export function MoreContentCard({
  onExplore,
  onDismiss,
}: MoreContentCardProps) {
  const { t } = useTranslation();

  return (
    <GlassCard style={styles.moreContainer}>
      <Pressable style={styles.dismissButton} onPress={onDismiss}>
        <X size={16} color={colors.textSecondary} />
      </Pressable>

      <Text style={styles.moreTitle} numberOfLines={1}>
        {t("ai.gateway.moreContent.title")}
      </Text>
      <Text style={styles.moreSubtitle} numberOfLines={2}>
        {t("ai.gateway.moreContent.subtitle")}
      </Text>

      <GlassButton
        label={t("ai.gateway.moreContent.action")}
        onPress={onExplore}
        variant="secondary"
        size="sm"
        style={styles.exploreButton}
      />
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    padding: spacing.md,
    position: "relative",
  },
  dismissButton: {
    position: "absolute",
    top: spacing.sm,
    right: spacing.sm,
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: borderRadius.sm,
    backgroundColor: "rgba(255,255,255,0.05)",
    zIndex: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.xs,
    paddingEnd: 32,
  },
  title: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.base,
    fontWeight: "700",
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  connectButton: {
    flex: 1,
  },
  learnMoreButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  learnMoreText: {
    color: colors.primary.DEFAULT,
    fontSize: fontSize.sm,
    fontWeight: "600",
  },
  dontShowRow: {
    marginTop: spacing.sm,
    alignItems: "center",
  },
  dontShowText: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
  },
  moreContainer: {
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    padding: spacing.md,
    position: "relative",
  },
  moreTitle: {
    color: colors.text,
    fontSize: fontSize.base,
    fontWeight: "700",
    marginBottom: spacing.xs,
    paddingEnd: 32,
  },
  moreSubtitle: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  exploreButton: {
    alignSelf: "flex-start",
  },
});
