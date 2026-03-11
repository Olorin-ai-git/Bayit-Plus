import { View, Text, Pressable, StyleSheet } from "react-native";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { GlassModal } from "@bayit/shared/ui";
import { Sparkles, Mic, Subtitles, Search, Coins, Crown } from "lucide-react";
import { colors, spacing, fontSize } from "@olorin/design-tokens";

const STORAGE_KEY = "bayit_plus_intro_seen";

export function hasSeenPlusIntro(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function markPlusIntroSeen(): void {
  try {
    localStorage.setItem(STORAGE_KEY, "true");
  } catch {
    // Storage unavailable
  }
}

interface PlusIntroModalProps {
  visible: boolean;
  onDismiss: () => void;
}

const featureBullets = [
  { icon: Mic, key: "bullet1" },
  { icon: Subtitles, key: "bullet2" },
  { icon: Search, key: "bullet3" },
  { icon: Coins, key: "bullet4" },
] as const;

export function PlusIntroModal({ visible, onDismiss }: PlusIntroModalProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleSeePlans = () => {
    markPlusIntroSeen();
    onDismiss();
    navigate("/subscribe");
  };

  const handleMaybeLater = () => {
    markPlusIntroSeen();
    onDismiss();
  };

  return (
    <GlassModal
      visible={visible}
      type="info"
      onClose={handleMaybeLater}
      dismissable
      buttons={[]}
    >
      <View style={styles.content}>
        <Sparkles size={48} color={colors.primary.DEFAULT} />

        <Text style={styles.title}>{t("plus.intro.title")}</Text>

        <Text style={styles.subtitle}>{t("plus.intro.subtitle")}</Text>

        <View style={styles.bulletList}>
          {featureBullets.map(({ icon: Icon, key }) => (
            <View key={key} style={styles.bulletRow}>
              <View style={styles.bulletIconWrap}>
                <Icon size={20} color={colors.primary.DEFAULT} />
              </View>
              <Text style={styles.bulletText}>{t(`plus.intro.${key}`)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.actions}>
          <Pressable style={styles.seePlansButton} onPress={handleSeePlans}>
            <Crown size={18} color="#000" />
            <Text style={styles.seePlansText}>{t("plus.intro.seePlans")}</Text>
          </Pressable>

          <Pressable style={styles.maybeLaterButton} onPress={handleMaybeLater}>
            <Text style={styles.maybeLaterText}>
              {t("plus.intro.maybeLater")}
            </Text>
          </Pressable>
        </View>
      </View>
    </GlassModal>
  );
}
const styles = StyleSheet.create({
  content: {
    alignItems: "center",
    paddingVertical: spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.text,
    textAlign: "center",
    marginTop: spacing.md,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: spacing.sm,
    lineHeight: 22,
    maxWidth: 320,
  },
  bulletList: {
    alignSelf: "stretch",
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  bulletIconWrap: {
    width: 28,
    alignItems: "center",
  },
  bulletText: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: "500",
    color: colors.text,
  },
  actions: {
    alignSelf: "stretch",
    marginTop: spacing.xl,
    gap: spacing.sm,
  },
  seePlansButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.primary.DEFAULT,
    paddingVertical: spacing.md,
    borderRadius: 8,
    minHeight: 52,
  },
  seePlansText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "700",
  },
  maybeLaterButton: {
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
  maybeLaterText: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
  },
});
