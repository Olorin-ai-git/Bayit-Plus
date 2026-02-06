/**
 * Voice WebSocket Handler
 * Manages WebSocket connection lifecycle, message parsing, and server message routing
 * for the streaming voice pipeline
 */

import { logger } from '../utils/logger';

const log = logger.scope('VoiceWebSocket');

/** Valid server message types */
const VALID_SERVER_MESSAGE_TYPES = new Set([
  'transcript_partial', 'transcript_final', 'llm_chunk', 'tts_audio',
  'intent_action', 'complete', 'cancelled', 'error', 'pong',
]);

/** Base64 validation pattern - checks for valid base64 characters */
const BASE64_PATTERN = /^[A-Za-z0-9+/]*={0,2}$/;

interface ServerMessage {
  type: 'transcript_partial' | 'transcript_final' | 'llm_chunk' | 'tts_audio'
    | 'intent_action' | 'complete' | 'cancelled' | 'error' | 'pong';
  text?: string;
  data?: string;
  language?: string;
  conversation_id?: string;
  escalation_needed?: boolean;
  message?: string;
  intent?: string;
  action?: { type: string; payload: Record<string, unknown> };
  confidence?: number;
  gesture?: { gesture: string; duration?: number };
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
  onIntentAction: (intent: string, action: { type: string; payload: Record<string, unknown> }, spokenResponse: string, confidence: number) => void;
  onComplete: (conversationId: string, escalationNeeded: boolean, responseText: string) => void;
  onCancelled: () => void;
  onError: (error: Error) => void;
}

export class VoiceWebSocketHandler {
  private ws: WebSocket | null = null;
  private pingInterval: NodeJS.Timeout | null = null;
  private currentResponse = '';

  connect(url: string, callbacks: WebSocketCallbacks): void {
    // Close any existing connection to prevent zombie WebSockets
    if (this.ws) {
      this.cleanupPing();
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws.onmessage = null;
      this.ws.onopen = null;
      try { this.ws.close(1000, 'Reconnecting'); } catch { /* already closed */ }
      this.ws = null;
    }
    this.currentResponse = '';
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.pingInterval = setInterval(() => { this.send({ type: 'ping' }); }, 30000);
      callbacks.onConnected();
    };

    this.ws.onmessage = (event) => {
      try {
        const raw = JSON.parse(event.data);
        const message = this.validateMessage(raw);
        if (message) {
          this.handleMessage(message, callbacks);
        }
      } catch (error) {
        log.warn('Failed to parse server message', { error });
      }
    };

    this.ws.onerror = () => { callbacks.onError(new Error('WebSocket connection error')); };
    this.ws.onclose = (event) => { this.cleanupPing(); callbacks.onDisconnected(event.code); };
  }

  /** Validate incoming WebSocket message structure */
  private validateMessage(raw: unknown): ServerMessage | null {
    if (!raw || typeof raw !== 'object') {
      log.warn('Rejected non-object message');
      return null;
    }

    const msg = raw as Record<string, unknown>;

    // Validate type field exists and is a known type
    if (typeof msg.type !== 'string' || !VALID_SERVER_MESSAGE_TYPES.has(msg.type)) {
      log.warn('Rejected message with invalid type', { type: msg.type });
      return null;
    }

    // Validate text fields are strings when present
    if (msg.text !== undefined && typeof msg.text !== 'string') {
      log.warn('Rejected message with non-string text field', { type: msg.type });
      return null;
    }

    // Validate data field (base64 audio) is a string when present
    if (msg.data !== undefined && typeof msg.data !== 'string') {
      log.warn('Rejected message with non-string data field', { type: msg.type });
      return null;
    }

    // For tts_audio, validate base64 encoding
    if (msg.type === 'tts_audio' && msg.data) {
      if (!BASE64_PATTERN.test(msg.data as string)) {
        log.warn('Rejected tts_audio with invalid base64 data');
        return null;
      }
    }

    // Validate language field if present
    if (msg.language !== undefined && typeof msg.language !== 'string') {
      log.warn('Rejected message with non-string language field', { type: msg.type });
      return null;
    }

    // Validate intent_action message structure
    if (msg.type === 'intent_action') {
      if (typeof msg.intent !== 'string' || typeof msg.text !== 'string') {
        log.warn('Rejected intent_action with missing intent or text');
        return null;
      }
      const action = msg.action as Record<string, unknown> | undefined;
      if (!action || typeof action.type !== 'string' || typeof action.payload !== 'object' || action.payload === null) {
        log.warn('Rejected intent_action with invalid action structure');
        return null;
      }
    }

    return msg as unknown as ServerMessage;
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
      case 'intent_action':
        if (message.intent && message.action?.type && message.action?.payload && message.text) {
          callbacks.onIntentAction(
            message.intent,
            message.action as { type: string; payload: Record<string, unknown> },
            message.text,
            message.confidence ?? 0,
          );
        } else {
          log.warn('Rejected intent_action with missing required fields');
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
