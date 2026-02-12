/**
 * Talk Back WebSocket Service
 * Manages real-time voice streaming for Talk Back interactions.
 * Connects to /ws/talk-back/{contentId} for audio capture and evaluation.
 */

import logger from '@/utils/logger';

const AUTH_STORAGE_KEY = 'bayit-auth';

interface TalkBackEvaluation {
  quality: string;
  accuracy_score: number;
  shekels_earned: number;
  points_earned: number;
  feedback_text: string;
  feedback_text_he: string;
  detected_language: string;
  hint_used: boolean;
}

interface TalkBackServiceCallbacks {
  onConnected: (sessionId: string) => void;
  onEvaluation: (result: TalkBackEvaluation) => void;
  onError: (message: string, recoverable: boolean) => void;
  onDisconnect: () => void;
}

class TalkBackService {
  private ws: WebSocket | null = null;
  private isConnected = false;
  private mediaRecorder: MediaRecorder | null = null;
  private audioStream: MediaStream | null = null;

  async connect(
    contentId: string,
    profileId: string,
    callbacks: TalkBackServiceCallbacks,
  ): Promise<void> {
    const authData = JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY) || '{}');
    const token = authData?.state?.token;
    if (!token) {
      callbacks.onError('Not authenticated', false);
      return;
    }

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/api/v1/ws/talk-back/${contentId}?profile_id=${profileId}`;

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      logger.debug('Talk Back WS connected, authenticating', 'talkBackService');
      this.ws?.send(JSON.stringify({ type: 'authenticate', token }));
      this.isConnected = true;
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'connected') {
          callbacks.onConnected(msg.session_id);
        } else if (msg.type === 'evaluation') {
          callbacks.onEvaluation(msg as TalkBackEvaluation);
        } else if (msg.type === 'error') {
          callbacks.onError(msg.message, msg.recoverable ?? true);
        }
      } catch (error) {
        logger.error('Talk Back WS parse error', 'talkBackService', error);
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

  async startRecording(pointId: string): Promise<void> {
    if (!this.ws || !this.isConnected) return;

    try {
      this.audioStream = await navigator.mediaDevices.getUserMedia({
        audio: { sampleRate: 16000, channelCount: 1 },
      });

      this.mediaRecorder = new MediaRecorder(this.audioStream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      this.ws.send(JSON.stringify({ type: 'start_recording', point_id: pointId }));

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && this.ws?.readyState === WebSocket.OPEN) {
          this.ws.send(event.data);
        }
      };

      this.mediaRecorder.start(250);
      logger.info('Talk Back recording started', 'talkBackService');
    } catch (error) {
      logger.error('Failed to start recording', 'talkBackService', error);
    }
  }

  stopRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }

    if (this.audioStream) {
      this.audioStream.getTracks().forEach((track) => track.stop());
      this.audioStream = null;
    }

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'stop_recording' }));
    }

    this.mediaRecorder = null;
    logger.info('Talk Back recording stopped', 'talkBackService');
  }

  requestHint(pointId: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'request_hint', point_id: pointId }));
    }
  }

  disconnect(): void {
    this.stopRecording();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
    logger.debug('Talk Back disconnected', 'talkBackService');
  }

  isServiceConnected(): boolean {
    return this.isConnected && this.ws?.readyState === WebSocket.OPEN;
  }
}

export type { TalkBackEvaluation, TalkBackServiceCallbacks };
export default new TalkBackService();
