export type MirrorState = 'idle' | 'recording' | 'processing' | 'feedback' | 'error';

export interface PhonemeFeedback {
  word_he: string;
  expected_transliteration: string;
  heard_transliteration: string;
  score: number;
  issue_type: string | null;
}

export interface MirrorAttemptResult {
  id: string;
  pronunciation_score: number;
  quality: string;
  phoneme_feedback: PhonemeFeedback[];
  corrected_audio_url: string | null;
  shekels_earned: number;
  input_transcript: string;
  target_phrase_he: string;
  created_at: string;
}

export interface PracticePhrase {
  phrase_he: string;
  transliteration: string;
  translation: string;
  difficulty: string;
  category: string;
  source_word: string | null;
}

export interface MirrorHistory {
  attempts: MirrorAttemptResult[];
  total: number;
  average_score: number;
}

export interface PhoneticMirrorStore {
  mirrorState: MirrorState;
  currentPhrase: PracticePhrase | null;
  phrases: PracticePhrase[];
  lastResult: MirrorAttemptResult | null;
  history: MirrorHistory | null;
  loading: boolean;
  error: string | null;

  fetchPhrases: (profileId: string, difficulty?: string) => Promise<void>;
  submitAttempt: (data: {
    audio: Blob;
    targetPhraseHe: string;
    targetTransliteration: string;
    avatarId: string;
    profileId: string;
  }) => Promise<MirrorAttemptResult | null>;
  fetchHistory: (profileId: string) => Promise<void>;
  setCurrentPhrase: (phrase: PracticePhrase | null) => void;
  setMirrorState: (state: MirrorState) => void;
  clearError: () => void;
  reset: () => void;
}
