/**
 * voiceInteractionWSUrl
 *
 * Utility to construct the voice interaction WebSocket URL.
 * Uses centralized buildWsUrl to route through the WS gateway in production.
 */

import { buildWsUrl } from "@/services/wsUrl";

export const buildVoiceWsUrl = (sessionId: string): string => {
  return buildWsUrl(`/api/v1/ws/vod-interaction/${sessionId}`);
};
