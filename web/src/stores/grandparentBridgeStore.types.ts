export type ClipStatus = 'generating' | 'ready' | 'failed';

export interface NewsClip {
  id: string;
  avatar_id: string;
  script_text: string;
  script_text_he: string;
  vocabulary_featured: string[];
  video_gcs_path: string | null;
  thumbnail_gcs_path: string | null;
  share_url: string | null;
  whatsapp_sent: boolean;
  status: ClipStatus;
  credits_charged: number;
  created_at: string;
}

export interface ShareResult {
  clip_id: string;
  share_url: string | null;
  whatsapp_link: string;
}

export interface VoiceNoteResult {
  voice_note_id: string;
  duration: number;
  transcript: string | null;
  detected_language: string | null;
}

export interface GrandparentBridgeStore {
  clips: NewsClip[];
  selectedClip: NewsClip | null;
  loading: boolean;
  generating: boolean;
  error: string | null;

  generateClip: (params: {
    avatarId: string;
    profileId: string;
    sessionSummary: Record<string, unknown>;
  }) => Promise<NewsClip | null>;
  fetchClips: (profileId: string) => Promise<void>;
  shareClip: (clipId: string, recipientName: string, language?: string) => Promise<ShareResult | null>;
  setSelectedClip: (clip: NewsClip | null) => void;
  clearError: () => void;
}
