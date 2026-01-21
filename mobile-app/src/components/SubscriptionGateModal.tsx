/**
 * SubscriptionGateModal - Premium content paywall
 *
 * Features:
 * - Premium content detection
 * - Subscription plan comparison
 * - Quick subscribe CTA
 * - Trial information
 * - RTL support
 * - Haptic feedback
 */

import React, { useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  SafeAreaView,
  ScrollView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import ReactNativeHapticFeedback from "react-native-haptic-feedback";
import LinearGradient from "react-native-linear-gradient";
import { GlassView, GlassButton } from "@bayit/shared";
import { useDirection } from "@bayit/shared-hooks";
import { spacing, colors, borderRadius } from "../theme";

// Type assertion for LinearGradient React component
const LinearGradientComponent = LinearGradient as any as React.FC<any>;

interface SubscriptionPlan {
  id: string;
  name: string;
  price: string;
  period: string;
  features: string[];
  recommended?: boolean;
}

interface SubscriptionGateModalProps {
  visible: boolean;
  onClose: () => void;
  contentTitle?: string;
  contentType?: "movie" | "series" | "live" | "premium";
  requiredTier?: "basic" | "premium" | "family";
}

const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: "basic",
    name: "Basic",
    price: "₪29.90",
    period: "/month",
    features: [
      "subscriptionGate.features.sdStreaming",
      "subscriptionGate.features.oneDevice",
      "subscriptionGate.features.limitedLibrary",
    ],
  },
  {
    id: "premium",
    name: "Premium",
    price: "₪49.90",
    period: "/month",
    features: [
      "subscriptionGate.features.hdStreaming",
      "subscriptionGate.features.twoDevices",
      "subscriptionGate.features.fullLibrary",
      "subscriptionGate.features.downloads",
    ],
    recommended: true,
  },
  {
    id: "family",
    name: "Family",
    price: "₪79.90",
    period: "/month",
    features: [
      "subscriptionGate.features.uhd4k",
      "subscriptionGate.features.fiveDevices",
      "subscriptionGate.features.fullLibrary",
      "subscriptionGate.features.downloads",
      "subscriptionGate.features.kidsProfiles",
    ],
  },
];

