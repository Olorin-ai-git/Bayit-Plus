/**
 * useReducedMotion Hook Tests
 *
 * Tests iOS Reduce Motion accessibility setting detection:
 * - Initial state check via AccessibilityInfo
 * - Event listener for setting changes
 * - Platform-specific behavior (iOS only)
 * - Error handling for AccessibilityInfo failures
 * - Listener cleanup on unmount
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { AccessibilityInfo, Platform } from 'react-native';
import { useReducedMotion } from '../useReducedMotion';

const mockRemove = jest.fn();

jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    Platform: {
      OS: 'ios',
      select: jest.fn(),
    },
    AccessibilityInfo: {
      isReduceMotionEnabled: jest.fn().mockResolvedValue(false),
      addEventListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
    },
    Dimensions: {
      get: jest.fn().mockReturnValue({ width: 390, height: 844 }),
      addEventListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
    },
    PixelRatio: {
      getFontScale: jest.fn().mockReturnValue(1.0),
    },
  };
});

describe('useReducedMotion', () => {
  let reduceMotionListener: ((enabled: boolean) => void) | null = null;

  beforeEach(() => {
    reduceMotionListener = null;
    mockRemove.mockClear();

    (Platform as any).OS = 'ios';
    (AccessibilityInfo.isReduceMotionEnabled as jest.Mock).mockResolvedValue(false);
    (AccessibilityInfo.addEventListener as jest.Mock).mockImplementation(
      (_eventName: string, handler: (enabled: boolean) => void) => {
        reduceMotionListener = handler;
        return { remove: mockRemove };
      }
    );
  });

  describe('initial state', () => {
    test('should default to false', () => {
      const { result } = renderHook(() => useReducedMotion());

      expect(result.current).toBe(false);
    });

    test('should check reduced motion setting on mount', async () => {
      (AccessibilityInfo.isReduceMotionEnabled as jest.Mock).mockResolvedValue(true);

      const { result } = renderHook(() => useReducedMotion());

      await waitFor(() => {
        expect(result.current).toBe(true);
      });

      expect(AccessibilityInfo.isReduceMotionEnabled).toHaveBeenCalled();
    });

    test('should reflect disabled reduce motion', async () => {
      (AccessibilityInfo.isReduceMotionEnabled as jest.Mock).mockResolvedValue(false);

      const { result } = renderHook(() => useReducedMotion());

      await waitFor(() => {
        expect(AccessibilityInfo.isReduceMotionEnabled).toHaveBeenCalled();
      });

      expect(result.current).toBe(false);
    });
  });

  describe('event listener', () => {
    test('should register reduceMotionChanged listener on iOS', () => {
      renderHook(() => useReducedMotion());

      expect(AccessibilityInfo.addEventListener).toHaveBeenCalledWith(
        'reduceMotionChanged',
        expect.any(Function)
      );
    });

    test('should update state when reduce motion setting changes to enabled', async () => {
      const { result } = renderHook(() => useReducedMotion());

      expect(result.current).toBe(false);

      act(() => {
        if (reduceMotionListener) {
          reduceMotionListener(true);
        }
      });

      expect(result.current).toBe(true);
    });

    test('should update state when reduce motion setting changes to disabled', async () => {
      (AccessibilityInfo.isReduceMotionEnabled as jest.Mock).mockResolvedValue(true);

      const { result } = renderHook(() => useReducedMotion());

      await waitFor(() => {
        expect(result.current).toBe(true);
      });

      act(() => {
        if (reduceMotionListener) {
          reduceMotionListener(false);
        }
      });

      expect(result.current).toBe(false);
    });

    test('should remove listener on unmount', () => {
      const { unmount } = renderHook(() => useReducedMotion());

      unmount();

      expect(mockRemove).toHaveBeenCalled();
    });
  });

  describe('platform behavior', () => {
    test('should not check reduce motion on Android', () => {
      (Platform as any).OS = 'android';

      const { result } = renderHook(() => useReducedMotion());

      expect(result.current).toBe(false);
      expect(AccessibilityInfo.isReduceMotionEnabled).not.toHaveBeenCalled();
    });

    test('should not register listener on Android', () => {
      (Platform as any).OS = 'android';

      renderHook(() => useReducedMotion());

      expect(AccessibilityInfo.addEventListener).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    test('should default to false when isReduceMotionEnabled rejects', async () => {
      (AccessibilityInfo.isReduceMotionEnabled as jest.Mock).mockRejectedValue(
        new Error('AccessibilityInfo unavailable')
      );

      const { result } = renderHook(() => useReducedMotion());

      await waitFor(() => {
        expect(AccessibilityInfo.isReduceMotionEnabled).toHaveBeenCalled();
      });

      expect(result.current).toBe(false);
    });

    test('should handle null subscription gracefully on unmount', () => {
      (AccessibilityInfo.addEventListener as jest.Mock).mockReturnValue(null);

      const { unmount } = renderHook(() => useReducedMotion());

      expect(() => unmount()).not.toThrow();
    });
  });

  describe('return type', () => {
    test('should always return a boolean value', () => {
      const { result } = renderHook(() => useReducedMotion());

      expect(typeof result.current).toBe('boolean');
    });
  });
});
