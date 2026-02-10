/**
 * Voice Batch Recorder
 * Handles microphone recording in batch mode (non-streaming)
 * Used as fallback when WebSocket streaming is not available
 */

import { EventEmitter } from 'eventemitter3';
import api from './api/client';
import { ttsService } from './ttsService';
import { supportConfig } from '../config/supportConfig';
import { useSupportStore, VoiceState } from '../stores/supportStore';
import { logger } from '../utils/logger';

const log = logger.scope('VoiceBatchRecorder');

interface BatchRecorderConfig {
  maxRecordingDuration: number;
  silenceTimeout: number;
  language: string;
  continuousListening: boolean;
}

export class VoiceBatchRecorder extends EventEmitter {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private recordingTimeout: NodeJS.Timeout | null = null;
  private silenceTimer: NodeJS.Timeout | null = null;
  private audioStream: MediaStream | null = null;
  private isRecording = false;
  private conversationId: string | null = null;
  private shouldStopListening = false;
  private containsStopKeywordFn: ((transcript: string) => boolean) | null = null;

  setStopKeywordChecker(fn: (transcript: string) => boolean): void {
    this.containsStopKeywordFn = fn;
  }

  setConversationId(id: string | null): void { this.conversationId = id; }
  getConversationId(): string | null { return this.conversationId; }
  getIsRecording(): boolean { return this.isRecording; }
  setShouldStopListening(value: boolean): void { this.shouldStopListening = value; }
  getShouldStopListening(): boolean { return this.shouldStopListening; }

  async startRecording(config: BatchRecorderConfig): Promise<void> {
    if (this.isRecording) return;
    this.shouldStopListening = false;
    try {
      this.emitStateChange('listening');
      this.audioStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      const mimeType = this.getSupportedMimeType();
      this.mediaRecorder = new MediaRecorder(this.audioStream, { mimeType });
      this.audioChunks = [];
      this.isRecording = true;
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) this.audioChunks.push(event.data);
      };
      this.mediaRecorder.onstop = () => this.processRecording(config);
      this.mediaRecorder.onerror = () => this.emit('error', new Error('Recording error'));
      this.mediaRecorder.start(250);
      this.recordingTimeout = setTimeout(() => this.stopRecording(), config.maxRecordingDuration);
    } catch (error) {
      this.emit('error', error instanceof Error ? error : new Error('Failed to start recording'));
    }
  }

  stopRecording(): void {
    if (!this.isRecording || !this.mediaRecorder) return;
    if (this.recordingTimeout) { clearTimeout(this.recordingTimeout); this.recordingTimeout = null; }
    if (this.silenceTimer) { clearTimeout(this.silenceTimer); this.silenceTimer = null; }
    this.isRecording = false;
    this.mediaRecorder.stop();
    if (this.audioStream) {
      this.audioStream.getTracks().forEach((track) => track.stop());
      this.audioStream = null;
    }
  }

  private async processRecording(config: BatchRecorderConfig): Promise<void> {
    if (this.audioChunks.length === 0) { this.emitStateChange('idle'); return; }
    try {
      this.emitStateChange('processing');
      const mimeType = this.getSupportedMimeType();
      const audioBlob = new Blob(this.audioChunks, { type: mimeType });
      this.audioChunks = [];
      if (audioBlob.size < 1000) { this.emitStateChange('idle'); return; }

      const transcript = await this.transcribeAudio(audioBlob, config.language);
      if (!transcript || transcript.trim().length === 0) { this.emitStateChange('idle'); return; }
      this.emit('transcriptUpdate', transcript);
      useSupportStore.getState().setCurrentTranscript(transcript);

      if (this.containsStopKeywordFn?.(transcript)) this.shouldStopListening = true;

      const response = await this.getAIResponse(transcript, config.language);
      if (response) {
        this.emit('responseReceived', response);
        useSupportStore.getState().setLastResponse(response);
        this.emitStateChange('speaking');
        await this.speakResponse(response);
      }
      this.handleContinuousListening(config);
    } catch (error) {
      this.emit('error', error instanceof Error ? error : new Error('Processing failed'));
    }
  }

  private handleContinuousListening(config: BatchRecorderConfig): void {
    const isMediaPlaying = this.isMediaCurrentlyPlaying();
    const shouldContinue = config.continuousListening &&
      useSupportStore.getState().isVoiceModalOpen && !this.shouldStopListening && !isMediaPlaying;
    if (shouldContinue) {
      this.emitStateChange('idle');
      setTimeout(() => {
        if (useSupportStore.getState().isVoiceModalOpen && !this.shouldStopListening) {
          this.emit('restartListening');
        }
      }, 500);
    } else {
      this.emitStateChange('idle');
      this.shouldStopListening = false;
    }
  }

  private async transcribeAudio(audioBlob: Blob, language: string): Promise<string> {
    const formData = new FormData();
    formData.append('audio', audioBlob, `recording.${this.getFileExtension()}`);
    formData.append('language', language);
    const data = await api.post('/chat/transcribe', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data.transcript || data.text || '';
  }

  private async getAIResponse(transcript: string, language: string): Promise<string> {
    const data = await api.post('/support/chat', {
      message: transcript, language, conversation_id: this.conversationId,
    });
    if (data.conversation_id) this.conversationId = data.conversation_id;
    return data.message || data.response || '';
  }

  private async speakResponse(text: string): Promise<void> {
    return new Promise((resolve, reject) => {
      ttsService.speak(text, 'high', { onComplete: () => resolve(), onError: (error: Error) => reject(error) });
    });
  }

  private getSupportedMimeType(): string {
    const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
    for (const type of types) { if (MediaRecorder.isTypeSupported(type)) return type; }
    return 'audio/webm';
  }

  private getFileExtension(): string {
    const mimeType = this.getSupportedMimeType();
    if (mimeType.includes('webm')) return 'webm';
    if (mimeType.includes('ogg')) return 'ogg';
    if (mimeType.includes('mp4')) return 'm4a';
    return 'webm';
  }

  private emitStateChange(state: VoiceState): void {
    useSupportStore.getState().setVoiceState(state);
    this.emit('stateChange', state);
  }

  isMediaCurrentlyPlaying(): boolean {
    if (typeof window === 'undefined') return false;
    const mediaElements = Array.from(
      document.querySelectorAll('audio, video')
    ) as (HTMLAudioElement | HTMLVideoElement)[];
    return mediaElements.some(el => !el.paused && !el.ended && el.readyState > 2 && el.currentTime > 0);
  }

  resetConversation(): void {
    this.conversationId = null;
    useSupportStore.getState().setCurrentTranscript('');
    useSupportStore.getState().setLastResponse('');
  }
}
