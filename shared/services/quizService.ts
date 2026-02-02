/**
 * Quiz Service
 * API service for kids quiz feature.
 * This service is platform-agnostic and handles quiz API calls.
 */

import type { Quiz, QuizResult } from '../stores/quizStore';

// Platform-specific base URL resolution
const getBaseUrl = (): string => {
  // In web environment, use relative URLs (handled by proxy)
  // In native, this should be configured via environment
  if (typeof window !== 'undefined') {
    return '/api/v1';
  }
  // For native apps, this would be set via config
  return process.env.API_BASE_URL || '/api/v1';
};

// Get auth token from storage
const getAuthToken = async (): Promise<string | null> => {
  if (typeof window !== 'undefined' && window.localStorage) {
    return localStorage.getItem('auth_token');
  }
  // For native, would use AsyncStorage
  return null;
};

interface FetchOptions {
  method?: string;
  body?: object;
  params?: Record<string, string>;
}

async function fetchApi<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const baseUrl = getBaseUrl();
  let url = `${baseUrl}${endpoint}`;

  // Add query params
  if (options.params) {
    const searchParams = new URLSearchParams(options.params);
    url += `?${searchParams.toString()}`;
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const token = await getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

export const quizService = {
  /**
   * Get or generate a quiz for the given content
   */
  getQuiz: async (contentId: string, profileId: string): Promise<Quiz> => {
    return fetchApi<Quiz>(`/quiz/${contentId}`, {
      params: { profile_id: profileId },
    });
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
    return fetchApi<QuizResult>(`/quiz/${quizId}/submit`, {
      method: 'POST',
      body: {
        answers,
        profile_id: profileId,
        timings,
      },
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
    return fetchApi(`/quiz/history/me`, {
      params: {
        profile_id: profileId,
        limit: limit.toString(),
        skip: skip.toString(),
      },
    });
  },
};

export default quizService;
