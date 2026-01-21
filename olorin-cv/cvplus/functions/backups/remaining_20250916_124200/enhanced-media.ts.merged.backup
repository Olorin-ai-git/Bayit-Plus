// @ts-ignore - Export conflicts/**
 * Enhanced Media Types
 * 
 * Media processing types for enhanced CV features.
 * 
 * @author Gil Klainert
 * @version 1.0.0
 */

export interface MediaProcessingRequest {
  id: string;
  userId: string;
  jobId: string;
  type: 'image' | 'video' | 'audio' | 'document';
  sourceUrl: string;
  targetFormat?: string;
  qualityLevel?: 'low' | 'medium' | 'high' | 'premium';
  processingOptions?: Record<string, any>;
}

export interface MediaProcessingResult {
  id: string;
  originalUrl: string;
  processedUrl: string;
  format: string;
  size: number;
  duration?: number;
  quality: string;
  metadata: MediaMetadata;
  processingTime: number;
}

export interface MediaMetadata {
  width?: number;
  height?: number;
  duration?: number;
  bitrate?: number;
  codec?: string;
  fps?: number;
  fileSize: number;
  mimeType: string;
  createdAt: Date;
}

export interface MediaProcessingOptions {
  resize?: {
    width: number;
    height: number;
    maintainAspectRatio: boolean;
  };
  compress?: {
    quality: number;
    maxSize?: number;
  };
  watermark?: {
    text?: string;
    imageUrl?: string;
    position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
    opacity: number;
  };
}

export interface MediaValidationRules {
  maxFileSize: number;
  allowedFormats: string[];
  minDimensions?: { width: number; height: number };
  maxDimensions?: { width: number; height: number };
  maxDuration?: number;
}

export interface PortfolioImage {
  id: string;
  userId: string;
  title: string;
  description?: string;
  url: string;
  thumbnailUrl?: string;
  order: number;
  tags: string[];
  uploadedAt: Date;
}

export interface CalendarSettings {
  timezone: string;
  availabilityWindows: AvailabilityWindow[];
  meetingTypes: MeetingType[];
  bufferTime: number;
  maxAdvanceBooking: number;
}

export interface AvailabilityWindow {
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, etc.
  startTime: string; // "09:00"
  endTime: string;   // "17:00"
}

export interface MeetingType {
  id: string;
  name: string;
  duration: number; // in minutes
  description?: string;
  price?: number;
}

export interface Testimonial {
  id: string;
  userId: string;
  authorName: string;
  authorTitle?: string;
  authorCompany?: string;
  content: string;
  rating?: number;
  isPublic: boolean;
  createdAt: Date;
}

export interface PersonalityProfile {
  id: string;
  userId: string;
  traits: PersonalityTrait[];
  summary: string;
  strengths: string[];
  workingStyle: string;
  communicationStyle: string;
  lastUpdated: Date;
}

export interface PersonalityTrait {
  name: string;
  score: number; // 0-100
  description: string;
}