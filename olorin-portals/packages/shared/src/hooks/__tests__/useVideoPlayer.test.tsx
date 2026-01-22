/**
 * useVideoPlayer Hook Tests
 * Tests video player state management, handlers, and platform detection
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useVideoPlayer } from '@olorin/shared';

// Mock detectPlatform
jest.mock('../usePlatformDetection', () => ({
  detectPlatform: jest.fn(() => 'web'),
}));

describe('useVideoPlayer', () => {
  let mockVideoElement: Partial<HTMLVideoElement>;

  beforeEach(() => {
    // Create mock video element
    mockVideoElement = {
      play: jest.fn().mockResolvedValue(undefined),
      pause: jest.fn(),
      muted: false,
      currentTime: 0,
      duration: 100,
      load: jest.fn(),
      requestFullscreen: jest.fn().mockResolvedValue(undefined),
      setAttribute: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    };

    // Mock useRef to return our mock video element
    jest.spyOn(React, 'useRef').mockReturnValue({
      current: mockVideoElement as HTMLVideoElement,
    });

    // Mock fullscreen API
    Object.defineProperty(document, 'fullscreenElement', {
      writable: true,
      value: null,
    });

    document.exitFullscreen = jest.fn().mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with default options', () => {
      const { result } = renderHook(() => useVideoPlayer());

      expect(result.current.isPlaying).toBe(false);
      expect(result.current.isMuted).toBe(true);
      expect(result.current.isFullscreen).toBe(false);
      expect(result.current.isLoading).toBe(true);
      expect(result.current.hasError).toBe(false);
      expect(result.current.showKeyboardHelp).toBe(false);
    });

    it('should initialize with custom options', () => {
      const { result } = renderHook(() =>
        useVideoPlayer({ autoplay: true, muted: false })
      );

      expect(result.current.isPlaying).toBe(true);
      expect(result.current.isMuted).toBe(false);
    });

    it('should set webkit-playsinline attribute for iOS compatibility', () => {
      renderHook(() => useVideoPlayer());

      expect(mockVideoElement.setAttribute).toHaveBeenCalledWith('webkit-playsinline', '');
    });
  });

  describe('Play/Pause Controls', () => {
    it('should play video when togglePlay is called', async () => {
      const { result } = renderHook(() => useVideoPlayer());

      await act(async () => {
        await result.current.togglePlay();
      });

      expect(mockVideoElement.play).toHaveBeenCalled();
    });

    it('should pause video when togglePlay is called while playing', async () => {
      const { result } = renderHook(() => useVideoPlayer({ autoplay: true }));

      await act(async () => {
        await result.current.togglePlay();
      });

      expect(mockVideoElement.pause).toHaveBeenCalled();
    });

    it('should handle play errors gracefully', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      mockVideoElement.play = jest.fn().mockRejectedValue(new Error('Autoplay blocked'));

      const { result } = renderHook(() => useVideoPlayer());

      await act(async () => {
        await result.current.togglePlay();
      });

      expect(consoleWarnSpy).toHaveBeenCalledWith('Video playback failed:', expect.any(Error));
      expect(result.current.isPlaying).toBe(false);

      consoleWarnSpy.mockRestore();
    });
  });

  describe('Mute Controls', () => {
    it('should toggle mute state', () => {
      const { result } = renderHook(() => useVideoPlayer());

      act(() => {
        result.current.toggleMute();
      });

      expect(mockVideoElement.muted).toBe(true);
      expect(result.current.isMuted).toBe(true);
    });
  });

  describe('Fullscreen Controls', () => {
    it('should enter fullscreen when toggleFullscreen is called', async () => {
      const { result } = renderHook(() => useVideoPlayer());

      await act(async () => {
        await result.current.toggleFullscreen();
      });

      expect(mockVideoElement.requestFullscreen).toHaveBeenCalled();
    });

    it('should exit fullscreen when toggleFullscreen is called in fullscreen', async () => {
      Object.defineProperty(document, 'fullscreenElement', {
        writable: true,
        value: mockVideoElement,
      });

      const { result } = renderHook(() => useVideoPlayer());

      await act(async () => {
        await result.current.toggleFullscreen();
      });

      expect(document.exitFullscreen).toHaveBeenCalled();
    });

    it('should handle fullscreen errors silently', async () => {
      mockVideoElement.requestFullscreen = jest.fn().mockRejectedValue(new Error('Denied'));

      const { result } = renderHook(() => useVideoPlayer());

      await act(async () => {
        await result.current.toggleFullscreen();
      });

      // Should not throw, errors are silently handled
      expect(result.current.isFullscreen).toBe(false);
    });
  });

  describe('Skip Controls', () => {
    it('should skip forward by specified seconds', () => {
      const { result } = renderHook(() => useVideoPlayer());

      act(() => {
        result.current.skipForward(10);
      });

      expect(mockVideoElement.currentTime).toBe(10);
    });

    it('should not skip beyond video duration', () => {
      mockVideoElement.currentTime = 95;
      const { result } = renderHook(() => useVideoPlayer());

      act(() => {
        result.current.skipForward(10);
      });

      expect(mockVideoElement.currentTime).toBe(100);
    });

    it('should skip backward by specified seconds', () => {
      mockVideoElement.currentTime = 50;
      const { result } = renderHook(() => useVideoPlayer());

      act(() => {
        result.current.skipBackward(10);
      });

      expect(mockVideoElement.currentTime).toBe(40);
    });

    it('should not skip before video start', () => {
      mockVideoElement.currentTime = 5;
      const { result } = renderHook(() => useVideoPlayer());

      act(() => {
        result.current.skipBackward(10);
      });

      expect(mockVideoElement.currentTime).toBe(0);
    });
  });

  describe('Keyboard Controls', () => {
    it('should handle Space key to toggle play', async () => {
      const { result } = renderHook(() => useVideoPlayer());
      const event = { key: ' ', preventDefault: jest.fn(), target: {} } as any;

      await act(async () => {
        result.current.handleKeyDown(event);
      });

      expect(event.preventDefault).toHaveBeenCalled();
      expect(mockVideoElement.play).toHaveBeenCalled();
    });

    it('should handle M key to toggle mute', () => {
      const { result } = renderHook(() => useVideoPlayer());
      const event = { key: 'm', preventDefault: jest.fn(), target: {} } as any;

      act(() => {
        result.current.handleKeyDown(event);
      });

      expect(event.preventDefault).toHaveBeenCalled();
    });

    it('should not handle keyboard when focused on input', () => {
      const { result } = renderHook(() => useVideoPlayer());
      const event = {
        key: ' ',
        preventDefault: jest.fn(),
        target: { tagName: 'INPUT' },
      } as any;

      act(() => {
        result.current.handleKeyDown(event);
      });

      expect(event.preventDefault).not.toHaveBeenCalled();
    });
  });
});
