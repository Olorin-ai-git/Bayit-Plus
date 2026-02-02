/**
 * Comprehensive Tests for useAvatarStateMachine Hook
 *
 * Tests cover:
 * - State machine initialization
 * - Core state transitions (dormant → listening → processing → responding)
 * - Visual form transitions (hat ↔ wizard)
 * - Interruption handling
 * - Timeout behaviors
 * - Invalid transition rejection
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useAvatarStateMachine } from '../useAvatarStateMachine';
import { useSupportStore } from '../../stores/supportStore';

// Mock the support store
jest.mock('../../stores/supportStore', () => ({
  useSupportStore: jest.fn(),
}));

const mockSetAvatarCoreState = jest.fn();
const mockSetAvatarVisualForm = jest.fn();
const mockHandleInterruption = jest.fn();
const mockClearInterruption = jest.fn();

const createMockStore = (overrides = {}) => ({
  avatarCoreState: 'dormant' as const,
  avatarVisualForm: 'hat' as const,
  isInterrupted: false,
  currentDialogue: null,
  setAvatarCoreState: mockSetAvatarCoreState,
  setAvatarVisualForm: mockSetAvatarVisualForm,
  handleInterruption: mockHandleInterruption,
  clearInterruption: mockClearInterruption,
  ...overrides,
});

describe('useAvatarStateMachine Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    (useSupportStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = createMockStore();
      return selector ? selector(state) : state;
    });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Initialization', () => {
    it('should initialize with dormant state', () => {
      const { result } = renderHook(() => useAvatarStateMachine());

      expect(result.current.currentState).toBe('dormant');
      expect(result.current.visualForm).toBe('hat');
      expect(result.current.isInterrupted).toBe(false);
    });

    it('should expose state transition functions', () => {
      const { result } = renderHook(() => useAvatarStateMachine());

      expect(typeof result.current.summonWizard).toBe('function');
      expect(typeof result.current.dismissWizard).toBe('function');
      expect(typeof result.current.transitionTo).toBe('function');
      expect(typeof result.current.handleInterruption).toBe('function');
    });
  });

  describe('Wizard Summoning', () => {
    it('should transition from hat to wizard on summon', async () => {
      const { result } = renderHook(() => useAvatarStateMachine());

      act(() => {
        result.current.summonWizard();
      });

      expect(mockSetAvatarVisualForm).toHaveBeenCalledWith('wizard');
      expect(mockSetAvatarCoreState).toHaveBeenCalledWith('listening');
    });

    it('should not summon wizard if already in wizard form', () => {
      (useSupportStore as unknown as jest.Mock).mockImplementation((selector) => {
        const state = createMockStore({ avatarVisualForm: 'wizard' });
        return selector ? selector(state) : state;
      });

      const { result } = renderHook(() => useAvatarStateMachine());

      act(() => {
        result.current.summonWizard();
      });

      // Should not call setAvatarVisualForm if already wizard
      expect(mockSetAvatarVisualForm).not.toHaveBeenCalled();
    });
  });

  describe('Wizard Dismissal', () => {
    it('should transition from wizard to hat on dismiss', async () => {
      (useSupportStore as unknown as jest.Mock).mockImplementation((selector) => {
        const state = createMockStore({
          avatarVisualForm: 'wizard',
          avatarCoreState: 'listening',
        });
        return selector ? selector(state) : state;
      });

      const { result } = renderHook(() => useAvatarStateMachine());

      act(() => {
        result.current.dismissWizard();
      });

      expect(mockSetAvatarCoreState).toHaveBeenCalledWith('dormant');
      expect(mockSetAvatarVisualForm).toHaveBeenCalledWith('hat');
    });
  });

  describe('State Transitions', () => {
    it('should transition from listening to processing', async () => {
      (useSupportStore as unknown as jest.Mock).mockImplementation((selector) => {
        const state = createMockStore({
          avatarCoreState: 'listening',
          avatarVisualForm: 'wizard',
        });
        return selector ? selector(state) : state;
      });

      const { result } = renderHook(() => useAvatarStateMachine());

      act(() => {
        result.current.transitionTo('processing');
      });

      expect(mockSetAvatarCoreState).toHaveBeenCalledWith('processing');
    });

    it('should transition from processing to responding', async () => {
      (useSupportStore as unknown as jest.Mock).mockImplementation((selector) => {
        const state = createMockStore({
          avatarCoreState: 'processing',
          avatarVisualForm: 'wizard',
        });
        return selector ? selector(state) : state;
      });

      const { result } = renderHook(() => useAvatarStateMachine());

      act(() => {
        result.current.transitionTo('responding');
      });

      expect(mockSetAvatarCoreState).toHaveBeenCalledWith('responding');
    });

    it('should transition from responding back to listening', async () => {
      (useSupportStore as unknown as jest.Mock).mockImplementation((selector) => {
        const state = createMockStore({
          avatarCoreState: 'responding',
          avatarVisualForm: 'wizard',
        });
        return selector ? selector(state) : state;
      });

      const { result } = renderHook(() => useAvatarStateMachine());

      act(() => {
        result.current.transitionTo('listening');
      });

      expect(mockSetAvatarCoreState).toHaveBeenCalledWith('listening');
    });

    it('should reject invalid state transitions', async () => {
      (useSupportStore as unknown as jest.Mock).mockImplementation((selector) => {
        const state = createMockStore({
          avatarCoreState: 'dormant',
          avatarVisualForm: 'hat',
        });
        return selector ? selector(state) : state;
      });

      const { result } = renderHook(() => useAvatarStateMachine());

      // Trying to transition directly from dormant to responding should fail
      act(() => {
        result.current.transitionTo('responding');
      });

      // Should not have transitioned
      expect(mockSetAvatarCoreState).not.toHaveBeenCalledWith('responding');
    });
  });

  describe('Interruption Handling', () => {
    it('should handle interruption during processing', async () => {
      (useSupportStore as unknown as jest.Mock).mockImplementation((selector) => {
        const state = createMockStore({
          avatarCoreState: 'processing',
          avatarVisualForm: 'wizard',
        });
        return selector ? selector(state) : state;
      });

      const { result } = renderHook(() => useAvatarStateMachine());

      act(() => {
        result.current.handleInterruption('user_speech');
      });

      expect(mockHandleInterruption).toHaveBeenCalledWith('user_speech', expect.any(Object));
    });

    it('should transition to interrupted state', async () => {
      (useSupportStore as unknown as jest.Mock).mockImplementation((selector) => {
        const state = createMockStore({
          avatarCoreState: 'responding',
          avatarVisualForm: 'wizard',
        });
        return selector ? selector(state) : state;
      });

      const { result } = renderHook(() => useAvatarStateMachine());

      act(() => {
        result.current.transitionTo('interrupted');
      });

      expect(mockSetAvatarCoreState).toHaveBeenCalledWith('interrupted');
    });

    it('should recover from interruption to listening', async () => {
      (useSupportStore as unknown as jest.Mock).mockImplementation((selector) => {
        const state = createMockStore({
          avatarCoreState: 'interrupted',
          avatarVisualForm: 'wizard',
          isInterrupted: true,
        });
        return selector ? selector(state) : state;
      });

      const { result } = renderHook(() => useAvatarStateMachine());

      act(() => {
        result.current.clearInterruption();
        result.current.transitionTo('listening');
      });

      expect(mockClearInterruption).toHaveBeenCalled();
    });
  });

  describe('Confused State', () => {
    it('should transition to confused state on error', async () => {
      (useSupportStore as unknown as jest.Mock).mockImplementation((selector) => {
        const state = createMockStore({
          avatarCoreState: 'processing',
          avatarVisualForm: 'wizard',
        });
        return selector ? selector(state) : state;
      });

      const { result } = renderHook(() => useAvatarStateMachine());

      act(() => {
        result.current.transitionTo('confused');
      });

      expect(mockSetAvatarCoreState).toHaveBeenCalledWith('confused');
    });

    it('should recover from confused to listening', async () => {
      (useSupportStore as unknown as jest.Mock).mockImplementation((selector) => {
        const state = createMockStore({
          avatarCoreState: 'confused',
          avatarVisualForm: 'wizard',
        });
        return selector ? selector(state) : state;
      });

      const { result } = renderHook(() => useAvatarStateMachine());

      act(() => {
        result.current.transitionTo('listening');
      });

      expect(mockSetAvatarCoreState).toHaveBeenCalledWith('listening');
    });
  });

  describe('Timeout Behavior', () => {
    it('should auto-dismiss after idle timeout', async () => {
      (useSupportStore as unknown as jest.Mock).mockImplementation((selector) => {
        const state = createMockStore({
          avatarCoreState: 'listening',
          avatarVisualForm: 'wizard',
        });
        return selector ? selector(state) : state;
      });

      const { result } = renderHook(() =>
        useAvatarStateMachine({ idleTimeout: 5000 })
      );

      // Advance time past idle timeout
      act(() => {
        jest.advanceTimersByTime(5500);
      });

      await waitFor(() => {
        expect(mockSetAvatarCoreState).toHaveBeenCalledWith('dormant');
      });
    });

    it('should reset idle timer on interaction', async () => {
      (useSupportStore as unknown as jest.Mock).mockImplementation((selector) => {
        const state = createMockStore({
          avatarCoreState: 'listening',
          avatarVisualForm: 'wizard',
        });
        return selector ? selector(state) : state;
      });

      const { result } = renderHook(() =>
        useAvatarStateMachine({ idleTimeout: 5000 })
      );

      // Advance part way
      act(() => {
        jest.advanceTimersByTime(3000);
      });

      // Interact to reset timer
      act(() => {
        result.current.resetIdleTimer();
      });

      // Advance another 3 seconds (total 6, but timer was reset)
      act(() => {
        jest.advanceTimersByTime(3000);
      });

      // Should not have dismissed yet
      expect(mockSetAvatarCoreState).not.toHaveBeenCalledWith('dormant');
    });
  });

  describe('Voice State Integration', () => {
    it('should get correct gesture for listening state', () => {
      (useSupportStore as unknown as jest.Mock).mockImplementation((selector) => {
        const state = createMockStore({
          avatarCoreState: 'listening',
          avatarVisualForm: 'wizard',
        });
        return selector ? selector(state) : state;
      });

      const { result } = renderHook(() => useAvatarStateMachine());

      expect(result.current.currentGesture).toBe('listening');
    });

    it('should get correct gesture for processing state', () => {
      (useSupportStore as unknown as jest.Mock).mockImplementation((selector) => {
        const state = createMockStore({
          avatarCoreState: 'processing',
          avatarVisualForm: 'wizard',
        });
        return selector ? selector(state) : state;
      });

      const { result } = renderHook(() => useAvatarStateMachine());

      expect(result.current.currentGesture).toBe('thinking');
    });

    it('should get correct gesture for responding state', () => {
      (useSupportStore as unknown as jest.Mock).mockImplementation((selector) => {
        const state = createMockStore({
          avatarCoreState: 'responding',
          avatarVisualForm: 'wizard',
        });
        return selector ? selector(state) : state;
      });

      const { result } = renderHook(() => useAvatarStateMachine());

      expect(result.current.currentGesture).toBe('presenting');
    });

    it('should get idle gesture for dormant state', () => {
      const { result } = renderHook(() => useAvatarStateMachine());

      expect(result.current.currentGesture).toBe('idle');
    });
  });
});
