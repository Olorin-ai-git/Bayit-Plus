/**
 * useAccessibility Hook Tests
 *
 * Tests the composite accessibility hook that combines:
 * - Font scaling (useScaledFontSize)
 * - Reduced motion detection (useReducedMotion)
 * - RTL/direction support (useDirection from shared hooks)
 */

import { renderHook } from '@testing-library/react-native';
import { useAccessibility } from '../useAccessibility';

// Mock sub-hooks
const mockScaledFontSize = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
  '6xl': 48,
  fontScale: 1.0,
};

jest.mock('../useScaledFontSize', () => ({
  useScaledFontSize: jest.fn(() => mockScaledFontSize),
}));

jest.mock('../useReducedMotion', () => ({
  useReducedMotion: jest.fn(() => false),
}));

jest.mock('@bayit/shared-hooks', () => ({
  useDirection: jest.fn(() => ({ isRTL: false, direction: 'ltr' })),
}));

describe('useAccessibility', () => {
  describe('return shape', () => {
    test('should return all accessibility properties', () => {
      const { result } = renderHook(() => useAccessibility());

      expect(result.current).toHaveProperty('scaledFontSize');
      expect(result.current).toHaveProperty('isReduceMotionEnabled');
      expect(result.current).toHaveProperty('isRTL');
      expect(result.current).toHaveProperty('direction');
    });

    test('should return correct types for all properties', () => {
      const { result } = renderHook(() => useAccessibility());

      expect(typeof result.current.isReduceMotionEnabled).toBe('boolean');
      expect(typeof result.current.isRTL).toBe('boolean');
      expect(typeof result.current.direction).toBe('string');
      expect(typeof result.current.scaledFontSize).toBe('object');
    });
  });

  describe('font scaling', () => {
    test('should return scaled font sizes at 1.0 scale', () => {
      const { result } = renderHook(() => useAccessibility());

      expect(result.current.scaledFontSize.base).toBe(16);
      expect(result.current.scaledFontSize.lg).toBe(18);
      expect(result.current.scaledFontSize.xl).toBe(20);
    });

    test('should expose fontScale value', () => {
      const { result } = renderHook(() => useAccessibility());

      expect(result.current.scaledFontSize.fontScale).toBe(1.0);
    });

    test('should return all font size tiers', () => {
      const { result } = renderHook(() => useAccessibility());
      const sizes = result.current.scaledFontSize;

      expect(sizes.xs).toBeDefined();
      expect(sizes.sm).toBeDefined();
      expect(sizes.base).toBeDefined();
      expect(sizes.lg).toBeDefined();
      expect(sizes.xl).toBeDefined();
      expect(sizes['2xl']).toBeDefined();
      expect(sizes['3xl']).toBeDefined();
      expect(sizes['4xl']).toBeDefined();
      expect(sizes['6xl']).toBeDefined();
    });

    test('should report larger font sizes with increased scale', () => {
      const { useScaledFontSize } = require('../useScaledFontSize');
      useScaledFontSize.mockReturnValueOnce({
        ...mockScaledFontSize,
        base: 24,
        lg: 27,
        xl: 30,
        fontScale: 1.5,
      });

      const { result } = renderHook(() => useAccessibility());

      expect(result.current.scaledFontSize.base).toBe(24);
      expect(result.current.scaledFontSize.fontScale).toBe(1.5);
    });
  });

  describe('reduced motion', () => {
    test('should default to reduced motion disabled', () => {
      const { result } = renderHook(() => useAccessibility());

      expect(result.current.isReduceMotionEnabled).toBe(false);
    });

    test('should reflect reduced motion enabled', () => {
      const { useReducedMotion } = require('../useReducedMotion');
      useReducedMotion.mockReturnValueOnce(true);

      const { result } = renderHook(() => useAccessibility());

      expect(result.current.isReduceMotionEnabled).toBe(true);
    });
  });

  describe('RTL and direction', () => {
    test('should default to LTR direction', () => {
      const { result } = renderHook(() => useAccessibility());

      expect(result.current.isRTL).toBe(false);
      expect(result.current.direction).toBe('ltr');
    });

    test('should reflect RTL when Hebrew is active', () => {
      const { useDirection } = require('@bayit/shared-hooks');
      useDirection.mockReturnValueOnce({ isRTL: true, direction: 'rtl' });

      const { result } = renderHook(() => useAccessibility());

      expect(result.current.isRTL).toBe(true);
      expect(result.current.direction).toBe('rtl');
    });
  });

  describe('combined state', () => {
    test('should combine all accessibility features coherently', () => {
      const { useReducedMotion } = require('../useReducedMotion');
      const { useDirection } = require('@bayit/shared-hooks');

      useReducedMotion.mockReturnValueOnce(true);
      useDirection.mockReturnValueOnce({ isRTL: true, direction: 'rtl' });

      const { result } = renderHook(() => useAccessibility());

      expect(result.current.isReduceMotionEnabled).toBe(true);
      expect(result.current.isRTL).toBe(true);
      expect(result.current.direction).toBe('rtl');
      expect(result.current.scaledFontSize.base).toBe(16);
    });

    test('should remain stable across re-renders with same inputs', () => {
      const { result, rerender } = renderHook(() => useAccessibility());

      const firstRender = result.current;
      rerender({});
      const secondRender = result.current;

      expect(firstRender.isReduceMotionEnabled).toBe(secondRender.isReduceMotionEnabled);
      expect(firstRender.isRTL).toBe(secondRender.isRTL);
      expect(firstRender.direction).toBe(secondRender.direction);
    });
  });
});
