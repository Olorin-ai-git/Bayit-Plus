export type DiscoverFeatureId =
  | "pause_ask"
  | "interactive_subtitles"
  | "vocabulary"
  | "vod_moments"
  | "cultural_context"
  | "bilingual_bridge"
  | "ai_companion"
  | "live_dubbing"
  | "live_subtitles"
  | "live_trivia"
  | "catch_up"
  | "scene_search"
  | "phonetic_mirror"
  | "talk_back"
  | "interactive_mission"
  | "glossary"
  | "llm_search"
  | "proactive_voice"
  | "chatbot";

export type DiscoverCategoryId =
  | "watching_movies"
  | "watching_live_tv"
  | "learn_hebrew"
  | "search_discovery"
  | "chat_assistants";

export type Platform = "web" | "ios" | "tvos";

export type PrerequisiteType =
  | "avatar"
  | "subscription"
  | "microphone"
  | "contentType"
  | "preference"
  | "voiceClone";

export interface FeaturePrerequisite {
  type: PrerequisiteType;
  descriptionKey: string;
  fixRoute: string;
}

export interface WalkthroughStep {
  titleKey: string;
  bodyKey: string;
  imageUrl?: string;
  animationType?: "fade" | "slide" | "zoom";
}

export interface DiscoverFeature {
  id: DiscoverFeatureId;
  category: DiscoverCategoryId;
  nameKey: string;
  taglineKey: string;
  descriptionKey: string;
  iconName: string;
  platforms: Platform[];
  prerequisites: FeaturePrerequisite[];
  walkthroughSteps: WalkthroughStep[];
  deepLinkRoute?: string;
}

export interface DiscoverCategory {
  id: DiscoverCategoryId;
  nameKey: string;
  iconName: string;
  sortOrder: number;
  featureIds: DiscoverFeatureId[];
}

export type FeatureAvailability =
  | { state: "ready" }
  | { state: "setupNeeded"; unmet: FeaturePrerequisite[] }
  | { state: "premiumRequired" }
  | { state: "notAvailable"; reasonKey: string }
  | { state: "platformOnly"; platform: Platform };

export interface DiscoverFeatureConfig {
  feature_id: DiscoverFeatureId;
  enabled: boolean;
  demo_video_url: string;
  demo_thumbnail_url: string;
  walkthrough_content_id: string;
}
