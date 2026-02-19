import { create } from 'zustand';
import i18n from 'i18next';
import api from '@/services/api';
import logger from '@bayit/shared-utils/logger';
import type {
  InteractableMovie,
  MovieTagStatus,
  CharacterQuestionsResponse,
  MovieInteractionStore,
} from './movieInteractionStore.types';

const movieInteractionLogger = logger.scope('MovieInteractionStore');

export const useMovieInteractionStore = create<MovieInteractionStore>((set) => ({
  movies: [],
  characters: [],
  questions: null,
  tagStatus: null,
  loading: false,
  error: null,

  fetchMovies: async () => {
    set({ loading: true, error: null });
    try {
      const data = await api.get('/movie-interactions/movies') as InteractableMovie[];
      set({ movies: data || [], loading: false });
      movieInteractionLogger.info('Fetched interactable movies', { count: String(data?.length || 0) });
    } catch (error: any) {
      set({
        error: error?.detail || error?.message || i18n.t('zehAni.movieInteractions.errors.fetchMoviesFailed'),
        loading: false,
      });
      movieInteractionLogger.error('Failed to fetch interactable movies', error);
    }
  },

  tagMovie: async (contentId: string, profileId: string) => {
    set({ loading: true, error: null });
    try {
      const status = await api.post('/movie-interactions/tag', {
        content_id: contentId,
        profile_id: profileId,
      }) as MovieTagStatus;
      set({ tagStatus: status, loading: false });
      movieInteractionLogger.info('Movie tagging initiated', { contentId, status: status.status });
    } catch (error: any) {
      set({
        error: error?.detail || error?.message || i18n.t('zehAni.movieInteractions.errors.tagFailed'),
        loading: false,
      });
      movieInteractionLogger.error('Failed to tag movie', error);
    }
  },

  fetchCharacters: async (contentId: string) => {
    set({ loading: true, error: null });
    try {
      const status = await api.get(`/movie-interactions/tag/${contentId}`) as MovieTagStatus;
      set({ characters: status.characters || [], tagStatus: status, loading: false });
      movieInteractionLogger.info('Fetched characters for movie', {
        contentId,
        count: String(status.characters?.length || 0),
      });
    } catch (error: any) {
      set({
        error: error?.detail || error?.message || i18n.t('zehAni.movieInteractions.errors.fetchCharactersFailed'),
        loading: false,
      });
      movieInteractionLogger.error('Failed to fetch characters', error);
    }
  },

  fetchQuestions: async (contentId: string, characterName: string) => {
    set({ loading: true, error: null });
    try {
      const data = await api.get(
        `/movie-interactions/characters/${contentId}/questions`,
        { params: { character_name: characterName } },
      ) as CharacterQuestionsResponse;
      set({ questions: data, loading: false });
      movieInteractionLogger.info('Fetched character questions', {
        contentId,
        characterName,
        specificCount: String(data?.specific_questions?.length || 0),
      });
    } catch (error: any) {
      set({
        error: error?.detail || error?.message || i18n.t('zehAni.movieInteractions.errors.fetchQuestionsFailed'),
        loading: false,
      });
      movieInteractionLogger.error('Failed to fetch character questions', error);
    }
  },

  clearError: () => set({ error: null }),
}));