export const SubscriptionGateModal: React.FC<SubscriptionGateModalProps> = ({
  visible,
  onClose,
  contentTitle,
  contentType = "premium",
  requiredTier = "basic",
}) => {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const { isRTL, textAlign } = useDirection();

  const handleSelectPlan = useCallback(
    (planId: string) => {
      ReactNativeHapticFeedback.trigger("impactMedium");
      onClose();
      navigation.navigate("Subscribe", { plan: planId });
    },
    [onClose, navigation],
  );

  const handleStartTrial = useCallback(() => {
    ReactNativeHapticFeedback.trigger("impactMedium");
    onClose();
    navigation.navigate("Subscribe", { trial: true });
  }, [onClose, navigation]);

  const handleClose = useCallback(() => {
    ReactNativeHapticFeedback.trigger("impactLight");
    onClose();
  }, [onClose]);

  const getContentTypeIcon = () => {
    switch (contentType) {
      case "movie":
        return "🎬";
      case "series":
        return "📺";
      case "live":
        return "📡";
      default:
        return "⭐";
    }
  };

  const getContentTypeText = () => {
    switch (contentType) {
      case "movie":
        return t("subscriptionGate.premiumMovie");
      case "series":
        return t("subscriptionGate.premiumSeries");
      case "live":
        return t("subscriptionGate.premiumLive");
      default:
        return t("subscriptionGate.premiumContent");
    }
  };

  const renderPlanCard = (plan: SubscriptionPlan) => {
    const isRecommended = plan.recommended;
    const meetsRequirement =
      requiredTier === "basic" ||
      (requiredTier === "premium" &&
        (plan.id === "premium" || plan.id === "family")) ||
      (requiredTier === "family" && plan.id === "family");

    return (
      <TouchableOpacity
        key={plan.id}
        onPress={() => handleSelectPlan(plan.id)}
        activeOpacity={0.7}
      >
        <View
          style={[
            styles.planCard,
            isRecommended && styles.planCardRecommended,
            !meetsRequirement && styles.planCardDisabled,
          ]}
        >
          {isRecommended && (
            <View style={styles.recommendedBadge}>
              <Text style={styles.recommendedText}>
                {t("subscriptionGate.recommended")}
              </Text>
            </View>
          )}

          <Text style={[styles.planName, { textAlign }]}>{plan.name}</Text>

          <View style={[styles.priceRow, isRTL && styles.priceRowRTL]}>
            <Text style={styles.planPrice}>{plan.price}</Text>
            <Text style={styles.planPeriod}>{plan.period}</Text>
          </View>

          <View style={styles.featuresList}>
            {plan.features.map((feature, index) => (
              <View
                key={index}
                style={[styles.featureRow, isRTL && styles.featureRowRTL]}
              >
                <Text style={styles.featureCheck}>✓</Text>
                <Text style={[styles.featureText, { textAlign }]}>
                  {t(feature)}
                </Text>
              </View>
            ))}
          </View>

          <GlassButton
            title={
              meetsRequirement
                ? t("subscriptionGate.selectPlan")
                : t("subscriptionGate.upgradeRequired")
            }
            onPress={() => handleSelectPlan(plan.id)}
            variant={isRecommended ? "primary" : "secondary"}
            disabled={!meetsRequirement}
            style={styles.selectButton}
          />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <SafeAreaView style={styles.modalContainer}>
              <LinearGradientComponent
                colors={["rgba(107, 33, 168, 0.95)", "rgba(0, 0, 0, 0.98)"]}
                style={styles.gradient}
              >
                {/* Close button */}
                <TouchableOpacity
                  onPress={handleClose}
                  style={[styles.closeButton, isRTL && styles.closeButtonRTL]}
                >
                  <Text style={styles.closeText}>✕</Text>
                </TouchableOpacity>

                <ScrollView
                  contentContainerStyle={styles.content}
                  showsVerticalScrollIndicator={false}
                >
                  {/* Header */}
                  <View style={styles.header}>
                    <Text style={styles.lockIcon}>🔒</Text>
                    <Text style={[styles.title, { textAlign }]}>
                      {t("subscriptionGate.title")}
                    </Text>
                    <Text style={[styles.subtitle, { textAlign }]}>
                      {t("subscriptionGate.subtitle")}
                    </Text>
                  </View>

                  {/* Content info */}
                  {contentTitle && (
                    <GlassView style={styles.contentInfo}>
                      <Text style={styles.contentIcon}>
                        {getContentTypeIcon()}
                      </Text>
                      <View style={styles.contentDetails}>
                        <Text style={[styles.contentType, { textAlign }]}>
                          {getContentTypeText()}
                        </Text>
                        <Text
                          style={[styles.contentTitle, { textAlign }]}
                          numberOfLines={2}
                        >
                          {contentTitle}
                        </Text>
                      </View>
                    </GlassView>
                  )}

                  {/* Trial offer */}
                  <GlassView style={styles.trialCard}>
                    <View style={styles.trialHeader}>
                      <Text style={styles.trialIcon}>🎁</Text>
                      <Text style={[styles.trialTitle, { textAlign }]}>
                        {t("subscriptionGate.trialTitle")}
                      </Text>
                    </View>
                    <Text style={[styles.trialDescription, { textAlign }]}>
                      {t("subscriptionGate.trialDescription")}
                    </Text>
                    <GlassButton
                      title={t("subscriptionGate.startTrial")}
                      onPress={handleStartTrial}
                      variant="primary"
                      style={styles.trialButton}
                    />
                  </GlassView>

                  {/* Plans */}
                  <Text style={[styles.plansTitle, { textAlign }]}>
                    {t("subscriptionGate.choosePlan")}
                  </Text>

                  <View style={styles.plansContainer}>
                    {SUBSCRIPTION_PLANS.map(renderPlanCard)}
                  </View>

                  {/* Footer */}
                  <Text style={[styles.footerText, { textAlign }]}>
                    {t("subscriptionGate.cancelAnytime")}
                  </Text>
                </ScrollView>
              </LinearGradientComponent>
            </SafeAreaView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    flex: 1,
    marginTop: 60,
  },
  gradient: {
    flex: 1,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    overflow: "hidden",
  },
  closeButton: {
    position: "absolute",
    top: spacing.lg,
    right: spacing.lg,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  closeButtonRTL: {
    right: undefined,
    left: spacing.lg,
  },
  closeText: {
    fontSize: 18,
    color: colors.text,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl * 2,
    paddingBottom: spacing.xl,
  },
  header: {
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  lockIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  contentInfo: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
  },
  contentIcon: {
    fontSize: 32,
    marginRight: spacing.md,
  },
  contentDetails: {
    flex: 1,
  },
  contentType: {
    fontSize: 12,
    color: colors.textSecondary,
    textTransform: "uppercase",
  },
  contentTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    marginTop: 2,
  },
  trialCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  trialHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  trialIcon: {
    fontSize: 24,
    marginRight: spacing.sm,
  },
  trialTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
  },
  trialDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  trialButton: {
    alignSelf: "stretch",
  },
  plansTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.md,
  },
  plansContainer: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  planCard: {
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  planCardRecommended: {
    borderColor: colors.primary,
    backgroundColor: "rgba(107, 33, 168, 0.15)",
  },
  planCardDisabled: {
    opacity: 0.5,
  },
  recommendedBadge: {
    position: "absolute",
    top: -10,
    alignSelf: "center",
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  recommendedText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: "bold",
  },
  planName: {
    fontSize: 20,
    fontWeight: "bold",
    color: colors.text,
    marginTop: spacing.sm,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  priceRowRTL: {
    flexDirection: "row-reverse",
  },
  planPrice: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.primary,
  },
  planPeriod: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
  },
  featuresList: {
    marginBottom: spacing.md,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  featureRowRTL: {
    flexDirection: "row-reverse",
  },
  featureCheck: {
    fontSize: 14,
    color: "#22c55e",
    marginRight: spacing.sm,
  },
  featureText: {
    fontSize: 13,
    color: colors.text,
    flex: 1,
  },
  selectButton: {
    marginTop: spacing.sm,
  },
  footerText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: "center",
  },
});

export default SubscriptionGateModal;
