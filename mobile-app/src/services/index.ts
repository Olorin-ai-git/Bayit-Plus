/**
 * Services Export
 */

export { speechService } from './speech';
export type { SpeechRecognitionResult, SpeechPermissions } from './speech';

export { wakeWordService } from './wakeWord';
export type { WakeWordDetection } from './wakeWord';

export { ttsService } from './tts';
export type { TTSOptions, Voice } from './tts';

export { widgetKitService } from './widgetKit';
export type { WidgetData, WidgetInfo } from './widgetKit';

export { siriService } from './siri';

export { carPlayService } from './carPlay';

// Backend Proxy Service - for secure third-party API credential management
export { backendProxyService } from './backendProxyService';
export type {
  TTSSynthesizeRequest,
  TTSVoice,
  WakeWordDetectRequest,
  WakeWordDetectResponse,
  WakeWordModel,
  AnalyticsEvent,
  AnalyticsResponse,
} from './backendProxyService';
