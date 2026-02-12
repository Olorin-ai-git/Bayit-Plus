export interface HighlightMoment {
  source_type: string;
  source_id: string;
  score: number;
  transcript_he: string;
}

export interface HighlightReel {
  id: string;
  avatar_id: string;
  moments: HighlightMoment[];
  has_video: boolean;
  has_thumbnail: boolean;
  share_token: string;
  status: string;
  credits_charged: number;
  created_at: string;
}

export interface WhatsAppContact {
  id: string;
  display_name: string;
  relationship: string;
  language: string;
  last_sent_at: string | null;
}

export interface FeedbackEntry {
  id: string;
  contact_id: string;
  contact_name: string;
  voice_note_url: string | null;
  transcript: string | null;
  detected_language: string | null;
  created_at: string;
}

export interface ZehAniStore {
  reels: HighlightReel[];
  contacts: WhatsAppContact[];
  feedback: FeedbackEntry[];
  loading: boolean;
  error: string | null;

  generateReel: (profileId: string, avatarId: string) => Promise<void>;
  fetchReels: (profileId: string) => Promise<void>;
  addContact: (
    profileId: string,
    phoneNumber: string,
    displayName: string,
    relationship: string,
    language: string,
    pin: string,
  ) => Promise<boolean>;
  fetchContacts: (profileId: string) => Promise<void>;
  removeContact: (contactId: string) => Promise<boolean>;
  fetchFeedback: (profileId: string) => Promise<void>;
  clearError: () => void;
}
