/**
 * File validation utilities
 * Validates file types, sizes, and formats
 */

import type { ContentType } from '../types';
import { ALLOWED_VIDEO_EXTENSIONS, ALLOWED_AUDIO_EXTENSIONS, MAX_FILE_SIZE, getExtensionsForContentType } from '../constants';

/**
 * Validates if a file is acceptable for upload
 * Checks extension and file size based on content type
 */
export const validateFile = (file: File, contentType?: ContentType): boolean => {
  const ext = '.' + file.name.split('.').pop()?.toLowerCase();
  const allowedExtensions = contentType
    ? getExtensionsForContentType(contentType)
    : ALLOWED_VIDEO_EXTENSIONS;
  return allowedExtensions.includes(ext) && file.size <= MAX_FILE_SIZE;
};

/**
 * Validates multiple files and returns results
 */
export const validateFiles = (files: File[], contentType?: ContentType): {
  valid: File[];
  invalid: File[];
  reasons: Record<string, string>;
} => {
  const valid: File[] = [];
  const invalid: File[] = [];
  const reasons: Record<string, string> = {};
  const allowedExtensions = contentType
    ? getExtensionsForContentType(contentType)
    : ALLOWED_VIDEO_EXTENSIONS;
  const formatLabel = contentType === 'audiobook' ? 'audio' : 'video';

  files.forEach((file) => {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();

    if (!allowedExtensions.includes(ext)) {
      invalid.push(file);
      reasons[file.name] = `Invalid ${formatLabel} file type`;
    } else if (file.size > MAX_FILE_SIZE) {
      invalid.push(file);
      reasons[file.name] = 'File too large (max 10GB)';
    } else {
      valid.push(file);
    }
  });

  return { valid, invalid, reasons };
};

/**
 * Gets file extension
 */
export const getFileExtension = (filename: string): string => {
  return '.' + filename.split('.').pop()?.toLowerCase();
};

/**
 * Checks if file type is supported for video content
 */
export const isVideoFile = (filename: string): boolean => {
  const ext = getFileExtension(filename);
  return ALLOWED_VIDEO_EXTENSIONS.includes(ext);
};

/**
 * Checks if file type is supported for audio content
 */
export const isAudioFile = (filename: string): boolean => {
  const ext = getFileExtension(filename);
  return ALLOWED_AUDIO_EXTENSIONS.includes(ext);
};

/**
 * Gets validation error message for a file
 */
export const getValidationError = (file: File, contentType?: ContentType): string | null => {
  const ext = getFileExtension(file.name);
  const allowedExtensions = contentType
    ? getExtensionsForContentType(contentType)
    : ALLOWED_VIDEO_EXTENSIONS;
  const formatLabel = contentType === 'audiobook' ? 'audio' : 'video';

  if (!allowedExtensions.includes(ext)) {
    return `Invalid ${formatLabel} file type: ${ext}. Allowed: ${allowedExtensions.join(', ')}`;
  }

  if (file.size > MAX_FILE_SIZE) {
    return `File too large: ${(file.size / (1024 * 1024 * 1024)).toFixed(2)}GB. Max: 10GB`;
  }

  return null;
};

/**
 * Calculates total size of files
 */
export const getTotalFileSize = (files: File[]): number => {
  return files.reduce((total, file) => total + file.size, 0);
};
