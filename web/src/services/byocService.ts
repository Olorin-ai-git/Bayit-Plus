/**
 * BYOC (Bring Your Own Content) Service
 *
 * API client for BYOC source enrichment and normalization endpoints.
 */

import { api } from "@bayit/shared-services/api";

interface EnrichResult {
  channel_count: number;
  source_name: string;
}

interface NormalizeResult {
  job_id: string;
}

interface NormalizationStatus {
  status: string;
  stage: string;
  progress: number;
  total_channels: number;
  matched_channels: number;
  unmatched_channels: number;
}

interface Provider {
  id: string;
  name: string;
  logo_url: string;
  type: string;
  setup_url: string;
}

export const byocService = {
  enrich: (url: string): Promise<EnrichResult> =>
    api.post("/byoc/enrich", { url }),

  normalize: (url: string): Promise<NormalizeResult> =>
    api.post("/byoc/normalize", { url }),

  getProviders: (): Promise<{ providers: Provider[] }> =>
    api.get("/byoc/providers"),

  getNormalizationStatus: (jobId: string): Promise<NormalizationStatus> =>
    api.get(`/byoc/normalize/${jobId}/status`),

  applyNormalization: (
    jobId: string,
    excludedChannels: string[],
  ): Promise<void> =>
    api.post(`/byoc/normalize/${jobId}/apply`, {
      excluded_channels: excludedChannels,
    }),
};
