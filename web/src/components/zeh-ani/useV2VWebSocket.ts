import { useState, useRef, useCallback, useEffect } from "react";
import i18n from "i18next";
import { buildWsUrl } from "@/services/wsUrl";
import logger from "@bayit/shared-utils/logger";
import { useAuthStore } from "@bayit/shared-stores/authStore";
import { useV2VStore } from "@/stores/v2vStore";
import { v2vResultSchema, v2vErrorText } from "@/stores/v2vData";
import type { V2VTransformResult } from "@/stores/v2vStore.types";

const wsLogger = logger.scope("V2VWebSocket");

const WS_RECONNECT_DELAY_MS = 3000;
const MAX_RECONNECT_ATTEMPTS = 5;

function getWebSocketUrl(avatarId: string): string {
  return buildWsUrl(`/api/v1/ws/v2v/${encodeURIComponent(avatarId)}`);
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
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connectWebSocket = useCallback(() => {
    if (!token || wsRef.current?.readyState === WebSocket.OPEN) return;

    const url = getWebSocketUrl(avatarId);
    const ws = new WebSocket(url);

    ws.onopen = () => {
      if (wsRef.current !== ws) { ws.close(); return; }
      ws.send(JSON.stringify({ type: "authenticate", token }));
      wsLogger.info("V2V WebSocket connected", { avatarId });
    };

    ws.onmessage = (event) => {
      if (wsRef.current !== ws) return;
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'authenticated') {
          reconnectCountRef.current = 0;
          useV2VStore.setState({ wsConnected: true });
          return;
        }
        if (data.type === 'error') {
          useV2VStore.setState({ error: v2vErrorText(data, i18n.t('zehAni.v2v.errors.transformFailed')) });
          return;
        }
        if (data.type !== 'v2v_result') return;
        v2vResultSchema.parse(data);
        setWsResult(data);
        onResult(data);
        wsLogger.info("V2V result received via WebSocket", {
          scoreDelta: String(data.score_delta),
        });
      } catch (parseError) {
        useV2VStore.setState({ error: i18n.t('zehAni.v2v.errors.transformFailed') });
        wsLogger.error("Failed to parse WebSocket message", parseError);
      }
    };

    ws.onclose = (event) => {
      if (wsRef.current !== ws) return;
      wsRef.current = null;
      useV2VStore.setState(state => ({ wsConnected: false, error: state.error || i18n.t('zehAni.v2v.errors.transformFailed') }));
      if (event.code >= 4000 && event.code < 5000) return;
      if (reconnectCountRef.current < MAX_RECONNECT_ATTEMPTS) {
        reconnectCountRef.current += 1;
        reconnectTimerRef.current = setTimeout(connectWebSocket, WS_RECONNECT_DELAY_MS);
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
      const ws = wsRef.current;
      wsRef.current = null;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      ws?.close();
      useV2VStore.setState({ wsConnected: false });
    };
  }, [connectWebSocket]);

  return { wsRef, wsResult, setWsResult };
}
