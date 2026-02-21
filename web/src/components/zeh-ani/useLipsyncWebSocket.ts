import { useRef, useCallback, useEffect } from "react";
import { buildWsUrl } from "@/services/wsUrl";
import logger from "@bayit/shared-utils/logger";
import { useAuthStore } from "@bayit/shared-stores/authStore";
import { useLiveLayerStore } from "@/stores/liveLayerStore";
import type { LipsyncWeights } from "@/stores/liveLayerStore.types";

const wsLogger = logger.scope("LipsyncWebSocket");

const WS_RECONNECT_DELAY_MS = 3000;
const MAX_RECONNECT_ATTEMPTS = 5;

function getWebSocketUrl(contentId: string): string {
  return buildWsUrl(`/api/v1/ws/live-layer/${contentId}`);
}

export function useLipsyncWebSocket(
  contentId: string,
  avatarId: string,
  enabled: boolean,
) {
  const token = useAuthStore((s) => s.token);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectCountRef = useRef(0);

  const { setLipsyncWeights, setWsConnected } = useLiveLayerStore();

  const connectWebSocket = useCallback(() => {
    if (!token || !enabled || wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    const url = getWebSocketUrl(contentId);
    const ws = new WebSocket(url);

    ws.onopen = () => {
      reconnectCountRef.current = 0;
      ws.send(JSON.stringify({ type: "auth", token }));
      setWsConnected(true);
      wsLogger.info("Live layer WebSocket connected", { contentId });
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "authenticated") {
          ws.send(
            JSON.stringify({
              type: "start_lipsync",
              avatar_id: avatarId,
            }),
          );
          wsLogger.info("Authenticated, requesting lip-sync", { avatarId });
        } else if (data.type === "lipsync_weights") {
          const weights: LipsyncWeights = {
            timestamp: data.timestamp,
            weights: data.weights,
          };
          setLipsyncWeights(weights);
        } else if (data.type === "trigger_upcoming") {
          useLiveLayerStore.getState().setActiveTrigger(data);
        } else if (data.type === "trigger_result") {
          useLiveLayerStore.getState().setTriggerResult(data);
        }
      } catch (parseError) {
        wsLogger.error("Failed to parse WebSocket message", parseError);
      }
    };

    ws.onclose = () => {
      setWsConnected(false);
      setLipsyncWeights(null);
      if (reconnectCountRef.current < MAX_RECONNECT_ATTEMPTS) {
        reconnectCountRef.current += 1;
        setTimeout(connectWebSocket, WS_RECONNECT_DELAY_MS);
      }
    };

    ws.onerror = (wsError) => {
      wsLogger.error("Live layer WebSocket error", wsError);
    };

    wsRef.current = ws;
  }, [contentId, avatarId, token, enabled, setLipsyncWeights, setWsConnected]);

  useEffect(() => {
    connectWebSocket();
    return () => {
      wsRef.current?.close();
      wsRef.current = null;
      setWsConnected(false);
      setLipsyncWeights(null);
    };
  }, [connectWebSocket, setWsConnected, setLipsyncWeights]);

  const sendTimestampUpdate = useCallback((currentTime: number) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "timestamp_update",
          current_time: currentTime,
        }),
      );
    }
  }, []);

  return { sendTimestampUpdate };
}
