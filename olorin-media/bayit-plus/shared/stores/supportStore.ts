/**
 * Support Store
 * Global state for enterprise support system with voice avatar
 * Manages voice interaction state, portal state, and ticket management
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * Voice interaction states following the state machine:
 * IDLE -> LISTENING -> PROCESSING -> SPEAKING -> IDLE
 *                          ^                  |
 *                          |__________________|
 *                              (interrupt)
 */
export type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking' | 'error';

/**
 * Gesture states for wizard expressive animations
 * These overlay on top of VoiceState for emotional/contextual responses
 */
export type GestureState =
  | 'browsing'   // When searching/browsing content catalog
  | 'cheering'   // Positive response, success, celebration
  | 'clapping'   // Applause, congratulations
  | 'conjuring'  // Processing magic, loading
  | 'crying'     // Sad response, error, not found
  | 'shrugging'  // Don't know, can't help, uncertain
  | 'facepalm';  // Frustration, mistake

/**
 * Support portal tabs
 */
export type SupportTab = 'docs' | 'faq' | 'contact' | 'tickets';

/**
 * Support ticket status
 */
export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

/**
 * Support ticket priority
 */
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';

/**
 * Support ticket category
 */
export type TicketCategory = 'billing' | 'technical' | 'feature' | 'general';

/**
 * Support ticket model (frontend representation)
 */
export interface SupportTicket {
  id: string;
  subject: string;
  message: string;
  category: TicketCategory;
  status: TicketStatus;
  priority: TicketPriority;
  language: string;
  conversationId?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
}

/**
 * Voice conversation message
 */
export interface VoiceMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  audioUrl?: string;
}

/**
 * Documentation category
 */
export interface DocCategory {
  id: string;
  titleKey: string;
  icon: string;
  articles: DocArticle[];
}

/**
 * Documentation article
 */
export interface DocArticle {
  id: string;
  slug: string;
  titleKey: string;
  category: string;
  language: string;
}

interface SupportStore {
  // Voice state
  voiceState: VoiceState;
  currentTranscript: string;
  lastResponse: string;
  isVoiceModalOpen: boolean;
  voiceMessages: VoiceMessage[];
  voiceConversationId: string | null;

  // Portal state
  isPortalOpen: boolean;
  activeTab: SupportTab;

  // Documentation state
  currentDocPath: string | null;
  docSearchQuery: string;
  docCategories: DocCategory[];

  // Ticket state
  tickets: SupportTicket[];
  selectedTicketId: string | null;
  isSubmittingTicket: boolean;

  // Wake word state
  isWakeWordEnabled: boolean;
  wakeWordDetected: boolean;

  // Wizard intro state
  hasSeenWizardIntro: boolean;
  /** Whether wizard intro has been played this session (not persisted, resets on app close) */
  hasPlayedSessionIntro: boolean;
  /** Current intro text being spoken (for display in modal) */
  currentIntroText: string | null;

  // Gesture state for expressive wizard animations
  gestureState: GestureState | null;
  /** Whether spritesheet animation is currently playing */
  isAnimatingGesture: boolean;

  // Audio level for visual feedback (0-1)
  audioLevel: number;

  // Error state
  lastError: string | null;

  // Voice error toast (for mic/connection issues)
  voiceError: { message: string; type: 'mic' | 'connection' | 'general' } | null;

  // Voice actions
  setVoiceState: (state: VoiceState) => void;
  setCurrentTranscript: (transcript: string) => void;
  setLastResponse: (response: string) => void;
  openVoiceModal: () => void;
  closeVoiceModal: () => void;
  addVoiceMessage: (message: Omit<VoiceMessage, 'id' | 'timestamp'>) => void;
  clearVoiceMessages: () => void;
  setVoiceConversationId: (id: string | null) => void;

  // Portal actions
  openPortal: (tab?: SupportTab) => void;
  closePortal: () => void;
  setActiveTab: (tab: SupportTab) => void;

