import { buildWsUrl } from "@/services/wsUrl";
import logger from "@bayit/shared-utils/logger";

const wsLogger = logger.scope("DMWebSocket");
const AUTH_STORAGE_KEY = "bayit-auth";

let ws: WebSocket | null = null;

function getAuthToken(): string | null {
  const raw = localStorage.getItem(AUTH_STORAGE_KEY) || "{}";
  return JSON.parse(raw)?.state?.token ?? null;
}

export function connectDMWebSocket(
  friendId: string,
  onMessage: (data: unknown) => void,
) {
  disconnectDMWebSocket();
  const token = getAuthToken();
  if (!token) return;

  const wsUrl = buildWsUrl(`/api/v1/ws/dm/${friendId}`);
  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    ws?.send(JSON.stringify({ type: "authenticate", token }));
    wsLogger.info("DM WebSocket connected", { friendId });
  };

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      if (msg.type === "dm_message") {
        onMessage(msg.data);
      } else if (msg.type === "ping") {
        ws?.send(JSON.stringify({ type: "pong" }));
      }
    } catch (err) {
      wsLogger.error("WS message parse error", { err });
    }
  };

  ws.onclose = () => wsLogger.info("DM WebSocket disconnected");
  ws.onerror = () => wsLogger.error("DM WebSocket error");
}

export function disconnectDMWebSocket() {
  if (ws) {
    ws.close();
    ws = null;
  }
}
