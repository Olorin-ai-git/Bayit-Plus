/**
 * Voice Processor Service
 * Processes voice commands and detects intent
 */

import { detectIntent, extractParameters } from './intentDetector';
import type {
  VoiceCommand,
  VoiceProcessorConfig,
  ProcessedCommand
} from './types';

export class VoiceProcessor {
  private config: VoiceProcessorConfig;
  private commandHistory: VoiceCommand[] = [];

  constructor(config: Partial<VoiceProcessorConfig> = {}) {
    this.config = {
      language: config.language || 'en-US',
      confidenceThreshold: config.confidenceThreshold || 0.7,
      enableIntentDetection: config.enableIntentDetection ?? true,
      enableCommandHistory: config.enableCommandHistory ?? true,
      maxHistoryLength: config.maxHistoryLength || 50
    };
  }

  /**
   * Process voice command
   */
  processCommand(command: VoiceCommand): ProcessedCommand {
    // Add to history if enabled
    if (this.config.enableCommandHistory) {
      this.addToHistory(command);
    }

    // Check confidence threshold
    if (command.confidence < this.config.confidenceThreshold) {
      return {
        command,
        intent: { action: 'unknown', query: command.transcript },
        shouldExecute: false,
        reason: 'Low confidence in voice recognition'
      };
    }

    // Detect intent if enabled
    const intent = this.config.enableIntentDetection
      ? detectIntent(command.transcript)
      : { action: 'unknown' as const, query: command.transcript };

    // Extract parameters
    const parameters = extractParameters(command.transcript, intent.action);
    intent.parameters = parameters;

    // Determine if command should execute
    const shouldExecute = this.shouldExecuteCommand(command, intent);

    return {
      command,
      intent,
      shouldExecute,
      reason: shouldExecute ? undefined : 'Intent could not be determined'
    };
  }

  /**
   * Process transcript (convenience method)
   */
  processTranscript(
    transcript: string,
    confidence: number = 1.0,
    language?: string
  ): ProcessedCommand {
    const command: VoiceCommand = {
      transcript,
      confidence,
      language: language || this.config.language,
      timestamp: Date.now()
    };

    return this.processCommand(command);
  }

  /**
   * Get command history
   */
  getHistory(): VoiceCommand[] {
    return [...this.commandHistory];
  }

  /**
   * Get recent transcripts
   */
  getRecentTranscripts(count: number = 10): string[] {
    return this.commandHistory
      .slice(-count)
      .map(cmd => cmd.transcript);
  }

  /**
   * Clear command history
   */
  clearHistory(): void {
    this.commandHistory = [];
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<VoiceProcessorConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): VoiceProcessorConfig {
    return { ...this.config };
  }

  /**
   * Add command to history
   */
  private addToHistory(command: VoiceCommand): void {
    this.commandHistory.push(command);

    // Trim history if exceeds max length
    if (this.commandHistory.length > this.config.maxHistoryLength) {
      this.commandHistory = this.commandHistory.slice(-this.config.maxHistoryLength);
    }
  }

  /**
   * Determine if command should execute
   */
  private shouldExecuteCommand(
    command: VoiceCommand,
    intent: { action: string }
  ): boolean {
    // Don't execute unknown intents
    if (intent.action === 'unknown') {
      return false;
    }

    // Don't execute low-confidence commands
    if (command.confidence < this.config.confidenceThreshold) {
      return false;
    }

    return true;
  }
}

// Singleton instance
export const voiceProcessor = new VoiceProcessor();