  // Documentation actions
  setCurrentDocPath: (path: string | null) => void;
  setDocSearchQuery: (query: string) => void;
  setDocCategories: (categories: DocCategory[]) => void;

  // Ticket actions
  setTickets: (tickets: SupportTicket[]) => void;
  addTicket: (ticket: SupportTicket) => void;
  updateTicket: (id: string, updates: Partial<SupportTicket>) => void;
  selectTicket: (id: string | null) => void;
  setSubmittingTicket: (isSubmitting: boolean) => void;

  // Wake word actions
  setWakeWordEnabled: (enabled: boolean) => void;
  onWakeWordDetected: () => void;
  resetWakeWordDetected: () => void;

  // Wizard intro actions
  markWizardIntroSeen: () => void;
  /** Mark session intro as played (session-only, not persisted) */
  setSessionIntroPlayed: (played: boolean) => void;
  /** Set current intro text being spoken */
  setCurrentIntroText: (text: string | null) => void;

  // Gesture actions
  /** Set the current gesture state (overlay on voice state) */
  setGestureState: (state: GestureState | null) => void;
  /** Set whether gesture animation is playing */
  setIsAnimatingGesture: (isAnimating: boolean) => void;
  /** Clear gesture state and animation */
  clearGesture: () => void;

  // Audio level actions
  /** Set audio level for visual feedback (0-1) */
  setAudioLevel: (level: number) => void;

  // Voice error actions (for toast notifications)
  /** Set voice error for toast display */
  setVoiceError: (error: { message: string; type: 'mic' | 'connection' | 'general' } | null) => void;
  /** Show mic error toast */
  showMicError: (message: string) => void;
  /** Show connection error toast */
  showConnectionError: (message: string) => void;
  /** Clear voice error toast */
  clearVoiceError: () => void;

  // Error actions
  setError: (error: string | null) => void;
  clearError: () => void;

  // Reset
  reset: () => void;
}

const initialState = {
  // Voice state
  voiceState: 'idle' as VoiceState,
  currentTranscript: '',
  lastResponse: '',
  isVoiceModalOpen: false,
  voiceMessages: [] as VoiceMessage[],
  voiceConversationId: null as string | null,

  // Portal state
  isPortalOpen: false,
  activeTab: 'docs' as SupportTab,

  // Documentation state
  currentDocPath: null as string | null,
  docSearchQuery: '',
  docCategories: [] as DocCategory[],

  // Ticket state
  tickets: [] as SupportTicket[],
  selectedTicketId: null as string | null,
  isSubmittingTicket: false,

  // Wake word state
  isWakeWordEnabled: true,
  wakeWordDetected: false,

  // Wizard intro state
  hasSeenWizardIntro: false,
  hasPlayedSessionIntro: false,
  currentIntroText: null as string | null,

  // Gesture state
  gestureState: null as GestureState | null,
  isAnimatingGesture: false,

  // Audio level
  audioLevel: 0,

  // Error state
  lastError: null as string | null,

  // Voice error toast
  voiceError: null as { message: string; type: 'mic' | 'connection' | 'general' } | null,
};

