// @ts-ignore - Export conflicts/**
 * File Utilities
 * 
 * Common file manipulation and validation utilities for the multimedia module.
 * 
 * @author Gil Klainert
 * @version 1.0.0 - CVPlus Multimedia Module
 */

import { MediaType } from '../types/media.types';

export class FileUtils {
  /**
   * MIME type mappings for media files
   */
  private static readonly MIME_TYPES = {
    // Images
    'image/jpeg': ['jpg', 'jpeg'],
    'image/png': ['png'],
    'image/webp': ['webp'],
    'image/avif': ['avif'],
    'image/gif': ['gif'],
    'image/svg+xml': ['svg'],
    'image/bmp': ['bmp'],
    'image/tiff': ['tiff', 'tif'],
    
    // Videos
    'video/mp4': ['mp4'],
    'video/webm': ['webm'],
    'video/avi': ['avi'],
    'video/quicktime': ['mov'],
    'video/x-msvideo': ['avi'],
    'video/x-matroska': ['mkv'],
    'video/x-flv': ['flv'],
    'video/ogg': ['ogv'],
    
    // Audio
    'audio/mpeg': ['mp3'],
    'audio/aac': ['aac'],
    'audio/ogg': ['ogg'],
    'audio/wav': ['wav'],
    'audio/flac': ['flac'],
    'audio/x-m4a': ['m4a'],
    'audio/x-ms-wma': ['wma'],
    'audio/opus': ['opus']
  };

