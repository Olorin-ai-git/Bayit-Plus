/**
 * SubscriptionSection
 * Subscription management: current plan, credit balance, upgrade, billing history.
 */

import { useState, useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useDirection } from "@/hooks/useDirection";
import { GlassButton } from "@bayit/shared/ui";
import {
  CreditCard,
  Crown,
  Receipt,
  ArrowUpCircle,
  Sparkles,
} from "lucide-react";
import { colors, spacing, fontSize } from "@olorin/design-tokens";
import { SettingSection } from "./shared/SettingSection";
import { SettingRow } from "./shared/SettingRow";
import api from "@/services/api";
import logger from "@/utils/logger";
import { subscriptionResponseSchema, creditBalanceSchema, type SubscriptionInfo, type CreditBalance } from './subscriptionResponse';

export function SubscriptionSection() {
  const { t } = useTranslation();
  const { isRTL } = useDirection();
  const navigate = useNavigate();
  const [subscription, setSubscription] = useState<SubscriptionInfo>();
  const [credits, setCredits] = useState<CreditBalance | null>(null);

  useEffect(() => {
    let active = true;
    void api.get("/subscriptions/current").then(data => {
      const response = subscriptionResponseSchema.parse(data);
      if (active) setSubscription(response.subscription);
    }).catch(error => logger.error("Failed to load subscription", "SubscriptionSection", error));
    void api.get("/beta/credits/balance").then(data => {
      const response = creditBalanceSchema.parse(data);
      if (active) setCredits(response);
    }).catch(error => logger.error("Failed to load credit balance", "SubscriptionSection", error));
    return () => { active = false; };
  }, []);

  const planDisplay = subscription === undefined ? t("common.unavailable") : subscription?.plan ?? t("settings.freePlan", "Free");
  const statusDisplay = subscription === undefined ? t("common.unavailable") : subscription?.status ?? t("common.notAvailable");
  const isFree =
    subscription === null || subscription?.plan.toLowerCase() === "free";

  return (
    <SettingSection
      title={t("settings.subscription", "Subscription")}
      isRTL={isRTL}
    >
      <View style={styles.planRow}>
        <SettingRow
          type="value"
          icon={Crown}
          label={t("settings.currentPlan", "Current Plan")}
          value={planDisplay}
          isRTL={isRTL}
        />
        {isFree && (
          <View style={styles.upgradeBadge}>
            <Text style={styles.upgradeBadgeText}>
              {t("settings.upgrade", "Upgrade")}
            </Text>
          </View>
        )}
      </View>
      <SettingRow
        type="value"
        icon={CreditCard}
        label={t("settings.status", "Status")}
        value={statusDisplay}
        isRTL={isRTL}
      />
      {credits && (
        <SettingRow
          type="value"
          icon={Sparkles}
          label={t("plus.badge.creditsRemaining", {
            count: credits.remaining_credits,
          })}
          value={`${credits.remaining_credits} / ${credits.total_credits}`}
          isRTL={isRTL}
        />
      )}
      {subscription?.currentPeriodEnd && (
        <SettingRow
          type="value"
          label={t("settings.renewsAt", "Renews At")}
          value={subscription.currentPeriodEnd}
          isRTL={isRTL}
        />
      )}
      <View style={styles.actions}>
        <GlassButton
          variant="primary"
          size="sm"
          onPress={() => navigate("/subscribe")}
        >
          <ArrowUpCircle size={14} color={colors.text} />
          <Text style={styles.upgradeText}>
            {t("settings.upgradePlan", "Upgrade Plan")}
          </Text>
        </GlassButton>
        <GlassButton
          variant="secondary"
          size="sm"
          onPress={() => navigate("/settings/billing")}
        >
          <Receipt size={14} color={colors.textMuted} />
          <Text style={styles.actionText}>
            {t("settings.billingHistory", "Billing History")}
          </Text>
        </GlassButton>
      </View>
    </SettingSection>
  );
}

const styles = StyleSheet.create({
  planRow: { flexDirection: "row", alignItems: "center" },
  upgradeBadge: {
    marginLeft: spacing.sm,
    backgroundColor: colors.warning,
    borderRadius: 4,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  upgradeBadgeText: {
    color: colors.warningText ?? colors.text,
    fontSize: fontSize.xs,
    fontWeight: "700",
  },
  actions: { marginTop: spacing.md, gap: spacing.sm },
  upgradeText: {
    color: colors.text,
    fontSize: fontSize.sm,
    marginLeft: spacing.xs,
    fontWeight: "600",
  },
  actionText: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    marginLeft: spacing.xs,
  },
});
