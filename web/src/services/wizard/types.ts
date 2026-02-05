/**
 * Wizard Action Types
 * TypeScript interfaces for wizard action payloads
 */

export interface WizardAction {
  type: string;
  payload: WizardActionPayload;
}

export interface NavigatePayload {
  route?: string;
  path?: string;
  params?: Record<string, string>;
}

export interface SearchPayload {
  query?: string;
  results?: Array<{ content_id: string; title: string; content_type: string }>;
}

export interface PlayPayload {
  content_id: string;
  content_type: 'vod' | 'movie' | 'series' | 'live' | 'channel' | 'radio' | 'podcast' | 'audiobook';
  timestamp?: number;
}

export interface ScrollPayload {
  direction?: 'up' | 'down';
  target?: string;
}

export interface ControlPayload {
  command: string;
  value?: number;
}

export interface KidsContentPayload {
  items?: Array<{ content_id: string; title: string }>;
}

export interface SubtitlesPayload {
  language?: string;
  enabled?: boolean;
}

export interface PlaybackPayload {
  action: string;
  value?: number;
}

export type WizardActionPayload =
  | NavigatePayload
  | SearchPayload
  | PlayPayload
  | ScrollPayload
  | ControlPayload
  | KidsContentPayload
  | SubtitlesPayload
  | PlaybackPayload;