  /**
   * Get file extension from filename
   */
  static getFileExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    return lastDot > -1 ? filename.substring(lastDot + 1).toLowerCase() : '';
  }

  /**
   * Get filename without extension
   */
  static getBaseName(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    return lastDot > -1 ? filename.substring(0, lastDot) : filename;
  }

  /**
   * Get MIME type from file extension
   */
  static getMimeTypeFromExtension(extension: string): string {
    const ext = extension.toLowerCase().replace('.', '');
    
    for (const [mimeType, extensions] of Object.entries(this.MIME_TYPES)) {
      if (extensions.includes(ext)) {
        return mimeType;
      }
    }
    
    return 'application/octet-stream';
  }

  /**
   * Get file extension from MIME type
   */
  static getExtensionFromMimeType(mimeType: string): string {
    const extensions = this.MIME_TYPES[mimeType as keyof typeof this.MIME_TYPES];
    return extensions ? `.${extensions[0]}` : '';
  }

  /**
   * Detect media type from MIME type or filename
   */
  static detectMediaType(input: string): MediaType {
    let mimeType = input;
    
    // If input looks like a filename, get MIME type from extension
    if (!input.includes('/') && input.includes('.')) {
      const extension = this.getFileExtension(input);
      mimeType = this.getMimeTypeFromExtension(extension);
    }

    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    
    return 'other' as MediaType;
  }

  /**
   * Validate file name
   */
  static isValidFileName(filename: string): boolean {
    // Check for basic validity
    if (!filename || filename.length === 0) return false;
    if (filename.length > 255) return false;
    
    // Check for invalid characters
    const invalidChars = /[<>:"/\\|?*\x00-\x1f]/;
    if (invalidChars.test(filename)) return false;
    
    // Check for reserved names (Windows)
    const reservedNames = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$)/i;
    if (reservedNames.test(filename)) return false;
    
    return true;
  }

  /**
   * Sanitize filename for safe storage
   */
  static sanitizeFileName(filename: string): string {
    // Replace invalid characters with underscores
    let sanitized = filename.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_');
    
    // Handle reserved names
    const reservedNames = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$)/i;
    if (reservedNames.test(sanitized)) {
      sanitized = `file_${sanitized}`;
    }
    
    // Ensure reasonable length
    if (sanitized.length > 255) {
      const extension = this.getFileExtension(sanitized);
      const baseName = this.getBaseName(sanitized);
      const maxBaseLength = 255 - extension.length - 1;
      sanitized = `${baseName.substring(0, maxBaseLength)}.${extension}`;
    }
    
    return sanitized;
  }

  /**
   * Generate unique filename
   */
  static generateUniqueFileName(originalName: string, suffix?: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const extension = this.getFileExtension(originalName);
    const baseName = this.getBaseName(originalName);
    
    const uniqueSuffix = suffix ? `_${suffix}` : '';
    const uniqueName = `${baseName}_${timestamp}_${random}${uniqueSuffix}`;
    
    return extension ? `${uniqueName}.${extension}` : uniqueName;
  }

  /**
   * Format file size in human readable format
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }

  /**
   * Parse file size string to bytes
   */
  static parseFileSize(sizeStr: string): number {
    const units = {
      'b': 1,
      'bytes': 1,
      'kb': 1024,
      'mb': 1024 * 1024,
      'gb': 1024 * 1024 * 1024,
      'tb': 1024 * 1024 * 1024 * 1024
    };
    
    const match = sizeStr.toLowerCase().match(/^(\d+(?:\.\d+)?)\s*([a-z]+)?$/);
    if (!match) return 0;
    
    const [, number, unit = 'bytes'] = match;
    const multiplier = units[unit as keyof typeof units] || 1;
    
    return Math.round(parseFloat(number || '0') * multiplier);
  }

  /**
   * Check if file size is within limits
   */
  static isFileSizeValid(size: number, maxSize: number): boolean {
    return size > 0 && size <= maxSize;
  }

  /**
   * Get supported file extensions for media type
   */
  static getSupportedExtensions(mediaType: MediaType): string[] {
    const extensions: string[] = [];
    
    for (const [mimeType, exts] of Object.entries(this.MIME_TYPES)) {
      const type = this.detectMediaType(mimeType);
      if (type === mediaType) {
        extensions.push(...exts);
      }
    }
    
    return Array.from(new Set(extensions)); // Remove duplicates
  }

  /**
   * Check if file type is supported
   */
  static isFileTypeSupported(filename: string, supportedTypes: string[]): boolean {
    const extension = this.getFileExtension(filename);
    return supportedTypes.includes(extension);
  }

  /**
   * Generate file path with timestamp organization
   */
  static generateDateBasedPath(filename: string, basePath = 'uploads'): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    
    const sanitizedName = this.sanitizeFileName(filename);
    return `${basePath}/${year}/${month}/${day}/${sanitizedName}`;
  }

  /**
   * Extract file info from path
   */
  static extractFileInfo(filePath: string): {
    directory: string;
    filename: string;
    baseName: string;
    extension: string;
    fullPath: string;
  } {
    const normalizedPath = filePath.replace(/\\/g, '/');
    const lastSlash = normalizedPath.lastIndexOf('/');
    
    const directory = lastSlash > -1 ? normalizedPath.substring(0, lastSlash) : '';
    const filename = lastSlash > -1 ? normalizedPath.substring(lastSlash + 1) : normalizedPath;
    const baseName = this.getBaseName(filename);
    const extension = this.getFileExtension(filename);
    
    return {
      directory,
      filename,
      baseName,
      extension,
      fullPath: normalizedPath
    };
  }

  /**
   * Validate file against multiple criteria
   */
  static validateFile(
    file: File | { name: string; size: number; type: string },
    criteria: {
      maxSize?: number;
      allowedTypes?: string[];
      allowedExtensions?: string[];
      minSize?: number;
    }
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Size validation
    if (criteria.maxSize && file.size > criteria.maxSize) {
      errors.push(`File size ${this.formatFileSize(file.size)} exceeds maximum ${this.formatFileSize(criteria.maxSize)}`);
    }

    if (criteria.minSize && file.size < criteria.minSize) {
      errors.push(`File size ${this.formatFileSize(file.size)} is below minimum ${this.formatFileSize(criteria.minSize)}`);
    }

    // Type validation
    if (criteria.allowedTypes && !criteria.allowedTypes.includes(file.type)) {
      errors.push(`File type ${file.type} is not allowed`);
    }

    // Extension validation
    if (criteria.allowedExtensions) {
      const extension = this.getFileExtension(file.name);
      if (!criteria.allowedExtensions.includes(extension)) {
        errors.push(`File extension .${extension} is not allowed`);
      }
    }

    // Filename validation
    if (!this.isValidFileName(file.name)) {
      errors.push('Invalid filename');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}