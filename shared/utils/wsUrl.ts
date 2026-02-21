/**
 * WebSocket URL builder for Bayit+ React Native apps.
 *
 * In production, routes all WS connections to the dedicated gateway (ws.bayit.tv).
 * In development, uses platform-appropriate localhost addresses.
 *
 * Usage:
 *   import { buildWsUrl } from '../utils/wsUrl'
 *   const url = buildWsUrl('/api/v1/ws/live/123/dubbing?lang=en')
 */

import { Platform } from "react-native";

declare const __DEV__: boolean;

/**
 * Returns the base WS URL for the current environment and platform.
 * No trailing slash.
 */
export function getWsBaseUrl(): string {
  if (!__DEV__) {
    return "wss://ws.bayit.tv";
  }
  if (Platform.OS === "web") {
    return "ws://localhost:8000";
  }
  if (Platform.OS === "android") {
    return "ws://10.0.2.2:8000";
  }
  return "ws://localhost:8000";
}

/**
 * Build a full WebSocket URL for the given path.
 *
 * @param path - WS path starting with / (e.g., '/api/v1/ws/live/123/chat')
 * @returns Full WebSocket URL string
 */
export function buildWsUrl(path: string): string {
  return `${getWsBaseUrl()}${path}`;
}
