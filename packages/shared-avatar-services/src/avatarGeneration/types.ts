/**
 * Avatar Generation Types
 * Type definitions for avatar generation and mesh creation
 */

export interface AvatarGenerationRequest {
  userId: string;
  photoUrl: string;
  style?: AvatarStyle;
  quality?: AvatarQuality;
  options?: AvatarOptions;
}

export type AvatarStyle = 'realistic' | 'animated' | 'stylized';

export type AvatarQuality = 'low' | 'medium' | 'high' | 'ultra';

export interface AvatarOptions {
  enableAnimations?: boolean;
  enableEmotions?: boolean;
  backgroundColor?: string;
  cameraAngle?: CameraAngle;
}

export type CameraAngle = 'front' | 'side' | 'three-quarter';

export interface AvatarGenerationResult {
  avatarId: string;
  userId: string;
  meshUrl: string;
  thumbnailUrl?: string;
  style: AvatarStyle;
  quality: AvatarQuality;
  createdAt: number;
  status: AvatarGenerationStatus;
  metadata?: Record<string, unknown>;
}

export type AvatarGenerationStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'expired';

export interface AvatarGenerationProgress {
  avatarId: string;
  status: AvatarGenerationStatus;
  progress: number; // 0.0 - 1.0
  message?: string;
  estimatedTimeRemaining?: number;
}

export interface ZehAniConfig {
  apiKey: string;
  apiUrl: string;
  timeout?: number;
  retries?: number;
}

export interface ZehAniResponse {
  success: boolean;
  data?: {
    avatarId: string;
    meshUrl: string;
    thumbnailUrl?: string;
    status: string;
  };
  error?: {
    code: string;
    message: string;
  };
}
