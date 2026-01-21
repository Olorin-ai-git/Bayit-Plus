// @ts-ignore - Export conflicts/**
 * Media Utilities
 * 
 * Utilities for working with multimedia files including metadata extraction,
 * format detection, and media-specific operations.
 * 
 * @author Gil Klainert
 * @version 1.0.0 - CVPlus Multimedia Module
 */

import { MediaFile } from '../types/media.types';
import { FileUtils } from './FileUtils';

export interface MediaMetadata {
  width?: number;
  height?: number;
  duration?: number; // seconds
  bitRate?: number;
  frameRate?: number;
  channels?: number; // audio channels
  sampleRate?: number; // audio sample rate
  format?: string;
  colorSpace?: string;
  hasAudio?: boolean;
  hasVideo?: boolean;
  thumbnails?: string[];
  tags?: Record<string, string>;
}

export interface MediaValidationRules {
  maxWidth?: number;
  maxHeight?: number;
  minWidth?: number;
  minHeight?: number;
  maxDuration?: number; // seconds
  minDuration?: number; // seconds
  maxBitRate?: number;
  minBitRate?: number;
  allowedFormats?: string[];
  requiredAspectRatio?: number;
  maxFrameRate?: number;
  minFrameRate?: number;
}

export class MediaUtils {
  /**
   * Extract metadata from media file
   */
  static async extractMetadata(file: MediaFile): Promise<MediaMetadata> {
    const mediaType = FileUtils.detectMediaType(file.type);
    
    try {
      switch (mediaType) {
        case 'image':
          return this.extractImageMetadata(file);
        case 'video':
          return this.extractVideoMetadata(file);
        case 'audio':
          return this.extractAudioMetadata(file);
        default:
          return {};
      }
    } catch (error) {
      console.warn('Failed to extract metadata:', (error as Error).message);
      return {};
    }
  }

  /**
   * Extract image metadata
   */
  private static async extractImageMetadata(file: MediaFile): Promise<MediaMetadata> {
    return new Promise((resolve) => {
      // In a real implementation, this would use libraries like sharp or browser APIs
      if (typeof window !== 'undefined' && file.data) {
        const img = new Image();
        const blob = file.data instanceof Blob ? file.data : 
          file.data instanceof File ? file.data :
          new Blob([file.data as unknown as ArrayBuffer], { type: file.mimeType });
        const url = URL.createObjectURL(blob);
        
        img.onload = () => {
          URL.revokeObjectURL(url);
          resolve({
            width: img.naturalWidth,
            height: img.naturalHeight,
            format: FileUtils.getFileExtension(file.name),
            hasAudio: false,
            hasVideo: false
          });
        };
        
        img.onerror = () => {
          URL.revokeObjectURL(url);
          resolve({});
        };
        
        img.src = url;
      } else {
        // Fallback for server-side or when image loading fails
        resolve({
          format: FileUtils.getFileExtension(file.name),
          hasAudio: false,
          hasVideo: false
        });
      }
    });
  }

  /**
   * Extract video metadata
   */
  private static async extractVideoMetadata(file: MediaFile): Promise<MediaMetadata> {
    return new Promise((resolve) => {
      // In a real implementation, this would use FFmpeg.js or similar
      if (typeof window !== 'undefined' && file.data) {
        const video = document.createElement('video');
        const blob = file.data instanceof Blob ? file.data : 
          file.data instanceof File ? file.data :
          new Blob([file.data as unknown as ArrayBuffer], { type: file.mimeType });
        const url = URL.createObjectURL(blob);
        
        video.onloadedmetadata = () => {
          URL.revokeObjectURL(url);
          resolve({
            width: video.videoWidth,
            height: video.videoHeight,
            duration: video.duration,
            format: FileUtils.getFileExtension(file.name),
            hasAudio: true, // Assume true, would need deeper analysis
            hasVideo: true
          });
        };
        
        video.onerror = () => {
          URL.revokeObjectURL(url);
          resolve({
            format: FileUtils.getFileExtension(file.name),
            hasVideo: true
          });
        };
        
        video.src = url;
      } else {
        // Fallback for server-side
        resolve({
          format: FileUtils.getFileExtension(file.name),
          hasVideo: true
        });
      }
    });
  }

