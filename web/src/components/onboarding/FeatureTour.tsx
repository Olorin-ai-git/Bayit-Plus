import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { GlassButton } from "@bayit/shared/ui";
import { colors, spacing } from "@olorin/design-tokens";
import { useOnboardingStore } from "@/stores/onboardingStore";
import { DubbingDemoView } from "./demos/DubbingDemoView";
import { SubtitleDemoView } from "./demos/SubtitleDemoView";
import { InteractionDemoView } from "./demos/InteractionDemoView";
import { TriviaDemoView } from "./demos/TriviaDemoView";
import { CatchupDemoView } from "./demos/CatchupDemoView";
import { BYOCDemoView } from "./demos/BYOCDemoView";
import { ZehAniDemoView } from "./demos/ZehAniDemoView";

const TOUR_STEPS = [
  { id: "dubbing", Component: DubbingDemoView },
  { id: "subtitles", Component: SubtitleDemoView },
  { id: "interaction", Component: InteractionDemoView },
  { id: "trivia", Component: TriviaDemoView },
  { id: "catchup", Component: CatchupDemoView },
  { id: "byoc", Component: BYOCDemoView },
  { id: "zehAni", Component: ZehAniDemoView },
];

interface FeatureTourProps {
  onComplete: () => void;
  onSkip: () => void;
}

export const FeatureTour: React.FC<FeatureTourProps> = ({
  onComplete,
  onSkip,
}) => {
  const { t } = useTranslation();
  const markTourStepViewed = useOnboardingStore((s) => s.markTourStepViewed);
  const [currentIndex, setCurrentIndex] = useState(0);

  const isLast = currentIndex >= TOUR_STEPS.length - 1;
  const step = TOUR_STEPS[currentIndex];
  const StepComponent = step.Component;

  const handleNext = () => {
    markTourStepViewed(step.id);
    if (isLast) {
      onComplete();
    } else {
      setCurrentIndex((i) => i + 1);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <StepComponent />
      </View>

      <View style={styles.dots}>
        {TOUR_STEPS.map((s, idx) => (
          <View
            key={s.id}
            style={[styles.dot, idx === currentIndex && styles.dotActive]}
          />
        ))}
      </View>

      <View style={styles.actions}>
        <GlassButton
          title={t("common.skip")}
          onPress={onSkip}
          variant="ghost"
          size="sm"
        />
        <GlassButton
          title={isLast ? t("onboarding.tour.done") : t("common.next")}
          onPress={handleNext}
          variant="primary"
          size="sm"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1 },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: spacing.md,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  dotActive: { backgroundColor: colors.primary.DEFAULT },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: spacing.lg,
  },
});
