export interface ContentCharacter {
  name: string;
  voice_id: string;
  frame_url: string;
  description: string;
  movie_context: string;
  actor_name?: string;
  gender?: string;
  suggested_questions: string[];
}

export interface InteractableMovie {
  content_id: string;
  title: string;
  poster_url?: string;
  character_count: number;
  status: string;
}

export interface MovieTagStatus {
  content_id: string;
  status: string;
  characters: ContentCharacter[];
  error?: string;
}

export interface CharacterQuestionsResponse {
  character_name: string;
  specific_questions: string[];
  generic_questions: string[];
}

export interface MovieInteractionStore {
  movies: InteractableMovie[];
  characters: ContentCharacter[];
  questions: CharacterQuestionsResponse | null;
  tagStatus: MovieTagStatus | null;
  loading: boolean;
  error: string | null;
  fetchMovies: () => Promise<void>;
  tagMovie: (contentId: string, profileId: string) => Promise<void>;
  fetchCharacters: (contentId: string) => Promise<void>;
  fetchQuestions: (contentId: string, characterName: string) => Promise<void>;
  clearError: () => void;
}
