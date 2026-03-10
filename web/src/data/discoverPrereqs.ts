import type { FeaturePrerequisite, PrerequisiteType } from "./discoverTypes";

const prereqMap: Record<
  PrerequisiteType,
  { descriptionKey: string; fixRoute: string }
> = {
  avatar: {
    descriptionKey: "discover.prereq.avatar_required",
    fixRoute: "/zeh-ani/avatar",
  },
  subscription: {
    descriptionKey: "discover.prereq.subscription_required",
    fixRoute: "/subscribe",
  },
  microphone: {
    descriptionKey: "discover.prereq.microphone_required",
    fixRoute: "/settings",
  },
  contentType: {
    descriptionKey: "discover.prereq.content_required",
    fixRoute: "/vod",
  },
  preference: {
    descriptionKey: "discover.prereq.preference_required",
    fixRoute: "/settings",
  },
  voiceClone: {
    descriptionKey: "discover.prereq.voice_clone_required",
    fixRoute: "/zeh-ani",
  },
};

export function makePrereqs(
  ...types: PrerequisiteType[]
): FeaturePrerequisite[] {
  return types.map((type) => ({ type, ...prereqMap[type] }));
}

export function makeSteps(featureId: string, count: number) {
  return Array.from({ length: count }, (_, i) => ({
    titleKey: `discover.walkthrough.${featureId}.step${i + 1}.title`,
    bodyKey: `discover.walkthrough.${featureId}.step${i + 1}.body`,
    animationType: "fade" as const,
  }));
}
