import React from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { GlassButton, GlassCard } from "@bayit/shared/ui";
import { colors, spacing, borderRadius } from "@olorin/design-tokens";
import { useDirection } from "@/hooks/useDirection";
import { useDiscoverStore } from "@/stores/discoverStore";
import type { DiscoverFeature, DiscoverFeatureId } from "@/data/discoverTypes";

interface DiscoverWalkthroughProps {
  feature: DiscoverFeature;
  onClose: () => void;
}

export const DiscoverWalkthrough: React.FC<DiscoverWalkthroughProps> = ({
  feature,
  onClose,
}) => {
  const { t } = useTranslation();
  const { textAlign } = useDirection();
  const { walkthroughs, advanceWalkthrough, completeWalkthrough } =
    useDiscoverStore();

  const wt = walkthroughs[feature.id];
  const currentStep = wt?.currentStep ?? 0;
  const steps = feature.walkthroughSteps;
  const step = steps[currentStep];
  const isLastStep = currentStep >= steps.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      completeWalkthrough(feature.id as DiscoverFeatureId, false);
      onClose();
    } else {
      advanceWalkthrough(feature.id as DiscoverFeatureId);
    }
  };

  const handleSkip = () => {
    completeWalkthrough(feature.id as DiscoverFeatureId, true);
    onClose();
  };

  if (!step) return null;

  return (
    <GlassCard style={styles.container}>
      {step.imageUrl && (
        <Image
          source={{ uri: step.imageUrl }}
          style={styles.image}
          resizeMode="cover"
        />
      )}
      <Text style={[styles.title, { textAlign }]}>{t(step.titleKey)}</Text>
      <Text style={[styles.body, { textAlign }]}>{t(step.bodyKey)}</Text>

      <View style={styles.dots}>
        {steps.map((_, idx) => (
          <View
            key={idx}
            style={[styles.dot, idx === currentStep && styles.dotActive]}
          />
        ))}
      </View>

      <View style={styles.actions}>
        <GlassButton
          title={t("common.skip")}
          onPress={handleSkip}
          variant="ghost"
          size="sm"
        />
        <GlassButton
          title={isLastStep ? t("discover.tryIt") : t("common.next")}
          onPress={handleNext}
          variant="primary"
          size="sm"
        />
      </View>
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    maxWidth: 480,
    alignSelf: "center",
  },
  image: {
    width: "100%",
    height: 200,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.sm,
  },
  body: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  dotActive: {
    backgroundColor: colors.primary.DEFAULT,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
});
