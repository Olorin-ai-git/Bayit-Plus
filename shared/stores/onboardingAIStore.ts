import { create } from 'zustand';
import {
  onboardingAIService,
  OnboardingStep,
  MascotMood,
  MascotAnimation,
  StartOnboardingResponse,
  SendMessageResponse,
  CompleteOnboardingResponse,
} from '../services/onboardingAIService';
import { useAuthStore } from './authStore';

interface OnboardingMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  messageType?: 'text' | 'voice';
}

interface CollectedData {
  name: string | null;
  email: string | null;
  emailConfirmed: boolean;
}

interface OnboardingAIState {
  // Session state
  conversationId: string | null;
  currentStep: OnboardingStep;
  messages: OnboardingMessage[];
  collectedData: CollectedData;

  // UI state
  isLoading: boolean;
  isProcessing: boolean;
  error: string | null;
  readyForCompletion: boolean;

  // Mascot state
  mascotMood: MascotMood;
  mascotAnimation: MascotAnimation;

  // Voice input state
  isListening: boolean;
  transcript: string;

  // Completion result
  completionResult: CompleteOnboardingResponse | null;

  // Actions
  startOnboarding: (language?: string) => Promise<StartOnboardingResponse | null>;
  sendMessage: (message: string, messageType?: 'text' | 'voice') => Promise<void>;
  completeOnboarding: (password?: string) => Promise<CompleteOnboardingResponse | null>;
  cancelOnboarding: () => Promise<void>;
  reset: () => void;
  clearError: () => void;

  // Voice actions
  setIsListening: (isListening: boolean) => void;
  setTranscript: (transcript: string) => void;
}

let messageIdCounter = 0;
const generateMessageId = () => `msg_${Date.now()}_${++messageIdCounter}`;

export const useOnboardingAIStore = create<OnboardingAIState>((set, get) => ({
  // Initial state
  conversationId: null,
  currentStep: 'greeting',
  messages: [],
  collectedData: {
    name: null,
    email: null,
    emailConfirmed: false,
  },
  isLoading: false,
  isProcessing: false,
  error: null,
  readyForCompletion: false,
  mascotMood: 'neutral',
  mascotAnimation: 'idle',
  isListening: false,
  transcript: '',
  completionResult: null,

  startOnboarding: async (language = 'he') => {
    set({ isLoading: true, error: null });

    try {
      const response = await onboardingAIService.startOnboarding(language);

      // Add greeting message
      const greetingMessage: OnboardingMessage = {
        id: generateMessageId(),
        role: 'assistant',
        content: response.message,
        timestamp: new Date().toISOString(),
      };

      set({
        conversationId: response.conversation_id,
        currentStep: response.current_step,
        messages: [greetingMessage],
        mascotMood: response.mascot_mood,
        mascotAnimation: response.mascot_animation,
        isLoading: false,
      });

      return response;
    } catch (error: any) {
      set({
        error: error.detail || 'Failed to start onboarding',
        isLoading: false,
      });
      return null;
    }
  },

  sendMessage: async (message, messageType = 'text') => {
    const { conversationId, messages } = get();

    if (!conversationId) {
      set({ error: 'No active conversation' });
      return;
    }

    // Add user message immediately
    const userMessage: OnboardingMessage = {
      id: generateMessageId(),
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
      messageType,
    };

    set({
      messages: [...messages, userMessage],
      isProcessing: true,
      error: null,
      mascotMood: 'thinking',
      mascotAnimation: 'nod',
    });

    try {
      const response = await onboardingAIService.sendMessage(
        conversationId,
        message,
        messageType
      );

      // Add assistant response
      const assistantMessage: OnboardingMessage = {
        id: generateMessageId(),
        role: 'assistant',
        content: response.message,
        timestamp: new Date().toISOString(),
      };

      set((state) => ({
        messages: [...state.messages, assistantMessage],
        currentStep: response.current_step,
        collectedData: {
          name: response.collected_data.name,
          email: response.collected_data.email,
          emailConfirmed: response.collected_data.email_confirmed,
        },
        readyForCompletion: response.ready_for_completion,
        mascotMood: response.mascot_mood,
        mascotAnimation: response.mascot_animation,
        isProcessing: false,
        transcript: '',
      }));
    } catch (error: any) {
      set({
        error: error.detail || 'Failed to send message',
        isProcessing: false,
        mascotMood: 'neutral',
        mascotAnimation: 'idle',
      });
    }
  },

  completeOnboarding: async (password) => {
    const { conversationId, readyForCompletion } = get();

    if (!conversationId) {
      set({ error: 'No active conversation' });
      return null;
    }

    if (!readyForCompletion) {
      set({ error: 'Not ready for completion' });
      return null;
    }

    set({
      isProcessing: true,
      error: null,
      mascotMood: 'thinking',
    });

    try {
      const response = await onboardingAIService.completeOnboarding(
        conversationId,
        password
      );

      if (response.success && response.access_token && response.user) {
        // Update auth store
        useAuthStore.getState().setUser(response.user as any);
        useAuthStore.setState({
          token: response.access_token,
          isAuthenticated: true,
        });
      }

      set({
        currentStep: 'complete',
        completionResult: response,
        mascotMood: 'celebrating',
        mascotAnimation: 'sparkle',
        isProcessing: false,
      });

      return response;
    } catch (error: any) {
      set({
        error: error.detail || 'Failed to complete onboarding',
        isProcessing: false,
        mascotMood: 'neutral',
        mascotAnimation: 'idle',
      });
      return null;
    }
  },

  cancelOnboarding: async () => {
    const { conversationId } = get();

    if (conversationId) {
      await onboardingAIService.cancelSession(conversationId).catch(() => {});
    }

    get().reset();
  },

  reset: () => {
    set({
      conversationId: null,
      currentStep: 'greeting',
      messages: [],
      collectedData: {
        name: null,
        email: null,
        emailConfirmed: false,
      },
      isLoading: false,
      isProcessing: false,
      error: null,
      readyForCompletion: false,
      mascotMood: 'neutral',
      mascotAnimation: 'idle',
      isListening: false,
      transcript: '',
      completionResult: null,
    });
  },

  clearError: () => set({ error: null }),

  setIsListening: (isListening) => {
    set({
      isListening,
      mascotMood: isListening ? 'listening' : 'neutral',
      mascotAnimation: isListening ? 'idle' : 'idle',
    });
  },

  setTranscript: (transcript) => set({ transcript }),
}));

export default useOnboardingAIStore;
