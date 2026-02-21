/**
 * Live Split Subtitle Service
 * Manages two parallel WebSocket connections for dual-language live translation
 */

/// <reference types="vite/client" />

import logger from "@/utils/logger";
import { buildWsUrl } from "./wsUrl";
import i18n from "i18next";
import { liveSubtitleConfig } from "@/config/liveSubtitleConfig";
import { LiveSubtitleCue } from "@/types/subtitle";

// API configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || "/api/v1";

type SubtitleCallback = (
  cue: LiveSubtitleCue,
  position: "primary" | "secondary",
) => void;
type ErrorCallback = (error: string, position: "primary" | "secondary") => void;
type StatusCallback = (
  status: "connecting" | "connected" | "disconnected" | "error",
  position: "primary" | "secondary",
) => void;

interface ConnectionState {
  ws: WebSocket | null;
  audioContext: AudioContext | null;
  mediaStreamSource: MediaStreamAudioSourceNode | null;
  processor: ScriptProcessorNode | null;
  heartbeatInterval: ReturnType<typeof setInterval> | null;
  lastMessageTime: number;
  isConnected: boolean;
}

class LiveSplitSubtitleService {
  private primary: ConnectionState = this.createEmptyState();
  private secondary: ConnectionState = this.createEmptyState();
  private sharedAudioContext: AudioContext | null = null;
  private sharedMediaStream: MediaStream | null = null;

  private createEmptyState(): ConnectionState {
    return {
      ws: null,
      audioContext: null,
      mediaStreamSource: null,
      processor: null,
      heartbeatInterval: null,
      lastMessageTime: Date.now(),
      isConnected: false,
    };
  }

  /**
   * Connect to both primary and secondary language streams
   */
  async connect(
    channelId: string,
    primaryTargetLang: string,
    secondaryTargetLang: string,
    videoElement: HTMLVideoElement,
    onSubtitle: SubtitleCallback,
    onError: ErrorCallback,
    onStatus?: StatusCallback,
    sourceLang: string = "he",
    hebrewMode: "regular" | "nikud" | "shoresh" = "regular",
  ): Promise<void> {
    // Clean up any existing connections first
    this.disconnect();

    const authData = JSON.parse(localStorage.getItem("bayit-auth") || "{}");
    const token = authData?.state?.token;
    if (!token) {
      throw new Error("Not authenticated");
    }

    // Capture audio stream from video element (shared between both connections)
    try {
      this.sharedMediaStream = await this.captureVideoAudio(videoElement);
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : "Audio capture failed";
      logger.error(
        "Failed to capture video audio",
        "liveSplitSubtitleService",
        error,
      );
      throw new Error(errorMsg);
    }

    // Connect to both language streams in parallel
    await Promise.all([
      this.connectToStream(
        "primary",
        channelId,
        primaryTargetLang,
        token,
        onSubtitle,
        onError,
        onStatus,
        sourceLang,
        hebrewMode,
      ),
      this.connectToStream(
        "secondary",
        channelId,
        secondaryTargetLang,
        token,
        onSubtitle,
        onError,
        onStatus,
        sourceLang,
        hebrewMode,
      ),
    ]);

    // Start audio processing for both streams
    this.startAudioProcessing();
  }

  /**
   * Capture audio directly from video element
   */
  private async captureVideoAudio(
    videoElement: HTMLVideoElement,
  ): Promise<MediaStream> {
    const captureMethod =
      (videoElement as any).captureStream ||
      (videoElement as any).mozCaptureStream;
    if (!captureMethod) {
      throw new Error(
        "captureStream() not supported - cannot capture video audio directly",
      );
    }

    const stream = captureMethod.call(videoElement);
    if (!stream) {
      throw new Error(
        "captureStream() returned null - video may have CORS restrictions",
      );
    }

    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) {
      throw new Error("No audio tracks available from video element");
    }

