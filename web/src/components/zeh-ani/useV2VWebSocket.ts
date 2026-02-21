import { useState, useRef, useCallback, useEffect } from "react";
import { buildWsUrl } from "@/services/wsUrl";
import logger from "@bayit/shared-utils/logger";
import { useAuthStore } from "@bayit/shared-stores/authStore";
import { useV2VStore } from "@/stores/v2vStore";
import type { V2VTransformResult } from "@/stores/v2vStore.types";

const wsLogger = logger.scope("V2VWebSocket");

const WS_RECONNECT_DELAY_MS = 3000;
const MAX_RECONNECT_ATTEMPTS = 5;

function getWebSocketUrl(avatarId: string): string {
  return buildWsUrl(`/api/v1/ws/v2v/${avatarId}`);
}

export interface V2VWebSocketHook {
  wsRef: React.RefObject<WebSocket | null>;
  wsResult: V2VTransformResult | null;
  setWsResult: React.Dispatch<React.SetStateAction<V2VTransformResult | null>>;
}

export function useV2VWebSocket(
  avatarId: string,
  onResult: (data: V2VTransformResult) => void,
): V2VWebSocketHook {
  const token = useAuthStore((s) => s.token);
  const [wsResult, setWsResult] = useState<V2VTransformResult | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectCountRef = useRef(0);

  const connectWebSocket = useCallback(() => {
    if (!token || wsRef.current?.readyState === WebSocket.OPEN) return;

    const url = getWebSocketUrl(avatarId);
    const ws = new WebSocket(url);

    ws.onopen = () => {
      reconnectCountRef.current = 0;
      ws.send(JSON.stringify({ type: "authenticate", token }));
      useV2VStore.setState({ wsConnected: true });
      wsLogger.info("V2V WebSocket connected", { avatarId });
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as V2VTransformResult;
        setWsResult(data);
        onResult(data);
        wsLogger.info("V2V result received via WebSocket", {
          scoreDelta: String(data.score_delta),
        });
      } catch (parseError) {
        wsLogger.error("Failed to parse WebSocket message", parseError);
      }
    };

    ws.onclose = () => {
      useV2VStore.setState({ wsConnected: false });
      if (reconnectCountRef.current < MAX_RECONNECT_ATTEMPTS) {
        reconnectCountRef.current += 1;
        setTimeout(connectWebSocket, WS_RECONNECT_DELAY_MS);
      }
    };

    ws.onerror = (wsError) => {
      wsLogger.error("V2V WebSocket error", wsError);
    };

    wsRef.current = ws;
  }, [avatarId, token, onResult]);

  useEffect(() => {
    connectWebSocket();
    return () => {
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [connectWebSocket]);

  return { wsRef, wsResult, setWsResult };
}