export const useSupportStore = create<SupportStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Voice actions
      setVoiceState: (state: VoiceState) => {
        set({ voiceState: state });
        // Clear error when transitioning to a non-error state
        if (state !== 'error') {
          set({ lastError: null });
        }
      },

      setCurrentTranscript: (transcript: string) => set({ currentTranscript: transcript }),

      setLastResponse: (response: string) => set({ lastResponse: response }),

      openVoiceModal: () => set({
        isVoiceModalOpen: true,
        wakeWordDetected: false,
        voiceState: 'idle',
      }),

      closeVoiceModal: () => set({
        isVoiceModalOpen: false,
        voiceState: 'idle',
        currentTranscript: '',
      }),

      addVoiceMessage: (message: Omit<VoiceMessage, 'id' | 'timestamp'>) => {
        const newMessage: VoiceMessage = {
          ...message,
          id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date().toISOString(),
        };
        set((state) => ({
          voiceMessages: [...state.voiceMessages, newMessage],
        }));
      },

      clearVoiceMessages: () => set({ voiceMessages: [] }),

      setVoiceConversationId: (id: string | null) => set({ voiceConversationId: id }),

      // Portal actions
      openPortal: (tab?: SupportTab) => set({
        isPortalOpen: true,
        activeTab: tab || get().activeTab,
      }),

      closePortal: () => set({ isPortalOpen: false }),

      setActiveTab: (tab: SupportTab) => set({ activeTab: tab }),

      // Documentation actions
      setCurrentDocPath: (path: string | null) => set({ currentDocPath: path }),

      setDocSearchQuery: (query: string) => set({ docSearchQuery: query }),

      setDocCategories: (categories: DocCategory[]) => set({ docCategories: categories }),

      // Ticket actions
      setTickets: (tickets: SupportTicket[]) => set({ tickets }),

      addTicket: (ticket: SupportTicket) => set((state) => ({
        tickets: [ticket, ...state.tickets],
      })),

      updateTicket: (id: string, updates: Partial<SupportTicket>) => set((state) => ({
        tickets: state.tickets.map((t) =>
          t.id === id ? { ...t, ...updates } : t
        ),
      })),

      selectTicket: (id: string | null) => set({ selectedTicketId: id }),

      setSubmittingTicket: (isSubmitting: boolean) => set({ isSubmittingTicket: isSubmitting }),

      // Wake word actions
      setWakeWordEnabled: (enabled: boolean) => set({ isWakeWordEnabled: enabled }),

      onWakeWordDetected: () => {
        set({ wakeWordDetected: true });
        // Auto-open voice modal when wake word detected
        const { isVoiceModalOpen } = get();
        if (!isVoiceModalOpen) {
          set({
            isVoiceModalOpen: true,
            voiceState: 'listening',
          });
        }
      },

      resetWakeWordDetected: () => set({ wakeWordDetected: false }),

      // Wizard intro actions
      markWizardIntroSeen: () => set({ hasSeenWizardIntro: true }),
      setSessionIntroPlayed: (played: boolean) => set({ hasPlayedSessionIntro: played }),
      setCurrentIntroText: (text: string | null) => set({ currentIntroText: text }),

      // Gesture actions
      setGestureState: (state: GestureState | null) => set({ gestureState: state }),
      setIsAnimatingGesture: (isAnimating: boolean) => set({ isAnimatingGesture: isAnimating }),
      clearGesture: () => set({ gestureState: null, isAnimatingGesture: false }),

      // Audio level actions
      setAudioLevel: (level: number) => set({ audioLevel: Math.max(0, Math.min(1, level)) }),

      // Voice error actions
      setVoiceError: (error: { message: string; type: 'mic' | 'connection' | 'general' } | null) =>
        set({ voiceError: error }),
      showMicError: (message: string) =>
        set({ voiceError: { message, type: 'mic' } }),
      showConnectionError: (message: string) =>
        set({ voiceError: { message, type: 'connection' } }),
      clearVoiceError: () => set({ voiceError: null }),

      // Error actions
      setError: (error: string | null) => set({
        lastError: error,
        voiceState: error ? 'error' : get().voiceState,
      }),

      clearError: () => set({ lastError: null }),

      // Reset
      reset: () => set(initialState),
    }),
    {
      name: 'bayit-support',
      storage: createJSONStorage(() => localStorage),
      // Only persist user preferences, not transient state like modal visibility
      partialize: (state) => ({
        isWakeWordEnabled: state.isWakeWordEnabled,
        hasSeenWizardIntro: state.hasSeenWizardIntro,
      }),
    }
  )
);

export default useSupportStore;
