/**
 * Type definitions for Backend Proxy Service (tvOS)
 * Extracted from backendProxyService.ts for file size compliance
 */

export interface TTSSynthesizeRequest {
  text: string;
  voice_id?: string;
  language_code?: string;
}

export interface TTSVoice {
  name: string;
  gender: string;
  accent: string;
  description: string;
}

export interface WakeWordDetectRequest {
  language_code?: string;
  sensitivity?: number;
}

export interface WakeWordDetectResponse {
  detected: boolean;
  confidence: number;
  wake_word?: string;
}

export interface WakeWordModel {
  name: string;
  language: string;
  description: string;
}

export interface AnalyticsEvent {
  event_name: string;
  event_category: string;
  properties?: Record<string, any>;
  timestamp?: string;
}

export interface AnalyticsResponse {
  success: boolean;
  event_id?: string;
  message?: string;
}

export interface VoiceCommandRequest {
  transcription: string;
  confidence: number;
  language: string;
}

export interface VoiceCommandResponse {
  success: boolean;
  commandType: string;
  action?: string;
  responseText: string;
  spokenResponse?: string;
  context?: Record<string, any>;
}

export interface HealthCheckResponse {
  status: string;
  service: string;
  credentials_configured?: boolean;
  message?: string;
  features?: string[];
}

export interface BatchTrackingResponse {
  total: number;
  tracked: number;
  failed: number;
  tracked_events: any[];
  failed_events: any[];
}
