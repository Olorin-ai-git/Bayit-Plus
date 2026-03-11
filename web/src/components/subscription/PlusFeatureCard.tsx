import { View, Text, StyleSheet, Pressable } from "react-native";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { GlassCard } from "@bayit/shared/ui";
import { Crown, ArrowRight } from "lucide-react";
import { colors, spacing, fontSize } from "@olorin/design-tokens";
import { useAuthStore } from "@/stores/authStore";

export type PlusFeature =
  | "dubbing"
  | "subtitles"
  | "search"
  | "catchup"
  | "talkback";

interface PlusFeatureCardProps {
  feature: PlusFeature;
}

export function PlusFeatureCard({ feature }: PlusFeatureCardProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  if (user?.subscription?.plan === "plus") return null;

  return (
    <Pressable onPress={() => navigate("/subscribe")}>
      <GlassCard style={styles.container}>
        <View style={styles.row}>
          <Crown size={16} color={colors.warning?.DEFAULT ?? colors.warning} />
          <Text style={styles.featureText} numberOfLines={1}>
            {t(`plus.feature.${feature}`)}
          </Text>
          <View style={styles.learnMore}>
            <Text style={styles.learnMoreText}>
              {t("plus.feature.learnMore")}
            </Text>
            <ArrowRight size={12} color={colors.primary.DEFAULT} />
          </View>
        </View>
      </GlassCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  featureText: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: "600",
  },
  learnMore: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  learnMoreText: {
    color: colors.primary.DEFAULT,
    fontSize: fontSize.xs,
    fontWeight: "600",
  },
});
