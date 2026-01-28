/**
 * Native Modules Index
 * Exports native module wrappers for iOS and Android platforms
 * Provides unified API across platforms for voice, speech, TTS, audio, and auth features
 */

// Voice Recognition Module
export { voiceModule, type VoiceModuleType, type VoiceRecognitionEvent } from './VoiceModule'

// Speech Processing Module
export { speechModule, type SpeechProcessingResult } from './SpeechModule'

// Text-to-Speech Module
export { ttsModule, type TTSEvent } from './TTSModule'

// Live Dubbing Audio Module
export {
  LiveDubbingAudioPlayer,
  liveDubbingAudioPlayer,
  LiveDubbingAudioNativeModule,
} from './LiveDubbingAudioModule'

// Biometric Authentication Module
export { biometricAuthModule, type BiometricCheckResult, type BiometricAuthEvent } from './BiometricAuthModule'

// Secure Storage Module
export { secureStorageModule } from './SecureStorageModule'
