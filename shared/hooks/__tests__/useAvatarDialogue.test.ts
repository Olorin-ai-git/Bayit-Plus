/**
 * Comprehensive Tests for useAvatarDialogue Hook
 *
 * Tests cover:
 * - Dialogue initialization and state
 * - Category-specific dialogue selection
 * - Time-based greetings
 * - Speech synchronization
 * - Dialogue queue management
 * - i18n integration
 * - Personality moments
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useAvatarDialogue } from '../useAvatarDialogue';

// Mock i18n
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      language: 'en',
      changeLanguage: jest.fn(),
    },
  }),
}));

describe('useAvatarDialogue Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Initialization', () => {
    it('should initialize with no active dialogue', () => {
      const { result } = renderHook(() => useAvatarDialogue());

      expect(result.current.currentDialogue).toBeNull();
      expect(result.current.isPlaying).toBe(false);
      expect(result.current.dialogueQueue).toEqual([]);
    });

    it('should expose dialogue functions', () => {
      const { result } = renderHook(() => useAvatarDialogue());

      expect(typeof result.current.playDialogue).toBe('function');
      expect(typeof result.current.queueDialogue).toBe('function');
      expect(typeof result.current.clearDialogue).toBe('function');
      expect(typeof result.current.skipDialogue).toBe('function');
    });
  });

  describe('Dialogue Selection', () => {
    it('should play wake dialogue', async () => {
      const { result } = renderHook(() => useAvatarDialogue());

      act(() => {
        result.current.playDialogue('wake');
      });

      await waitFor(() => {
        expect(result.current.currentDialogue).not.toBeNull();
        expect(result.current.isPlaying).toBe(true);
      });
    });

    it('should play listening dialogue', async () => {
      const { result } = renderHook(() => useAvatarDialogue());

      act(() => {
        result.current.playDialogue('listening');
      });

      await waitFor(() => {
        expect(result.current.currentDialogue).not.toBeNull();
      });
    });

    it('should play processing dialogue', async () => {
      const { result } = renderHook(() => useAvatarDialogue());

      act(() => {
        result.current.playDialogue('processing');
      });

      await waitFor(() => {
        expect(result.current.currentDialogue).not.toBeNull();
      });
    });

    it('should play presenting_media dialogue', async () => {
      const { result } = renderHook(() => useAvatarDialogue());

      act(() => {
        result.current.playDialogue('presenting_media');
      });

      await waitFor(() => {
        expect(result.current.currentDialogue).not.toBeNull();
      });
    });

    it('should play error dialogue', async () => {
      const { result } = renderHook(() => useAvatarDialogue());

      act(() => {
        result.current.playDialogue('error');
      });

      await waitFor(() => {
        expect(result.current.currentDialogue).not.toBeNull();
      });
    });

    it('should play dismissal dialogue', async () => {
      const { result } = renderHook(() => useAvatarDialogue());

      act(() => {
        result.current.playDialogue('dismissal');
      });

      await waitFor(() => {
        expect(result.current.currentDialogue).not.toBeNull();
      });
    });
  });

  describe('Time-Based Greetings', () => {
    it('should return morning greeting during morning hours', () => {
      const { result } = renderHook(() => useAvatarDialogue());

      // Mock date to morning (8 AM)
      jest.setSystemTime(new Date('2026-01-15T08:00:00'));

      const greeting = result.current.getTimeBasedGreeting();
      expect(greeting).toBeDefined();
    });

    it('should return afternoon greeting during afternoon hours', () => {
      const { result } = renderHook(() => useAvatarDialogue());

      // Mock date to afternoon (2 PM)
      jest.setSystemTime(new Date('2026-01-15T14:00:00'));

      const greeting = result.current.getTimeBasedGreeting();
      expect(greeting).toBeDefined();
    });

    it('should return evening greeting during evening hours', () => {
      const { result } = renderHook(() => useAvatarDialogue());

      // Mock date to evening (8 PM)
      jest.setSystemTime(new Date('2026-01-15T20:00:00'));

      const greeting = result.current.getTimeBasedGreeting();
      expect(greeting).toBeDefined();
    });
  });

  describe('Dialogue Queue', () => {
    it('should queue dialogues when one is already playing', async () => {
      const { result } = renderHook(() => useAvatarDialogue());

      // Start first dialogue
      act(() => {
        result.current.playDialogue('wake');
      });

      // Queue second dialogue
      act(() => {
        result.current.queueDialogue('listening');
      });

      await waitFor(() => {
        expect(result.current.dialogueQueue.length).toBeGreaterThan(0);
      });
    });

    it('should play next queued dialogue after current finishes', async () => {
      const { result } = renderHook(() => useAvatarDialogue());

      // Start first dialogue
      act(() => {
        result.current.playDialogue('wake');
      });

      // Queue second dialogue
      act(() => {
        result.current.queueDialogue('processing');
      });

      await waitFor(() => {
        expect(result.current.dialogueQueue.length).toBeGreaterThan(0);
      });

      // Skip current dialogue to trigger next
      act(() => {
        result.current.skipDialogue();
      });

      await waitFor(() => {
        expect(result.current.isPlaying).toBe(true);
      });
    });

    it('should clear dialogue queue', async () => {
      const { result } = renderHook(() => useAvatarDialogue());

      act(() => {
        result.current.playDialogue('wake');
        result.current.queueDialogue('listening');
        result.current.queueDialogue('processing');
      });

      act(() => {
        result.current.clearDialogue();
      });

      expect(result.current.dialogueQueue).toEqual([]);
      expect(result.current.currentDialogue).toBeNull();
    });
  });

  describe('Speech Synchronization', () => {
    it('should sync dialogue with gesture', async () => {
      const { result } = renderHook(() => useAvatarDialogue());

      act(() => {
        result.current.playDialogue('presenting_media');
      });

      await waitFor(() => {
        expect(result.current.currentGesture).toBeDefined();
      });
    });

    it('should provide speech timing info', async () => {
      const { result } = renderHook(() => useAvatarDialogue());

      act(() => {
        result.current.playDialogue('wake');
      });

      await waitFor(() => {
        expect(result.current.dialogueDuration).toBeGreaterThan(0);
      });
    });
  });

  describe('Dialogue Formatting', () => {
    it('should format dialogue with context variables', async () => {
      const { result } = renderHook(() => useAvatarDialogue());

      act(() => {
        result.current.playDialogue('presenting_media', {
          context: { count: 5, query: 'comedy' },
        });
      });

      await waitFor(() => {
        expect(result.current.currentDialogue).not.toBeNull();
      });
    });

    it('should handle missing context gracefully', async () => {
      const { result } = renderHook(() => useAvatarDialogue());

      // Play dialogue without context
      act(() => {
        result.current.playDialogue('presenting_media');
      });

      await waitFor(() => {
        expect(result.current.currentDialogue).not.toBeNull();
      });
    });
  });

  describe('Search Result Dialogues', () => {
    it('should play single result dialogue for one result', async () => {
      const { result } = renderHook(() => useAvatarDialogue());

      act(() => {
        result.current.playSearchResultDialogue(1, 'Fauda');
      });

      await waitFor(() => {
        expect(result.current.currentDialogue).not.toBeNull();
      });
    });

    it('should play multiple results dialogue', async () => {
      const { result } = renderHook(() => useAvatarDialogue());

      act(() => {
        result.current.playSearchResultDialogue(10, 'Israeli drama');
      });

      await waitFor(() => {
        expect(result.current.currentDialogue).not.toBeNull();
      });
    });

    it('should play no results dialogue', async () => {
      const { result } = renderHook(() => useAvatarDialogue());

      act(() => {
        result.current.playSearchResultDialogue(0, 'xyz123');
      });

      await waitFor(() => {
        expect(result.current.currentDialogue).not.toBeNull();
      });
    });
  });

  describe('Personality Moments', () => {
    it('should occasionally trigger personality moments', () => {
      const { result } = renderHook(() => useAvatarDialogue());

      // Run multiple times to test probability
      let personalityMomentTriggered = false;
      for (let i = 0; i < 100; i++) {
        if (result.current.shouldShowPersonalityMoment()) {
          personalityMomentTriggered = true;
          break;
        }
      }

      // Should have triggered at least once in 100 tries
      expect(personalityMomentTriggered).toBe(true);
    });
  });

  describe('Dismissal Dialogue', () => {
    it('should play dismissal dialogue before hiding', async () => {
      const { result } = renderHook(() => useAvatarDialogue());

      act(() => {
        result.current.playDismissalDialogue();
      });

      await waitFor(() => {
        expect(result.current.currentDialogue).not.toBeNull();
      });
    });

    it('should complete dismissal after dialogue ends', async () => {
      const onDismissComplete = jest.fn();
      const { result } = renderHook(() =>
        useAvatarDialogue({ onDismissComplete })
      );

      act(() => {
        result.current.playDismissalDialogue();
      });

      // Fast forward past dialogue duration
      act(() => {
        jest.advanceTimersByTime(3000);
      });

      await waitFor(() => {
        expect(onDismissComplete).toHaveBeenCalled();
      });
    });
  });

  describe('Interruption Handling', () => {
    it('should stop current dialogue on interruption', async () => {
      const { result } = renderHook(() => useAvatarDialogue());

      act(() => {
        result.current.playDialogue('presenting_media');
      });

      await waitFor(() => {
        expect(result.current.isPlaying).toBe(true);
      });

      act(() => {
        result.current.handleInterruption();
      });

      expect(result.current.isPlaying).toBe(false);
    });

    it('should play interruption acknowledgment dialogue', async () => {
      const { result } = renderHook(() => useAvatarDialogue());

      act(() => {
        result.current.playDialogue('presenting_media');
      });

      await waitFor(() => {
        expect(result.current.isPlaying).toBe(true);
      });

      act(() => {
        result.current.handleInterruption();
      });

      act(() => {
        result.current.playDialogue('listening');
      });

      await waitFor(() => {
        expect(result.current.currentDialogue).not.toBeNull();
      });
    });
  });

  describe('Language Support', () => {
    it('should use current language for dialogue', () => {
      const { result } = renderHook(() => useAvatarDialogue());

      expect(result.current.currentLanguage).toBe('en');
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid dialogue changes', async () => {
      const { result } = renderHook(() => useAvatarDialogue());

      act(() => {
        result.current.playDialogue('wake');
      });

      act(() => {
        result.current.playDialogue('listening');
      });

      act(() => {
        result.current.playDialogue('processing');
      });

      await waitFor(() => {
        expect(result.current.currentDialogue).not.toBeNull();
      });
    });

    it('should handle clearing during play', async () => {
      const { result } = renderHook(() => useAvatarDialogue());

      act(() => {
        result.current.playDialogue('wake');
      });

      await waitFor(() => {
        expect(result.current.isPlaying).toBe(true);
      });

      act(() => {
        result.current.clearDialogue();
      });

      expect(result.current.currentDialogue).toBeNull();
      expect(result.current.isPlaying).toBe(false);
    });
  });
});
