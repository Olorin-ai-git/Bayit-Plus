/**
 * SubscribeScreen - Shared Screen
 * Two-tier subscription plan selection and checkout for TV apps.
 * Uses i18n keys from planFeatures.ts for all display text.
 */

import React, { useState, useCallback } from "react";
import { View, Text, ScrollView, Pressable, Platform } from "react-native";
import { GlassLoadingSpinner } from "@bayit/shared/ui";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { NativeIcon } from "@olorin/shared-icons/native";
import { useDirection } from "../hooks/useDirection";
import { GlassView, GlassCard } from "../components/ui";
import { colors, spacing, borderRadius } from "../theme";
import { subscriptionService } from "../services";
import { useAuthStore } from "../stores";
import { AI_FEATURE_CATEGORIES } from "../data/planFeatures";

export function SubscribeScreen() {
  const { t, i18n } = useTranslation();
  const { isRTL, textAlign, flexDirection } = useDirection();
  const navigation = useNavigation<any>();
  const { isAuthenticated } = useAuthStore();
  const [selectedPlan, setSelectedPlan] = useState("plus");
  const [focusedPlan, setFocusedPlan] = useState<string | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">(
    "monthly",
  );
  const [loading, setLoading] = useState(false);
  const [focusedItem, setFocusedItem] = useState<string | null>(null);

  const handleSubscribe = useCallback(async () => {
    if (!isAuthenticated) {
      navigation.navigate("Login");
      return;
    }

    setLoading(true);
    try {
      const response = await subscriptionService.createCheckout(selectedPlan);
      if (Platform.OS === "web" && response.checkoutUrl) {
        // @ts-ignore - window exists on web
        window.location.href = response.checkoutUrl;
      }
    } catch (error) {
      // Error handled by service layer
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, selectedPlan, navigation]);

  return (
    <ScrollView
      className="flex-1 bg-black"
      contentContainerStyle={{
        paddingHorizontal: 48,
        paddingVertical: 48,
        alignItems: "center",
      }}
    >
      {/* Header */}
      <View className="items-center mb-12">
        <Text className="text-[40px] font-bold text-white text-center mb-4">
          {t("subscribe.title")}
        </Text>
        <Text className="text-lg text-gray-400 text-center max-w-[600px]">
          {t("subscribe.subtitle")}
        </Text>
      </View>

      {/* Billing Toggle */}
      <View className="items-center mb-12">
        <GlassView intensity="low" className="flex-row p-1 rounded-full">
          <Pressable
            onPress={() => setBillingPeriod("monthly")}
            onFocus={() => setFocusedItem("monthly")}
            onBlur={() => setFocusedItem(null)}
            className={`flex-row items-center px-6 py-3 rounded-full gap-2 border-2 ${
              billingPeriod === "monthly" ? "bg-[#a855f7]" : ""
            } ${focusedItem === "monthly" ? "border-white" : "border-transparent"}`}
          >
            <Text
              className={`text-base ${billingPeriod === "monthly" ? "text-white font-semibold" : "text-gray-400"}`}
            >
              {t("subscribe.monthly")}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setBillingPeriod("yearly")}
            onFocus={() => setFocusedItem("yearly")}
            onBlur={() => setFocusedItem(null)}
            className={`flex-row items-center px-6 py-3 rounded-full gap-2 border-2 ${
              billingPeriod === "yearly" ? "bg-[#a855f7]" : ""
            } ${focusedItem === "yearly" ? "border-white" : "border-transparent"}`}
          >
            <Text
              className={`text-base ${billingPeriod === "yearly" ? "text-white font-semibold" : "text-gray-400"}`}
            >
              {t("subscribe.yearly")}
            </Text>
            <View className="bg-[rgba(34,197,94,0.2)] px-2 py-1 rounded">
              <Text className="text-[11px] text-[#22c55e] font-semibold">
                {t("subscribe.save2Months")}
              </Text>
            </View>
          </Pressable>
        </GlassView>
      </View>

      {/* Two-Tier Plan Cards */}
      <View className="flex-row flex-wrap justify-center gap-6 mb-12 max-w-[800px]">
        {/* Free Plan */}
        <Pressable
          onPress={() => setSelectedPlan("free")}
          onFocus={() => setFocusedPlan("free")}
          className="flex-1 min-w-[300px] max-w-[380px]"
        >
          <GlassCard
            className={`p-6 border-[3px] ${
              selectedPlan === "free"
                ? "border-[#a855f7]"
                : "border-transparent"
            } ${focusedPlan === "free" ? "border-white scale-[1.03]" : ""}`}
          >
            <View className="items-center mb-4">
              <Text className="text-[22px] font-bold text-white mb-2">
                {t("plans.free.name")}
              </Text>
              <Text className="text-[40px] font-bold text-gray-400">$0</Text>
            </View>
            <View className="mb-4">
              {(
                t("plans.free.features", { returnObjects: true }) as string[]
              ).map((feature: string, i: number) => (
                <View key={i} className="flex-row items-center gap-2 mb-2">
                  <View className="w-[22px] h-[22px] rounded-full bg-[rgba(34,197,94,0.2)] justify-center items-center">
                    <NativeIcon name="check" size="xs" color="#22c55e" />
                  </View>
                  <Text
                    className={`text-sm text-white flex-1 ${isRTL ? "text-right" : "text-left"}`}
                  >
                    {feature}
                  </Text>
                </View>
              ))}
            </View>
          </GlassCard>
        </Pressable>

        {/* Plus Plan */}
        <Pressable
          onPress={() => setSelectedPlan("plus")}
          onFocus={() => setFocusedPlan("plus")}
          className="flex-1 min-w-[300px] max-w-[380px] -mt-5 mb-5"
        >
          <GlassCard
            className={`p-6 relative border-[3px] ${
              selectedPlan === "plus"
                ? "border-[#a855f7]"
                : "border-transparent"
            } ${focusedPlan === "plus" ? "border-white scale-[1.03]" : ""}`}
          >
            <View className="absolute -top-3.5 right-4 flex-row items-center gap-1 bg-[#a855f7] px-4 py-1 rounded-full">
              <NativeIcon name="star" size="sm" color="#ffffff" />
              <Text className="text-xs font-semibold text-white">
                {t("subscribe.popular")}
              </Text>
            </View>

            <View className="items-center mb-4">
              <Text className="text-[22px] font-bold text-white mb-2">
                {t("plans.plus.name")}
              </Text>
              <View className="flex-row items-baseline gap-1">
                <Text className="text-[40px] font-bold text-[#a855f7]">
                  $
                  {billingPeriod === "monthly"
                    ? t("plans.plus.monthlyPrice")
                    : t("plans.plus.yearlyPrice")}
                </Text>
                <Text className="text-base text-gray-400">
                  {billingPeriod === "monthly"
                    ? t("subscribe.period")
                    : t("subscribe.perYear")}
                </Text>
              </View>
              {billingPeriod === "yearly" && (
                <Text className="text-sm text-[#22c55e] mt-1">
                  {t("subscribe.save2Months")}
                </Text>
              )}
            </View>

            <View className="mb-4">
              {(
                t("plans.plus.features", { returnObjects: true }) as string[]
              ).map((feature: string, i: number) => (
                <View key={i} className="flex-row items-center gap-2 mb-2">
                  <View className="w-[22px] h-[22px] rounded-full bg-[rgba(34,197,94,0.2)] justify-center items-center">
                    <NativeIcon name="check" size="xs" color="#22c55e" />
                  </View>
                  <Text
                    className={`text-sm text-white flex-1 ${isRTL ? "text-right" : "text-left"}`}
                  >
                    {feature}
                  </Text>
                </View>
              ))}
            </View>

            {/* AI Categories Breakdown */}
            <View className="border-t border-white/10 pt-3 mt-2">
              {AI_FEATURE_CATEGORIES.map((cat) => (
                <View
                  key={cat.id}
                  className="flex-row items-center gap-2 mb-1.5"
                >
                  <NativeIcon name="sparkles" size="xs" color="#a855f7" />
                  <Text
                    className={`text-xs text-gray-300 flex-1 ${isRTL ? "text-right" : "text-left"}`}
                  >
                    {t(cat.translationKey)} ({cat.count})
                  </Text>
                </View>
              ))}
            </View>
          </GlassCard>
        </Pressable>
      </View>

      {/* CTA Section */}
      <View className="items-center mb-12">
        <Pressable
          onPress={handleSubscribe}
          disabled={loading || selectedPlan === "free"}
          onFocus={() => setFocusedItem("cta")}
          onBlur={() => setFocusedItem(null)}
          className={`bg-[#a855f7] px-24 py-4 rounded-full border-[3px] min-w-[300px] items-center ${
            focusedItem === "cta"
              ? "border-white scale-105"
              : "border-transparent"
          } ${loading || selectedPlan === "free" ? "opacity-70" : ""}`}
        >
          {loading ? (
            <GlassLoadingSpinner size="small" />
          ) : (
            <Text className="text-lg font-bold text-white">
              {selectedPlan === "free"
                ? t("subscribe.selected")
                : t("subscribe.select")}
            </Text>
          )}
        </Pressable>
      </View>

      {/* TV-specific: QR Code for mobile signup */}
      <View className="items-center">
        <GlassCard className="p-6 items-center min-w-[300px]">
          <Text className="text-base text-gray-300 mb-4">
            {t("subscribe.scanQR", "Or sign up from mobile")}
          </Text>
          <View className="w-[150px] h-[150px] bg-white/10 rounded-lg justify-center items-center mb-4 border-2 border-white/20 border-dashed">
            <NativeIcon name="smartphone" size="3xl" color="#9ca3af" />
          </View>
          <Text className="text-sm text-gray-400 text-center">
            {t("subscribe.scanToSignup", "Scan to sign up from your phone")}
          </Text>
        </GlassCard>
      </View>
    </ScrollView>
  );
}
