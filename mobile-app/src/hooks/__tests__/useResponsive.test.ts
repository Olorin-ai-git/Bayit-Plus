/**
 * useResponsive Hook Tests
 *
 * Tests responsive breakpoint detection:
 * - Device type detection (phone vs tablet)
 * - Screen size categories (small, medium, large, tablet)
 * - Orientation detection (portrait vs landscape)
 * - Dimension change listener setup and cleanup
 */

import { renderHook, act } from '@testing-library/react-native';
import { Dimensions } from 'react-native';
import { useResponsive } from '../useResponsive';
import { DeviceType, ScreenSize } from '../../utils/responsive';

// Track dimension listeners
let dimensionChangeCallback: ((event: { window: { width: number; height: number } }) => void) | null = null;
const mockRemove = jest.fn();

jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    Dimensions: {
      get: jest.fn().mockReturnValue({ width: 390, height: 844 }),
      addEventListener: jest.fn().mockImplementation((_event: string, callback: (event: { window: { width: number; height: number } }) => void) => {
        dimensionChangeCallback = callback;
        return { remove: mockRemove };
      }),
    },
    Platform: {
      OS: 'ios',
      select: jest.fn(),
    },
    PixelRatio: {
      getFontScale: jest.fn().mockReturnValue(1.0),
    },
    AccessibilityInfo: {
      isReduceMotionEnabled: jest.fn().mockResolvedValue(false),
      addEventListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
    },
  };
});

describe('useResponsive', () => {
  beforeEach(() => {
    dimensionChangeCallback = null;
    mockRemove.mockClear();
    (Dimensions.get as jest.Mock).mockReturnValue({ width: 390, height: 844 });
  });

  describe('initial state for standard iPhone', () => {
    test('should detect phone device type', () => {
      const { result } = renderHook(() => useResponsive());

      expect(result.current.isPhone).toBe(true);
      expect(result.current.isTablet).toBe(false);
      expect(result.current.deviceType).toBe(DeviceType.PHONE);
    });

    test('should detect medium screen size for 390px width', () => {
      const { result } = renderHook(() => useResponsive());

      expect(result.current.screenSize).toBe(ScreenSize.MEDIUM);
    });

    test('should report portrait orientation', () => {
      const { result } = renderHook(() => useResponsive());

      expect(result.current.orientation).toBe('portrait');
    });

    test('should report correct dimensions', () => {
      const { result } = renderHook(() => useResponsive());

      expect(result.current.width).toBe(390);
      expect(result.current.height).toBe(844);
    });
  });

  describe('tablet detection', () => {
    test('should detect iPad as tablet', () => {
      (Dimensions.get as jest.Mock).mockReturnValue({ width: 1024, height: 1366 });

      const { result } = renderHook(() => useResponsive());

      expect(result.current.isTablet).toBe(true);
      expect(result.current.isPhone).toBe(false);
      expect(result.current.deviceType).toBe(DeviceType.TABLET);
      expect(result.current.screenSize).toBe(ScreenSize.TABLET);
    });

    test('should detect iPad mini as tablet (768px)', () => {
      (Dimensions.get as jest.Mock).mockReturnValue({ width: 768, height: 1024 });

      const { result } = renderHook(() => useResponsive());

      expect(result.current.isTablet).toBe(true);
      expect(result.current.screenSize).toBe(ScreenSize.TABLET);
    });
  });

  describe('small phone detection', () => {
    test('should detect iPhone SE as small screen', () => {
      (Dimensions.get as jest.Mock).mockReturnValue({ width: 375, height: 667 });

      const { result } = renderHook(() => useResponsive());

      expect(result.current.isPhone).toBe(true);
      expect(result.current.screenSize).toBe(ScreenSize.SMALL);
    });

    test('should detect very small phone (320px)', () => {
      (Dimensions.get as jest.Mock).mockReturnValue({ width: 320, height: 568 });

      const { result } = renderHook(() => useResponsive());

      expect(result.current.isPhone).toBe(true);
      expect(result.current.screenSize).toBe(ScreenSize.SMALL);
    });
  });

  describe('large phone detection', () => {
    test('should detect Pro Max as large screen', () => {
      (Dimensions.get as jest.Mock).mockReturnValue({ width: 430, height: 932 });

      const { result } = renderHook(() => useResponsive());

      expect(result.current.isPhone).toBe(true);
      expect(result.current.screenSize).toBe(ScreenSize.LARGE);
    });
  });

  describe('orientation detection', () => {
    test('should detect landscape orientation when width > height', () => {
      (Dimensions.get as jest.Mock).mockReturnValue({ width: 844, height: 390 });

      const { result } = renderHook(() => useResponsive());

      expect(result.current.orientation).toBe('landscape');
    });

    test('should detect portrait when width equals height as portrait', () => {
      (Dimensions.get as jest.Mock).mockReturnValue({ width: 500, height: 500 });

      const { result } = renderHook(() => useResponsive());

      // width is not > height, so portrait
      expect(result.current.orientation).toBe('portrait');
    });
  });

  describe('dimension change listener', () => {
    test('should register dimension change listener on mount', () => {
      renderHook(() => useResponsive());

      expect(Dimensions.addEventListener).toHaveBeenCalledWith(
        'change',
        expect.any(Function)
      );
    });

    test('should update dimensions when they change', () => {
      const { result } = renderHook(() => useResponsive());

      expect(result.current.width).toBe(390);

      act(() => {
        if (dimensionChangeCallback) {
          dimensionChangeCallback({
            window: { width: 844, height: 390 },
          });
        }
      });

      expect(result.current.width).toBe(844);
      expect(result.current.height).toBe(390);
    });

    test('should remove listener on unmount', () => {
      const { unmount } = renderHook(() => useResponsive());

      unmount();

      expect(mockRemove).toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    test('should handle zero dimensions', () => {
      (Dimensions.get as jest.Mock).mockReturnValue({ width: 0, height: 0 });

      const { result } = renderHook(() => useResponsive());

      expect(result.current.width).toBe(0);
      expect(result.current.height).toBe(0);
      expect(result.current.isPhone).toBe(true);
      expect(result.current.screenSize).toBe(ScreenSize.SMALL);
    });

    test('should return complete ResponsiveInfo shape', () => {
      const { result } = renderHook(() => useResponsive());

      expect(result.current).toHaveProperty('deviceType');
      expect(result.current).toHaveProperty('screenSize');
      expect(result.current).toHaveProperty('isPhone');
      expect(result.current).toHaveProperty('isTablet');
      expect(result.current).toHaveProperty('width');
      expect(result.current).toHaveProperty('height');
      expect(result.current).toHaveProperty('orientation');
    });
  });
});
