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

// Secure Storage Service - OAuth tokens and sensitive credentials
export { secureStorageService } from './secureStorageService';
export type { OAuthCredentials } from './secureStorageService';

// Offline Cache Service - persistent content caching
export { offlineCacheService } from './offlineCacheService';

// Infrastructure Services (Phase 3)
export { storage } from './storage';
export { networkMonitor } from './network';
export { rtlService } from './rtl';
export { setupTrackPlayer, playbackService } from './trackPlayerService';

// Platform Services (Phase 4)
export { deepLinkingService } from './deepLinking';
export type { DeepLinkRoute } from './deepLinking';
export { pushNotificationService } from './pushNotifications';
export type { NotificationPayload, RemoteMessage } from './pushNotifications';

// Widget Service (WidgetKit)
export { widgetService } from './widgetService';
