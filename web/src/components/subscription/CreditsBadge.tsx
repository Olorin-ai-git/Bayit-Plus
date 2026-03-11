import { useState, useEffect } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { GlassCard } from "@bayit/shared/ui";
import { Crown, Sparkles, Zap } from "lucide-react";
import { colors, spacing, fontSize } from "@olorin/design-tokens";
import { useAuthStore } from "@/stores/authStore";
import api from "@/services/api";
import logger from "@/utils/logger";

interface CreditBalance {
  remaining_credits: number;
  total_credits: number;
  used_credits: number;
}

type CreditStatus = "healthy" | "warning" | "depleted";

function getCreditStatus(remaining: number, total: number): CreditStatus {
  if (remaining <= 0) return "depleted";
  if (total > 0 && remaining / total < 0.2) return "warning";
  return "healthy";
}

const STATUS_COLORS: Record<CreditStatus, string> = {
  healthy: colors.success.DEFAULT,
  warning: colors.warning.DEFAULT,
  depleted: colors.error.DEFAULT,
};

export function CreditsBadge() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();
  const [balance, setBalance] = useState<CreditBalance | null>(null);

  const isPlus = user?.subscription?.plan === "plus";

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    loadBalance();
  }, [isAuthenticated, user]);

  const loadBalance = async () => {
    try {
      const data = await api.get(`/beta/credits/balance/${user?.id}`);
      setBalance(data as unknown as CreditBalance);
    } catch (error) {
      logger.error("Failed to load credit balance", "CreditsBadge", error);
    }
  };

  if (!isAuthenticated || !balance) return null;

  const status = getCreditStatus(
    balance.remaining_credits,
    balance.total_credits,
  );
  const statusColor = STATUS_COLORS[status];
  const progress =
    balance.total_credits > 0
      ? balance.remaining_credits / balance.total_credits
      : 0;

  if (isPlus) {
    return (
      <GlassCard style={styles.container}>
        <View style={styles.row}>
          <Crown size={18} color={colors.warning.DEFAULT} />
          <Text style={styles.plusLabel}>
            {t("plus.badge.subscribedLabel")}
          </Text>
          <Text style={styles.unlimitedText}>{t("plus.badge.unlimited")}</Text>
        </View>
      </GlassCard>
    );
  }

  return (
    <Pressable onPress={() => navigate("/subscribe")}>
      <GlassCard style={styles.container}>
        <View style={styles.row}>
          <Sparkles size={18} color={statusColor} />
          <View style={styles.creditInfo}>
            <Text style={styles.creditCount}>
              {t("plus.badge.creditsRemaining", {
                count: balance.remaining_credits,
              })}
            </Text>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${progress * 100}%`,
                    backgroundColor: statusColor,
                  },
                ]}
              />
            </View>
          </View>
          {status !== "healthy" && (
            <View style={styles.upgradeCta}>
              <Zap size={14} color={colors.primary.DEFAULT} />
              <Text style={styles.upgradeText}>
                {t("plus.badge.upgradeNow")}
              </Text>
            </View>
          )}
        </View>
      </GlassCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  plusLabel: {
    color: colors.warning.DEFAULT,
    fontSize: fontSize.sm,
    fontWeight: "700",
  },
  unlimitedText: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    marginLeft: "auto",
  },
  creditInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  creditCount: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: "600",
  },
  progressTrack: {
    height: 4,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
  upgradeCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: "rgba(126, 34, 206, 0.15)",
    borderRadius: 12,
  },
  upgradeText: {
    color: colors.primary.DEFAULT,
    fontSize: fontSize.xs,
    fontWeight: "700",
  },
});
