/**
 * File validation utilities
 * Validates file types, sizes, and formats
 */

import { ALLOWED_VIDEO_EXTENSIONS, MAX_FILE_SIZE } from '../constants';

/**
 * Validates if a file is acceptable for upload
 * Checks extension and file size
 */
export const validateFile = (file: File): boolean => {
  const ext = '.' + file.name.split('.').pop()?.toLowerCase();
  return ALLOWED_VIDEO_EXTENSIONS.includes(ext) && file.size <= MAX_FILE_SIZE;
};

/**
 * Validates multiple files and returns results
 */
export const validateFiles = (files: File[]): {
  valid: File[];
  invalid: File[];
  reasons: Record<string, string>;
} => {
  const valid: File[] = [];
  const invalid: File[] = [];
  const reasons: Record<string, string> = {};

  files.forEach((file) => {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();

    if (!ALLOWED_VIDEO_EXTENSIONS.includes(ext)) {
      invalid.push(file);
      reasons[file.name] = 'Invalid file type';
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
 * Checks if file type is supported
 */
export const isVideoFile = (filename: string): boolean => {
  const ext = getFileExtension(filename);
  return ALLOWED_VIDEO_EXTENSIONS.includes(ext);
};

/**
 * Gets validation error message for a file
 */
export const getValidationError = (file: File): string | null => {
  const ext = getFileExtension(file.name);

  if (!ALLOWED_VIDEO_EXTENSIONS.includes(ext)) {
    return `Invalid file type: ${ext}. Allowed: ${ALLOWED_VIDEO_EXTENSIONS.join(', ')}`;
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
