/**
 * Discover Service
 *
 * API client for Discover feature configuration and walkthrough tracking endpoints.
 */

import { api } from "@bayit/shared-services/api";
import type {
  DiscoverFeatureId,
  DiscoverFeatureConfig,
} from "@/data/discoverTypes";

interface DiscoverConfigResponse {
  features: DiscoverFeatureConfig[];
}

interface CharGenStatusResponse {
  free_remaining: number;
  free_limit: number;
}

export const discoverService = {
  getConfig: (): Promise<DiscoverConfigResponse> => api.get("/discover/config"),

  getCharacterGenStatus: (): Promise<CharGenStatusResponse> =>
    api.get("/discover/char-gen/status"),

  completeWalkthrough: (
    featureId: DiscoverFeatureId,
    stepsCompleted: number,
    skipped: boolean,
  ): Promise<void> =>
    api.post("/discover/walkthrough/complete", {
      feature_id: featureId,
      steps_completed: stepsCompleted,
      skipped,
    }),
};
