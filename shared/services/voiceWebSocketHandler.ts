/**
 * Voice WebSocket Handler
 * Manages WebSocket connection lifecycle, message parsing, and server message routing
 * for the streaming voice pipeline
 */

import { useSupportStore } from '../stores/supportStore';
import { StreamingAudioPlayer } from './streamingAudioPlayer';
import { logger } from '../utils/logger';

const log = logger.scope('VoiceWebSocket');

interface ServerMessage {
  type: 'transcript_partial' | 'transcript_final' | 'llm_chunk' | 'tts_audio'
    | 'complete' | 'cancelled' | 'error' | 'pong';
  text?: string;
  data?: string;
  language?: string;
  conversation_id?: string;
  escalation_needed?: boolean;
  message?: string;
}

interface ClientMessage {
  type: 'audio' | 'commit' | 'cancel' | 'ping';
  data?: string;
  reason?: string;
}

export interface WebSocketCallbacks {
  onConnected: () => void;
  onDisconnected: (code: number) => void;
  onTranscriptPartial: (text: string, language: string) => void;
  onTranscriptFinal: (text: string, language: string) => void;
  onLlmChunk: (text: string) => void;
  onTtsAudio: (audioData: ArrayBuffer) => void;
  onComplete: (conversationId: string, escalationNeeded: boolean, responseText: string) => void;
  onCancelled: () => void;
  onError: (error: Error) => void;
}

export class VoiceWebSocketHandler {
  private ws: WebSocket | null = null;
  private pingInterval: NodeJS.Timeout | null = null;
  private currentResponse = '';

  connect(url: string, callbacks: WebSocketCallbacks): void {
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.pingInterval = setInterval(() => { this.send({ type: 'ping' }); }, 30000);
      callbacks.onConnected();
    };

    this.ws.onmessage = (event) => {
      try {
        const message: ServerMessage = JSON.parse(event.data);
        this.handleMessage(message, callbacks);
      } catch (error) {
        log.warn('Failed to parse server message', { error });
      }
    };

    this.ws.onerror = () => { callbacks.onError(new Error('WebSocket connection error')); };
    this.ws.onclose = (event) => { this.cleanupPing(); callbacks.onDisconnected(event.code); };
  }

  private handleMessage(message: ServerMessage, callbacks: WebSocketCallbacks): void {
    switch (message.type) {
      case 'transcript_partial':
        if (message.text) callbacks.onTranscriptPartial(message.text, message.language || 'auto');
        break;
      case 'transcript_final':
        if (message.text) callbacks.onTranscriptFinal(message.text, message.language || 'auto');
        break;
      case 'llm_chunk':
        if (message.text) {
          this.currentResponse += message.text;
          callbacks.onLlmChunk(message.text);
        }
        break;
      case 'tts_audio':
        if (message.data) {
          const binaryString = atob(message.data);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
          callbacks.onTtsAudio(bytes.buffer);
        }
        break;
      case 'complete':
        callbacks.onComplete(message.conversation_id || '', message.escalation_needed || false, this.currentResponse);
        this.currentResponse = '';
        break;
      case 'cancelled':
        callbacks.onCancelled();
        break;
      case 'error':
        callbacks.onError(new Error(message.message || 'Server error'));
        break;
      case 'pong':
        break;
    }
  }

  send(message: ClientMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  sendAudio(base64Data: string): void {
    this.send({ type: 'audio', data: base64Data });
  }

  close(code = 1000, reason = 'User stopped interaction'): void {
    this.cleanupPing();
    if (this.ws) { this.ws.close(code, reason); this.ws = null; }
  }

  private cleanupPing(): void {
    if (this.pingInterval) { clearInterval(this.pingInterval); this.pingInterval = null; }
  }

  isOpen(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

export default VoiceWebSocketHandler;