  /**
   * Extract audio metadata
   */
  private static async extractAudioMetadata(file: MediaFile): Promise<MediaMetadata> {
    return new Promise((resolve) => {
      // In a real implementation, this would use Web Audio API or audio libraries
      if (typeof window !== 'undefined' && file.data) {
        const audio = new Audio();
        const blob = file.data instanceof Blob ? file.data : 
          file.data instanceof File ? file.data :
          new Blob([file.data as unknown as ArrayBuffer], { type: file.mimeType });
        const url = URL.createObjectURL(blob);
        
        audio.onloadedmetadata = () => {
          URL.revokeObjectURL(url);
          resolve({
            duration: audio.duration,
            format: FileUtils.getFileExtension(file.name),
            hasAudio: true,
            hasVideo: false
          });
        };
        
        audio.onerror = () => {
          URL.revokeObjectURL(url);
          resolve({
            format: FileUtils.getFileExtension(file.name),
            hasAudio: true,
            hasVideo: false
          });
        };
        
        audio.src = url;
      } else {
        // Fallback for server-side
        resolve({
          format: FileUtils.getFileExtension(file.name),
          hasAudio: true,
          hasVideo: false
        });
      }
    });
  }

  /**
   * Validate media against rules
   */
  static validateMedia(
    file: MediaFile,
    metadata: MediaMetadata,
    rules: MediaValidationRules
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // File validation
    if (file.size <= 0) {
      errors.push('File is empty or corrupted');
    }

    // Dimension validation
    if (rules.maxWidth && metadata.width && metadata.width > rules.maxWidth) {
      errors.push(`Width ${metadata.width} exceeds maximum ${rules.maxWidth}`);
    }

    if (rules.maxHeight && metadata.height && metadata.height > rules.maxHeight) {
      errors.push(`Height ${metadata.height} exceeds maximum ${rules.maxHeight}`);
    }

    if (rules.minWidth && metadata.width && metadata.width < rules.minWidth) {
      errors.push(`Width ${metadata.width} is below minimum ${rules.minWidth}`);
    }

    if (rules.minHeight && metadata.height && metadata.height < rules.minHeight) {
      errors.push(`Height ${metadata.height} is below minimum ${rules.minHeight}`);
    }

    // Duration validation
    if (rules.maxDuration && metadata.duration && metadata.duration > rules.maxDuration) {
      errors.push(`Duration ${this.formatDuration(metadata.duration)} exceeds maximum ${this.formatDuration(rules.maxDuration)}`);
    }

    if (rules.minDuration && metadata.duration && metadata.duration < rules.minDuration) {
      errors.push(`Duration ${this.formatDuration(metadata.duration)} is below minimum ${this.formatDuration(rules.minDuration)}`);
    }

    // Bit rate validation
    if (rules.maxBitRate && metadata.bitRate && metadata.bitRate > rules.maxBitRate) {
      errors.push(`Bit rate ${metadata.bitRate} exceeds maximum ${rules.maxBitRate}`);
    }

    if (rules.minBitRate && metadata.bitRate && metadata.bitRate < rules.minBitRate) {
      errors.push(`Bit rate ${metadata.bitRate} is below minimum ${rules.minBitRate}`);
    }

    // Format validation
    if (rules.allowedFormats && metadata.format) {
      if (!rules.allowedFormats.includes(metadata.format)) {
        errors.push(`Format ${metadata.format} is not allowed`);
      }
    }

    // Aspect ratio validation
    if (rules.requiredAspectRatio && metadata.width && metadata.height) {
      const aspectRatio = metadata.width / metadata.height;
      const tolerance = 0.01; // 1% tolerance
      if (Math.abs(aspectRatio - rules.requiredAspectRatio) > tolerance) {
        errors.push(`Aspect ratio ${aspectRatio.toFixed(2)} does not match required ${rules.requiredAspectRatio.toFixed(2)}`);
      }
    }

    // Frame rate validation
    if (rules.maxFrameRate && metadata.frameRate && metadata.frameRate > rules.maxFrameRate) {
      errors.push(`Frame rate ${metadata.frameRate} exceeds maximum ${rules.maxFrameRate}`);
    }

    if (rules.minFrameRate && metadata.frameRate && metadata.frameRate < rules.minFrameRate) {
      errors.push(`Frame rate ${metadata.frameRate} is below minimum ${rules.minFrameRate}`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Calculate aspect ratio
   */
  static calculateAspectRatio(width: number, height: number): number {
    return width / height;
  }

  /**
   * Get common aspect ratio name
   */
  static getAspectRatioName(aspectRatio: number): string {
    const ratios = {
      '1.00': '1:1',
      '1.33': '4:3',
      '1.78': '16:9',
      '2.39': '21:9',
      '0.75': '3:4',
      '0.56': '9:16'
    };

    const tolerance = 0.05;
    for (const [ratio, name] of Object.entries(ratios)) {
      if (Math.abs(aspectRatio - parseFloat(ratio)) <= tolerance) {
        return name;
      }
    }

    return `${aspectRatio.toFixed(2)}:1`;
  }

  /**
   * Format duration in human readable format
   */
  static formatDuration(seconds: number): string {
    if (seconds < 60) {
      return `${Math.round(seconds)}s`;
    }

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);

    if (minutes < 60) {
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    return `${hours}:${remainingMinutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  /**
   * Parse duration string to seconds
   */
  static parseDuration(durationStr: string): number {
    const parts = durationStr.split(':').map(Number).filter(n => !isNaN(n));
    
    if (parts.length === 1) {
      // Seconds only
      return parts[0] || 0;
    } else if (parts.length === 2) {
      // MM:SS
      return (parts[0] || 0) * 60 + (parts[1] || 0);
    } else if (parts.length === 3) {
      // HH:MM:SS
      return (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0);
    }

    return 0;
  }

  /**
   * Calculate file bit rate
   */
  static calculateBitRate(fileSize: number, duration: number): number {
    if (duration <= 0) return 0;
    return Math.round((fileSize * 8) / duration); // bits per second
  }

  /**
   * Format bit rate in human readable format
   */
  static formatBitRate(bitRate: number): string {
    if (bitRate < 1000) {
      return `${bitRate} bps`;
    } else if (bitRate < 1000000) {
      return `${Math.round(bitRate / 1000)} kbps`;
    } else {
      return `${(bitRate / 1000000).toFixed(1)} Mbps`;
    }
  }

  /**
   * Generate thumbnail from media file
   */
  static async generateThumbnail(
    file: MediaFile,
    options: {
      width?: number;
      height?: number;
      quality?: number;
      format?: 'jpeg' | 'png' | 'webp';
      timeOffset?: number; // for video thumbnails
    } = {}
  ): Promise<Blob | null> {
    const mediaType = FileUtils.detectMediaType(file.type);
    
    try {
      switch (mediaType) {
        case 'image':
          return this.generateImageThumbnail(file, options);
        case 'video':
          return this.generateVideoThumbnail(file, options);
        default:
          return null;
      }
    } catch (error) {
      console.warn('Failed to generate thumbnail:', (error as Error).message);
      return null;
    }
  }

  /**
   * Generate image thumbnail
   */
  private static async generateImageThumbnail(
    file: MediaFile,
    options: {
      width?: number;
      height?: number;
      quality?: number;
      format?: 'jpeg' | 'png' | 'webp';
    }
  ): Promise<Blob | null> {
    if (typeof window === 'undefined' || !file.data) {
      return null;
    }

    return new Promise((resolve) => {
      const img = new Image();
      const blob = file.data instanceof Blob ? file.data : 
        file.data instanceof File ? file.data :
        new Blob([file.data as unknown as ArrayBuffer], { type: file.mimeType });
      const url = URL.createObjectURL(blob);
      
      img.onload = () => {
        URL.revokeObjectURL(url);
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          resolve(null);
          return;
        }

        const targetWidth = options.width || 200;
        const targetHeight = options.height || Math.round((img.naturalHeight / img.naturalWidth) * targetWidth);

        canvas.width = targetWidth;
        canvas.height = targetHeight;

        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        const format = options.format || 'jpeg';
        const quality = options.quality || 0.8;
        const mimeType = `image/${format}`;

        canvas.toBlob(resolve, mimeType, quality);
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(null);
      };
      
      img.src = url;
    });
  }

  /**
   * Generate video thumbnail
   */
  private static async generateVideoThumbnail(
    file: MediaFile,
    options: {
      width?: number;
      height?: number;
      quality?: number;
      format?: 'jpeg' | 'png' | 'webp';
      timeOffset?: number;
    }
  ): Promise<Blob | null> {
    if (typeof window === 'undefined' || !file.data) {
      return null;
    }

    return new Promise((resolve) => {
      const video = document.createElement('video');
      const blob = file.data instanceof Blob ? file.data : 
        file.data instanceof File ? file.data :
        new Blob([file.data as unknown as ArrayBuffer], { type: file.mimeType });
      const url = URL.createObjectURL(blob);
      
      video.onloadedmetadata = () => {
        const timeOffset = options.timeOffset || Math.min(5, video.duration / 2); // 5 seconds or middle
        video.currentTime = timeOffset;
      };
      
      video.onseeked = () => {
        URL.revokeObjectURL(url);
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          resolve(null);
          return;
        }

        const targetWidth = options.width || 200;
        const targetHeight = options.height || Math.round((video.videoHeight / video.videoWidth) * targetWidth);

        canvas.width = targetWidth;
        canvas.height = targetHeight;

        ctx.drawImage(video, 0, 0, targetWidth, targetHeight);

        const format = options.format || 'jpeg';
        const quality = options.quality || 0.8;
        const mimeType = `image/${format}`;

        canvas.toBlob(resolve, mimeType, quality);
      };
      
      video.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(null);
      };
      
      video.src = url;
      video.muted = true; // Required for autoplay in some browsers
    });
  }

  /**
   * Check if media file has transparency
   */
  static async hasTransparency(file: MediaFile): Promise<boolean> {
    if (!file.type.includes('png') && !file.type.includes('webp')) {
      return false; // Only PNG and WebP commonly support transparency
    }

    // In a real implementation, this would analyze the image data
    // For now, return true for PNG files as they commonly have transparency
    return file.type.includes('png');
  }

  /**
   * Get media quality score (0-100)
   */
  static calculateQualityScore(metadata: MediaMetadata, fileSize: number): number {
    let score = 50; // Base score

    // Resolution scoring (for images/videos)
    if (metadata.width && metadata.height) {
      const pixels = metadata.width * metadata.height;
      if (pixels >= 1920 * 1080) score += 20; // HD+
      else if (pixels >= 1280 * 720) score += 10; // HD
      else if (pixels >= 640 * 480) score += 5; // SD
    }

    // Duration scoring (for videos/audio)
    if (metadata.duration) {
      if (metadata.duration >= 60) score += 10; // 1+ minute
      else if (metadata.duration >= 10) score += 5; // 10+ seconds
    }

    // Bit rate scoring
    if (metadata.bitRate) {
      if (metadata.bitRate >= 1000000) score += 15; // 1+ Mbps
      else if (metadata.bitRate >= 500000) score += 10; // 500+ kbps
      else if (metadata.bitRate >= 128000) score += 5; // 128+ kbps
    }

    // File size vs content scoring
    const sizeScore = this.calculateSizeScore(fileSize, metadata);
    score += sizeScore;

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Calculate size appropriateness score
   */
  private static calculateSizeScore(fileSize: number, metadata: MediaMetadata): number {
    if (!metadata.width || !metadata.height) return 0;

    const pixels = metadata.width * metadata.height;
    const bytesPerPixel = fileSize / pixels;

    // Ideal range for different quality levels
    if (bytesPerPixel >= 1 && bytesPerPixel <= 4) return 10; // Good compression
    if (bytesPerPixel >= 0.5 && bytesPerPixel < 1) return 5; // High compression
    if (bytesPerPixel > 4) return -5; // Oversized
    if (bytesPerPixel < 0.5) return -10; // Over-compressed

    return 0;
  }
}