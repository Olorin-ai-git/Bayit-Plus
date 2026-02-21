/**
 * WebSocket URL builder for Bayit+ services.
 *
 * When VITE_WS_URL is set (e.g., wss://ws.bayit.tv), routes WS connections
 * to the dedicated gateway. Otherwise, falls back to same-origin (monolith).
 *
 * Usage:
 *   import { buildWsUrl } from '@/services/wsUrl'
 *   const url = buildWsUrl('/api/v1/ws/live/123/dubbing?lang=en')
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || "/api/v1";

/**
 * Build a WebSocket URL for the given path.
 *
 * @param path - WS path including /api/v1 prefix (e.g., '/api/v1/ws/live/123/chat')
 * @returns Full WebSocket URL string
 */
export function buildWsUrl(path: string): string {
  const wsGatewayUrl = import.meta.env.VITE_WS_URL;

  if (wsGatewayUrl) {
    // Dedicated gateway: wss://ws.bayit.tv + /api/v1/ws/...
    const base = wsGatewayUrl.replace(/\/$/, "");
    return `${base}${path}`;
  }

  // Same-origin fallback: derive from current page host
  const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const isRelativePath = API_BASE_URL.startsWith("/");
  const wsHost = isRelativePath
    ? window.location.host
    : API_BASE_URL.replace(/^https?:\/\//, "").replace(/\/api\/v1\/?$/, "");

  return `${wsProtocol}//${wsHost}${path}`;
}
