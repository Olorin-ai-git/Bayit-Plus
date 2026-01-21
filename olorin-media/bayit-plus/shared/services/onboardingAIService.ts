import axios from 'axios';
import { Platform } from 'react-native';

// Get correct API URL based on platform
const getApiBaseUrl = () => {
  if (!__DEV__) {
    return 'https://api.bayit.tv/api/v1';
  }
  if (Platform.OS === 'web') {
    return 'http://localhost:8000/api/v1';
  }
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:8000/api/v1';
  }
  return 'http://localhost:8000/api/v1';
};

const API_BASE_URL = getApiBaseUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // Longer timeout for AI responses
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  (response) => response.data,
  (error) => Promise.reject(error.response?.data || error)
);

export type OnboardingStep =
  | 'greeting'
  | 'name_collection'
  | 'email_collection'
  | 'email_verification'
  | 'password_collection'
  | 'account_creation'
  | 'complete';

export type MascotMood = 'neutral' | 'happy' | 'thinking' | 'listening' | 'celebrating';
export type MascotAnimation = 'idle' | 'wave' | 'nod' | 'bounce' | 'sparkle';

export interface StartOnboardingResponse {
  conversation_id: string;
  message: string;
  mascot_mood: MascotMood;
  mascot_animation: MascotAnimation;
  current_step: OnboardingStep;
}

export interface SendMessageResponse {
  message: string;
  mascot_mood: MascotMood;
  mascot_animation: MascotAnimation;
  current_step: OnboardingStep;
  collected_data: {
    name: string | null;
    email: string | null;
    email_confirmed: boolean;
  };
  ready_for_completion: boolean;
}

export interface CompleteOnboardingResponse {
  success: boolean;
  access_token?: string;
  user?: {
    id: string;
    email: string;
    name: string;
    is_active: boolean;
    role: string;
    subscription?: {
      plan: string;
      status: string;
      end_date?: string;
    };
    created_at: string;
    last_login?: string;
  };
  message: string;
}

export interface SessionInfo {
  conversation_id: string;
  current_step: OnboardingStep;
  collected_data: {
    name: string | null;
    email: string | null;
    email_confirmed: boolean;
  };
  mascot_mood: MascotMood;
  mascot_animation: MascotAnimation;
  message_count: number;
}

/**
 * AI Onboarding Service
 * Handles voice/text-based conversational account creation
 */
export const onboardingAIService = {
  /**
   * Start a new AI onboarding conversation
   */
  startOnboarding: (language: string = 'he'): Promise<StartOnboardingResponse> =>
    api.post('/onboarding/ai/start', { language }),

  /**
   * Send a message in the onboarding conversation
   */
  sendMessage: (
    conversationId: string,
    message: string,
    messageType: 'text' | 'voice' = 'text'
  ): Promise<SendMessageResponse> =>
    api.post('/onboarding/ai/message', {
      conversation_id: conversationId,
      message,
      message_type: messageType,
    }),

  /**
   * Complete the onboarding and create the user account
   */
  completeOnboarding: (
    conversationId: string,
    password?: string
  ): Promise<CompleteOnboardingResponse> =>
    api.post('/onboarding/ai/complete', {
      conversation_id: conversationId,
      password,
    }),

  /**
   * Get current session state
   */
  getSession: (conversationId: string): Promise<SessionInfo> =>
    api.get(`/onboarding/ai/session/${conversationId}`),

  /**
   * Cancel an onboarding session
   */
  cancelSession: (conversationId: string): Promise<{ status: string }> =>
    api.delete(`/onboarding/ai/session/${conversationId}`),
};

export default onboardingAIService;
