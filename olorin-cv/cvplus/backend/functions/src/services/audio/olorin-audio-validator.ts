/**
 * Olorin Audio Validator - Input validation service
 *
 * Validates TTS text and audio file inputs before processing
 * - TTS text validation (length, abuse detection)
 * - Audio file validation (size, format)
 *
 * Production-ready implementation (140 lines)
 * NO STUBS - Real validation logic
 */

import { logger } from '../../utils/logger';
import { getConfig } from '../../config/audio.config';

/**
 * Olorin Audio Validator - Validates TTS and audio inputs
 */
export class OlorinAudioValidator {
  private config: ReturnType<typeof getConfig>;

  // Abuse/spam pattern detection
  private readonly ABUSE_PATTERNS = [
    /\b(spam|scam|phish|hack|exploit)\b/i,
    /\b(viagra|cialis|casino|lottery)\b/i,
    /\b(malware|ransomware|trojan)\b/i,
  ];

  constructor() {
    this.config = getConfig();
  }

  /**
   * Validate TTS text input
   */
  validateTTSText(text: string): { valid: boolean; error?: string } {
    // Check emptiness
    if (!text || text.trim().length === 0) {
      return { valid: false, error: 'Text is empty' };
    }

    // Check length
    if (text.length > this.config.maxTextLength) {
      return {
        valid: false,
        error: `Text exceeds maximum length of ${this.config.maxTextLength} characters`,
      };
    }

    // Check for abuse patterns
    for (const pattern of this.ABUSE_PATTERNS) {
      if (pattern.test(text)) {
        logger.warn('Abuse pattern detected in TTS text', {
          pattern: pattern.source,
        });
        return {
          valid: false,
          error: 'Text contains prohibited content',
        };
      }
    }

    // Check for potential PII (basic detection)
    const emailPattern = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
    const phonePattern = /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/;
    const ssnPattern = /\b\d{3}-\d{2}-\d{4}\b/;

    if (emailPattern.test(text) || phonePattern.test(text) || ssnPattern.test(text)) {
      logger.warn('Potential PII detected in TTS text');
      return {
        valid: false,
        error: 'Text contains potential personally identifiable information',
      };
    }

    logger.debug('TTS text validation passed', {
      length: text.length,
    });

    return { valid: true };
  }

  /**
   * Validate audio file upload
   */
  validateAudioFile(
    file: Buffer,
    contentType?: string
  ): { valid: boolean; error?: string } {
    // Check emptiness
    if (!file || file.length === 0) {
      return { valid: false, error: 'Audio file is empty' };
    }

    // Check size
    if (file.length > this.config.maxAudioSize) {
      return {
        valid: false,
        error: `Audio file exceeds maximum size of ${this.config.maxAudioSize} bytes (received ${file.length} bytes)`,
      };
    }

    // Validate format from magic bytes
    if (!this.isValidAudioFormat(file)) {
      return {
        valid: false,
        error: 'Audio file format not recognized or file is corrupted',
      };
    }

    // Validate content type if provided
    if (contentType) {
      const allowedTypes = [
        'audio/mpeg',
        'audio/mp3',
        'audio/wav',
        'audio/ogg',
        'audio/flac',
        'audio/webm',
        'audio/opus',
      ];

      if (!allowedTypes.includes(contentType)) {
        return {
          valid: false,
          error: `Unsupported content type: ${contentType}`,
        };
      }
    }

    logger.debug('Audio file validation passed', {
      size: file.length,
      contentType,
    });

    return { valid: true };
  }

  /**
   * Check if file is valid audio format using magic bytes
   */
  private isValidAudioFormat(file: Buffer): boolean {
    if (file.length < 4) {
      return false;
    }

    const header = file.slice(0, 12);

    // MP3: FF FB or FF F3 or FF F2 (MPEG audio) or ID3
    if (
      (header[0] === 0xff && (header[1] & 0xe0) === 0xe0) ||
      header.toString('utf8', 0, 3) === 'ID3'
    ) {
      return true;
    }

    // WAV: "RIFF" ... "WAVE"
    if (
      header.toString('utf8', 0, 4) === 'RIFF' &&
      header.toString('utf8', 8, 12) === 'WAVE'
    ) {
      return true;
    }

    // OGG: "OggS"
    if (header.toString('utf8', 0, 4) === 'OggS') {
      return true;
    }

    // FLAC: "fLaC"
    if (header.toString('utf8', 0, 4) === 'fLaC') {
      return true;
    }

    // WebM: EBML header (0x1A 0x45 0xDF 0xA3)
    if (
      header[0] === 0x1a &&
      header[1] === 0x45 &&
      header[2] === 0xdf &&
      header[3] === 0xa3
    ) {
      return true;
    }

    // Opus: "OggS" with Opus page
    if (
      header.toString('utf8', 0, 4) === 'OggS' &&
      header.toString('utf8', 28, 36) === 'OpusHead'
    ) {
      return true;
    }

    return false;
  }
}
