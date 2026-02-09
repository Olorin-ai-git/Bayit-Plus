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
import { GlassView } from "@bayit/shared";
import { GlassButton } from "@bayit/shared/ui";
import { useDirection } from "@bayit/shared-hooks";
import { NativeIcon } from "@olorin/shared-icons/native";
import { Colors } from "../theme/colors";

const LinearGradientComponent = LinearGradient;

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

const CONTENT_TYPE_ICONS: Record<string, string> = {
  movie: "vod",
  series: "live",
  live: "broadcast",
  premium: "gem",
};

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
    return CONTENT_TYPE_ICONS[contentType] || "gem";
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
      <GlassButton
        variant={isRecommended ? "primary" : "secondary"}
        key={plan.id}
        onPress={() => handleSelectPlan(plan.id)}
        className={`bg-white/5 rounded-2xl p-6 border border-white/10 mb-3 ${
          isRecommended ? "border-purple-600 bg-purple-600/15" : ""
        } ${!meetsRequirement ? "opacity-50" : ""}`}
      >
        <View className="relative">
          {isRecommended && (
            <View className="absolute -top-10 self-center bg-purple-600 px-4 py-1 rounded-lg">
              <Text className="text-white text-xs font-bold">
                {t("subscriptionGate.recommended")}
              </Text>
            </View>
          )}

          <Text className={`text-xl font-bold text-white mt-2 ${textAlign === 'right' ? 'text-right' : 'text-left'}`}>{plan.name}</Text>

          <View className={`flex-row items-baseline mt-1 mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Text className="text-2xl font-bold text-purple-600">{plan.price}</Text>
            <Text className="text-sm text-gray-400 ml-1">{plan.period}</Text>
          </View>

          <View className="mb-4">
            {plan.features.map((feature, index) => (
              <View
                key={index}
                className={`flex-row items-center mb-1 ${isRTL ? 'flex-row-reverse' : ''}`}
              >
                <View className="mr-2">
                  <NativeIcon name="check" size="sm" color={Colors.Success.default} />
                </View>
                <Text className={`text-xs text-white flex-1 ${textAlign === 'right' ? 'text-right' : 'text-left'}`}>
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
            className="mt-2"
          />
        </View>
      </GlassButton>
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
        <View className="flex-1 bg-black/50 justify-end">
          <TouchableWithoutFeedback>
            <SafeAreaView className="flex-1 mt-15">
              <LinearGradientComponent
                colors={["rgba(107, 33, 168, 0.95)", "rgba(0, 0, 0, 0.98)"]}
                className="flex-1 rounded-t-3xl overflow-hidden"
              >
                {/* Close button */}
                <GlassButton
                  variant="ghost"
                  onPress={handleClose}
                  className={`absolute top-4 ${isRTL ? 'left-4' : 'right-4'} w-10 h-10 rounded-full bg-white/10 justify-center items-center z-10`}
                >
                  <NativeIcon name="x" size="md" color={Colors.white} />
                </GlassButton>

                <ScrollView
                  contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 64, paddingBottom: 24 }}
                  showsVerticalScrollIndicator={false}
                >
                  {/* Header */}
                  <View className="items-center mb-4">
                    <View className="mb-3">
                      <NativeIcon name="lock" size="xxl" color={Colors.Primary.p500} />
                    </View>
                    <Text className={`text-2xl font-bold text-white mb-1 ${textAlign === 'right' ? 'text-right' : 'text-left'}`}>
                      {t("subscriptionGate.title")}
                    </Text>
                    <Text className={`text-sm text-gray-400 ${textAlign === 'right' ? 'text-right' : 'text-left'}`}>
                      {t("subscriptionGate.subtitle")}
                    </Text>
                  </View>

                  {/* Content info */}
                  {contentTitle && (
                    <GlassView className="flex-row items-center p-3 rounded-lg mb-4">
                      <View className="mr-3">
                        <NativeIcon name={getContentTypeIcon()} size="lg" color={Colors.white} />
                      </View>
                      <View className="flex-1">
                        <Text className={`text-xs text-gray-400 uppercase ${textAlign === 'right' ? 'text-right' : 'text-left'}`}>
                          {getContentTypeText()}
                        </Text>
                        <Text
                          className={`text-base font-semibold text-white mt-0.5 ${textAlign === 'right' ? 'text-right' : 'text-left'}`}
                          numberOfLines={2}
                        >
                          {contentTitle}
                        </Text>
                      </View>
                    </GlassView>
                  )}

                  {/* Trial offer */}
                  <GlassView className="p-4 rounded-lg mb-4 border border-purple-600">
                    <View className="flex-row items-center mb-2">
                      <View className="mr-2">
                        <NativeIcon name="gem" size="md" color={Colors.white} />
                      </View>
                      <Text className={`text-lg font-semibold text-white ${textAlign === 'right' ? 'text-right' : 'text-left'}`}>
                        {t("subscriptionGate.trialTitle")}
                      </Text>
                    </View>
                    <Text className={`text-sm text-gray-400 mb-3 ${textAlign === 'right' ? 'text-right' : 'text-left'}`}>
                      {t("subscriptionGate.trialDescription")}
                    </Text>
                    <GlassButton
                      title={t("subscriptionGate.startTrial")}
                      onPress={handleStartTrial}
                      variant="primary"
                      className="self-stretch"
                    />
                  </GlassView>

                  {/* Plans */}
                  <Text className={`text-lg font-semibold text-white mb-3 ${textAlign === 'right' ? 'text-right' : 'text-left'}`}>
                    {t("subscriptionGate.choosePlan")}
                  </Text>

                  <View className="gap-3 mb-4">
                    {SUBSCRIPTION_PLANS.map(renderPlanCard)}
                  </View>

                  {/* Footer */}
                  <Text className={`text-xs text-gray-400 text-center ${textAlign === 'right' ? 'text-right' : 'text-left'}`}>
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

export default SubscriptionGateModal;
