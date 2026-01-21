/**
 * Multimedia API Types
 *
 * Types specific to multimedia generation and processing functionality.
 * These types should be moved to the multimedia submodule.
 *
 * @author Gil Klainert
 * @version 1.0.0
  */

// NOTE: api module not available in this build
// import { ApiSuccessResponse } from './api';

export interface MultimediaGenerationResult {
  id: string;
  type: 'image' | 'audio' | 'video' | 'document';
  url: string;
  thumbnailUrl?: string;
  metadata: {
    duration?: number;
    dimensions?: { width: number; height: number };
    format: string;
    size: number;
    quality?: string;
  };
  generatedAt: number;
  expiresAt?: number;
}

// export interface ApiMultimediaResponse extends ApiSuccessResponse<MultimediaGenerationResult> {
//   data: MultimediaGenerationResult;
// }