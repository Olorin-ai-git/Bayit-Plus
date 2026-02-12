/**
 * Bilingual Dubbing WebSocket Service
 * Extends the bilingual dubbing store with real-time WebSocket audio streaming.
 * Connects to /ws/bilingual-dubbing/{contentId} for segment-by-segment dubbing.
 */

import logger from '@/utils/logger';

const AUTH_STORAGE_KEY = 'bayit-auth';

interface BilingualAudioSegment {
  mixed_text: string;
  hebrew_words_used: string[];
  language_segments: Array<{ text: string; language: 'he' | 'en' }>;
  audio_data: string;
  timestamp_seconds: number;
}

interface BilingualSessionInfo {
  session_id: string;
  target_hebrew_ratio: number;
  level: string;
}

interface BilingualDubbingCallbacks {
  onConnected: (session: BilingualSessionInfo) => void;
  onAudioSegment: (segment: BilingualAudioSegment) => void;
  onError: (message: string, recoverable: boolean) => void;
  onDisconnect: () => void;
}

class BilingualDubbingService {
  private ws: WebSocket | null = null;
  private isConnected = false;
  private playbackContext: AudioContext | null = null;

  async connect(
    contentId: string,
    profileId: string,
    callbacks: BilingualDubbingCallbacks,
  ): Promise<void> {
    const authData = JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY) || '{}');
    const token = authData?.state?.token;
    if (!token) {
      callbacks.onError('Not authenticated', false);
      return;
    }

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/api/v1/ws/bilingual-dubbing/${contentId}?profile_id=${profileId}`;

    this.ws = new WebSocket(wsUrl);
    this.playbackContext = new AudioContext();

    this.ws.onopen = () => {
      logger.debug('Bilingual WS connected, authenticating', 'bilingualDubbingService');
      this.ws?.send(JSON.stringify({ type: 'authenticate', token }));
      this.isConnected = true;
    };

    this.ws.onmessage = async (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'connected') {
          callbacks.onConnected(msg as BilingualSessionInfo);
        } else if (msg.type === 'audio_segment') {
          const segment = msg as BilingualAudioSegment;
          callbacks.onAudioSegment(segment);
          if (segment.audio_data) {
            await this.playAudio(segment.audio_data);
          }
        } else if (msg.type === 'error') {
          callbacks.onError(msg.message, msg.recoverable ?? true);
        }
      } catch (error) {
        logger.error('Bilingual WS parse error', 'bilingualDubbingService', error);
      }
    };

    this.ws.onerror = () => {
      callbacks.onError('Connection error', true);
      this.isConnected = false;
    };

    this.ws.onclose = () => {
      this.isConnected = false;
      callbacks.onDisconnect();
    };
  }

  sendSegment(hebrewText: string, timestampSeconds: number): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'translate_segment',
        hebrew_text: hebrewText,
        timestamp_seconds: timestampSeconds,
      }));
    }
  }

  private async playAudio(base64Audio: string): Promise<void> {
    if (!this.playbackContext) return;

    try {
      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const audioBuffer = await this.playbackContext.decodeAudioData(bytes.buffer);
      const source = this.playbackContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.playbackContext.destination);
      source.start();
    } catch (error) {
      logger.error('Error playing bilingual audio', 'bilingualDubbingService', error);
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    if (this.playbackContext) {
      this.playbackContext.close();
      this.playbackContext = null;
    }
    this.isConnected = false;
    logger.debug('Bilingual dubbing disconnected', 'bilingualDubbingService');
  }

  isServiceConnected(): boolean {
    return this.isConnected && this.ws?.readyState === WebSocket.OPEN;
  }
}

export type { BilingualAudioSegment, BilingualSessionInfo, BilingualDubbingCallbacks };
export default new BilingualDubbingService();
