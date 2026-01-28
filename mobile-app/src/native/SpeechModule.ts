/**
 * SpeechModule.ts - TypeScript Bridge for Speech-to-Text Post-Processing
 * Post-processes voice recognition output:
 * - Adds punctuation
 * - Detects language
 * - Normalizes text
 * - Full pipeline processing
 */

import { NativeModules } from 'react-native';

const SpeechModuleNative = NativeModules.SpeechModule;

export interface SpeechProcessingResult {
  text: string;
  language: string;
  confidence?: number;
  processed?: boolean;
  normalized?: boolean;
}

export class SpeechModule {
  /**
   * Restore punctuation in transcribed text
   * @param text Raw transcribed text
   * @param language Language code: 'he', 'en', 'es'
   * @returns Text with punctuation
   */
  async restorePunctuation(text: string, language: string): Promise<SpeechProcessingResult> {
    return SpeechModuleNative.restorePunctuation(text, language);
  }

  /**
   * Detect language of text
   * @param text Text to analyze
   * @returns Language code with confidence score
   */
  async detectLanguage(text: string): Promise<SpeechProcessingResult> {
    return SpeechModuleNative.detectLanguage(text);
  }

  /**
   * Normalize text: numbers, currencies, abbreviations, URLs
   * @param text Text to normalize
   * @param language Language for context
   * @returns Normalized text
   */
  async normalizeText(text: string, language: string): Promise<SpeechProcessingResult> {
    return SpeechModuleNative.normalizeText(text, language);
  }

  /**
   * Full processing pipeline: detect → normalize → punctuate
   * @param text Raw transcribed text
   * @returns Fully processed text
   */
  async processText(text: string): Promise<SpeechProcessingResult> {
    return SpeechModuleNative.processText(text);
  }
}

export const speechModule = new SpeechModule();
export default speechModule;
