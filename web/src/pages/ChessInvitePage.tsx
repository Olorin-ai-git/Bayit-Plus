import { View, Text, Pressable, StyleSheet } from "react-native";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useDirection } from "@/hooks/useDirection";
import { colors, spacing } from "@olorin/design-tokens";
import { GlassView } from "@bayit/shared/ui";
import { NativeIcon } from "@olorin/shared-icons/native";
import { DEFAULT_APP_STORES } from "@/components/layout/footer/FooterAppDownloads";

export default function ChessInvitePage() {
  const { code } = useParams<{ code: string }>();
  const { t } = useTranslation();
  const { textAlign } = useDirection();

  const appStoreUrl = DEFAULT_APP_STORES.find((s) => s.key === "appStore")?.url;
  const playStoreUrl = DEFAULT_APP_STORES.find(
    (s) => s.key === "googlePlay",
  )?.url;

  const handleStorePress = (url: string | undefined) => {
    if (url && typeof window !== "undefined") {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.blurCircle, styles.blurCircle1]} />
      <View style={[styles.blurCircle, styles.blurCircle2]} />

      <View style={styles.content}>
        <GlassView style={styles.card}>
          <View style={styles.iconCircle}>
            <NativeIcon
              name="gamepad"
              size="xl"
              color={colors.primary.DEFAULT}
            />
          </View>

          <Text style={[styles.title, { textAlign }]}>
            {t("chess.invite.title")}
          </Text>

          <Text style={[styles.subtitle, { textAlign }]}>
            {t("chess.invite.subtitle")}
          </Text>

          {code && (
            <View style={styles.codeBadge}>
              <Text style={styles.codeLabel}>
                {t("chess.invite.codeLabel")}
              </Text>
              <Text style={styles.codeValue}>{code}</Text>
            </View>
          )}

          <Text style={[styles.instructions, { textAlign }]}>
            {t("chess.invite.instructions")}
          </Text>

          <View style={styles.buttonRow}>
            <Pressable
              style={({ pressed }) => [
                styles.storeButton,
                styles.iosButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={() => handleStorePress(appStoreUrl)}
              accessibilityLabel={t("chess.invite.appStore")}
              accessibilityRole="link"
            >
              <NativeIcon name="apple" size="md" color={colors.background} />
              <Text style={styles.iosButtonText}>
                {t("chess.invite.appStore")}
              </Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.storeButton,
                styles.androidButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={() => handleStorePress(playStoreUrl)}
              accessibilityLabel={t("chess.invite.googlePlay")}
              accessibilityRole="link"
            >
              <NativeIcon name="play" size="md" color={colors.text} />
              <Text style={styles.androidButtonText}>
                {t("chess.invite.googlePlay")}
              </Text>
            </Pressable>
          </View>
        </GlassView>

        <Text style={styles.footer}>{t("chess.invite.footer")}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: "100vh" as any,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl * 2,
    backgroundColor: colors.background,
  },
  blurCircle: {
    position: "absolute",
    borderRadius: 9999,
    opacity: 0.15,
  },
  blurCircle1: {
    width: 350,
    height: 350,
    top: "15%",
    right: "10%",
    backgroundColor: "#9333ea",
    filter: "blur(120px)" as any,
  },
  blurCircle2: {
    width: 280,
    height: 280,
    bottom: "20%",
    left: "5%",
    backgroundColor: "#7c3aed",
    opacity: 0.12,
    filter: "blur(120px)" as any,
  },
  content: {
    alignItems: "center",
    zIndex: 10,
    maxWidth: 420,
    width: "100%",
  },
  card: {
    padding: spacing.xl * 1.5,
    alignItems: "center",
    width: "100%",
    borderRadius: 16,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(147, 51, 234, 0.3)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.7)",
    marginBottom: spacing.lg,
    lineHeight: 24,
  },
  codeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: "rgba(147, 51, 234, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(147, 51, 234, 0.3)",
    borderRadius: 8,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  codeLabel: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.6)",
    fontWeight: "500",
  },
  codeValue: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.primary.DEFAULT,
    letterSpacing: 2,
  },
  instructions: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.5)",
    marginBottom: spacing.xl,
    lineHeight: 20,
  },
  buttonRow: {
    width: "100%",
    gap: spacing.sm,
  },
  storeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 8,
  },
  iosButton: {
    backgroundColor: colors.primary.DEFAULT,
  },
  androidButton: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  buttonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  iosButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.background,
  },
  androidButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  footer: {
    marginTop: spacing.xl,
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.4)",
  },
});
