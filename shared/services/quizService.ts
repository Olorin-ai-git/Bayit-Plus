/**
 * Quiz Service
 * API service for kids quiz feature.
 *
 * Note: This service provides a platform-agnostic interface.
 * For web, it uses the centralized api instance.
 * For native, it uses fetch with AsyncStorage token retrieval.
 */

import type { Quiz, QuizResult } from '../stores/quizStore';

// Platform detection
const isWeb = typeof window !== 'undefined' && !('ReactNativeWebView' in window);

/**
 * Get the API module dynamically based on platform
 * Web uses centralized api.js, native uses direct fetch
 */
async function getApiClient() {
  if (isWeb) {
    // Use centralized api instance for web (includes auth, retry, correlation IDs)
    const { default: api } = await import('../../web/src/services/api');
    return {
      get: async <T>(url: string, params?: Record<string, string>): Promise<T> => {
        return api.get(url, { params });
      },
      post: async <T>(url: string, data: object): Promise<T> => {
        return api.post(url, data);
      },
    };
  }

  // Native platform - use fetch with AsyncStorage
  const AsyncStorage = await import('@react-native-async-storage/async-storage')
    .then(m => m.default)
    .catch(() => null);

  const getToken = async (): Promise<string | null> => {
    if (AsyncStorage) {
      return AsyncStorage.getItem('auth_token');
    }
    return null;
  };

  const baseUrl = process.env.API_BASE_URL || '/api/v1';

  return {
    get: async <T>(url: string, params?: Record<string, string>): Promise<T> => {
      let fullUrl = `${baseUrl}${url}`;
      if (params) {
        const searchParams = new URLSearchParams(params);
        fullUrl += `?${searchParams.toString()}`;
      }

      const token = await getToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(fullUrl, { headers });
      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Request failed' }));
        throw new Error(error.detail || `HTTP ${response.status}`);
      }
      return response.json();
    },
    post: async <T>(url: string, data: object): Promise<T> => {
      const token = await getToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${baseUrl}${url}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Request failed' }));
        throw new Error(error.detail || `HTTP ${response.status}`);
      }
      return response.json();
    },
  };
}

export const quizService = {
  /**
   * Get or generate a quiz for the given content
   */
  getQuiz: async (contentId: string, profileId: string): Promise<Quiz> => {
    const api = await getApiClient();
    return api.get<Quiz>(`/quiz/${contentId}`, { profile_id: profileId });
  },

  /**
   * Submit quiz answers and get results
   */
  submitQuiz: async (
    quizId: string,
    answers: number[],
    profileId: string,
    timings?: number[]
  ): Promise<QuizResult> => {
    const api = await getApiClient();
    return api.post<QuizResult>(`/quiz/${quizId}/submit`, {
      answers,
      profile_id: profileId,
      timings,
    });
  },

  /**
   * Get quiz history for a profile
   */
  getHistory: async (
    profileId: string,
    limit: number = 20,
    skip: number = 0
  ): Promise<{ items: QuizResult[]; total: number }> => {
    const api = await getApiClient();
    return api.get(`/quiz/history/me`, {
      profile_id: profileId,
      limit: limit.toString(),
      skip: skip.toString(),
    });
  },
};

export default quizService;