    logger.debug(
      `Video stream captured with ${audioTracks.length} audio track(s)`,
      "liveSplitSubtitleService",
    );
    return stream;
  }

  /**
   * Connect to a single language stream
   */
  private connectToStream(
    position: "primary" | "secondary",
    channelId: string,
    targetLang: string,
    token: string,
    onSubtitle: SubtitleCallback,
    onError: ErrorCallback,
    onStatus?: StatusCallback,
    sourceLang: string = "he",
    hebrewMode: "regular" | "nikud" | "shoresh" = "regular",
  ): Promise<void> {
    const state = position === "primary" ? this.primary : this.secondary;

    return new Promise((resolve, reject) => {
      try {
        onStatus?.("connecting", position);

        const wsUrl = buildWsUrl(
          `/api/v1/ws/live/${channelId}/subtitles?source_lang=${sourceLang}&target_lang=${targetLang}&hebrew_mode=${hebrewMode}`,
        );

        state.ws = new WebSocket(wsUrl);

        const connectionTimeout = setTimeout(() => {
          if (!state.isConnected) {
            logger.error(
              `Connection timeout for ${position}`,
              "liveSplitSubtitleService",
            );
            this.disconnectStream(position);
            onStatus?.("error", position);
            reject(new Error("Connection timeout"));
          }
        }, liveSubtitleConfig.connectionTimeoutMs);

        state.ws.onopen = () => {
          logger.debug(
            `WebSocket connected for ${position}, sending authentication`,
            "liveSplitSubtitleService",
          );
          if (state.ws && state.ws.readyState === WebSocket.OPEN) {
            state.ws.send(JSON.stringify({ type: "authenticate", token }));
          }
        };

        state.ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            state.lastMessageTime = Date.now();

            if (msg.type === "ping") {
              state.ws?.send(
                JSON.stringify({ type: "pong", timestamp: Date.now() }),
              );
              return;
            }

            if (msg.type === "connected") {
              logger.info(
                `Live split subtitles connected (${position}): ${msg.source_lang} → ${msg.target_lang}`,
                "liveSplitSubtitleService",
              );
              state.isConnected = true;
              clearTimeout(connectionTimeout);
              onStatus?.("connected", position);

              // Start heartbeat monitoring
              state.heartbeatInterval = setInterval(() => {
                const timeSinceLastMessage = Date.now() - state.lastMessageTime;
                if (
                  timeSinceLastMessage >
                  liveSubtitleConfig.staleConnectionTimeoutMs
                ) {
                  logger.warn(
                    `Stale connection for ${position}`,
                    "liveSplitSubtitleService",
                  );
                  this.disconnectStream(position);
                  onStatus?.("error", position);
                  onError(
                    "Connection timeout - no activity detected",
                    position,
                  );
                }
              }, liveSubtitleConfig.heartbeatCheckIntervalMs);

              resolve();
            } else if (
              msg.type === "final_subtitle" ||
              msg.type === "subtitle"
            ) {
              // Skip partial subtitles
              if (
                msg.type === "partial_subtitle" ||
                msg.data?.is_partial === true
              ) {
                return;
              }
              onSubtitle(msg.data, position);
            } else if (msg.type === "quota_exceeded") {
              logger.error(
                `Quota exceeded for ${position}`,
                "liveSplitSubtitleService",
              );
              clearTimeout(connectionTimeout);
              onStatus?.("error", position);
              onError(`Usage limit reached: ${msg.message}`, position);
              this.disconnectStream(position);
              reject(new Error(msg.message));
            } else if (msg.type === "error") {
              const isRecoverable = msg.recoverable !== false;
              logger.error(
                `Server error for ${position}: ${msg.message}`,
                "liveSplitSubtitleService",
              );
              clearTimeout(connectionTimeout);
              if (!isRecoverable) {
                onStatus?.("error", position);
                onError(msg.message, position);
                this.disconnectStream(position);
                reject(new Error(msg.message));
              }
            }
          } catch (error) {
            logger.error(
              `Message handling error for ${position}`,
              "liveSplitSubtitleService",
              error,
            );
          }
        };

        state.ws.onerror = () => {
          logger.error(
            `WebSocket error for ${position}`,
            "liveSplitSubtitleService",
          );
          clearTimeout(connectionTimeout);
          onStatus?.("error", position);
          onError(i18n.t("errors.connection.error"), position);
          state.isConnected = false;
          reject(new Error(i18n.t("errors.connection.error")));
        };

        state.ws.onclose = () => {
          clearTimeout(connectionTimeout);
          state.isConnected = false;
          onStatus?.("disconnected", position);
        };
      } catch (error) {
        onStatus?.("error", position);
        reject(error);
      }
    });
  }

  /**
   * Start audio processing and send to both WebSocket connections
   */
  private startAudioProcessing(): void {
    if (!this.sharedMediaStream) {
      logger.error(
        "No shared media stream available",
        "liveSplitSubtitleService",
      );
      return;
    }

    try {
      this.sharedAudioContext = new AudioContext({
        sampleRate: liveSubtitleConfig.sampleRate,
      });
      const source = this.sharedAudioContext.createMediaStreamSource(
        this.sharedMediaStream,
      );
      const processor = this.sharedAudioContext.createScriptProcessor(
        2048,
        1,
        1,
      );

      let chunkCount = 0;

      processor.onaudioprocess = (e) => {
        const primaryReady = this.primary.ws?.readyState === WebSocket.OPEN;
        const secondaryReady = this.secondary.ws?.readyState === WebSocket.OPEN;

        if (!primaryReady && !secondaryReady) {
          return;
        }

        const inputData = e.inputBuffer.getChannelData(0);

        // Convert float32 to int16 PCM
        const int16Data = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }

        // Send to both connections
        if (primaryReady) {
          this.primary.ws?.send(int16Data.buffer);
        }
        if (secondaryReady) {
          this.secondary.ws?.send(int16Data.buffer);
        }

        chunkCount++;
        if (chunkCount % 100 === 0) {
          logger.debug(
            `Sent ${chunkCount} chunks to split streams`,
            "liveSplitSubtitleService",
          );
        }
      };

      source.connect(processor);
      processor.connect(this.sharedAudioContext.destination);

      logger.debug(
        "Audio processing started for split streams",
        "liveSplitSubtitleService",
      );
    } catch (error) {
      logger.error(
        "Failed to start audio processing",
        "liveSplitSubtitleService",
        error,
      );
    }
  }

  /**
   * Disconnect a single stream
   */
  private disconnectStream(position: "primary" | "secondary"): void {
    const state = position === "primary" ? this.primary : this.secondary;

    if (state.heartbeatInterval) {
      clearInterval(state.heartbeatInterval);
      state.heartbeatInterval = null;
    }

    if (state.ws) {
      state.ws.close();
      state.ws = null;
    }

    state.isConnected = false;
  }

  /**
   * Disconnect all streams and clean up
   */
  disconnect(): void {
    this.disconnectStream("primary");
    this.disconnectStream("secondary");

    if (this.sharedAudioContext) {
      this.sharedAudioContext.close();
      this.sharedAudioContext = null;
    }

    this.sharedMediaStream = null;
    this.primary = this.createEmptyState();
    this.secondary = this.createEmptyState();
  }

  /**
   * Check if both streams are connected
   */
  isFullyConnected(): boolean {
    return this.primary.isConnected && this.secondary.isConnected;
  }

  /**
   * Check if any stream is connected
   */
  isPartiallyConnected(): boolean {
    return this.primary.isConnected || this.secondary.isConnected;
  }

  /**
   * Check connection status for a specific stream
   */
  isStreamConnected(position: "primary" | "secondary"): boolean {
    const state = position === "primary" ? this.primary : this.secondary;
    return (
      state.isConnected &&
      state.ws !== null &&
      state.ws.readyState === WebSocket.OPEN
    );
  }
}

export default new LiveSplitSubtitleService();
