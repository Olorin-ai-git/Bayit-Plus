/**
 * Unit tests for useSceneDetection hook
 *
 * Tests scene boundary detection based on subtitle gap analysis.
 */
import { renderHook, act, waitFor } from '@testing-library/react';
import { useSceneDetection } from '../useSceneDetection';
import { SubtitleCue } from '@/types/subtitle';

describe('useSceneDetection', () => {
  let videoElement: HTMLVideoElement;
  let videoRef: React.RefObject<HTMLVideoElement>;

  beforeEach(() => {
    // Create mock video element
    videoElement = document.createElement('video');
    videoElement.currentTime = 0;
    Object.defineProperty(videoElement, 'paused', { value: false, writable: true });
    videoElement.pause = jest.fn(() => {
      Object.defineProperty(videoElement, 'paused', { value: true, writable: true });
    });
    videoRef = { current: videoElement };

    // Mock setInterval
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  const subtitlesWithGap: SubtitleCue[] = [
    { id: '1', index: 0, start_time: 0, end_time: 20, text: 'Line 1' },
    { id: '2', index: 1, start_time: 21, end_time: 40, text: 'Line 2' },
    // 5-second gap follows a scene satisfying the 30-second minimum.
    { id: '3', index: 2, start_time: 45, end_time: 55, text: 'Line 3' },
  ];

  const continuousSubtitles: SubtitleCue[] = [
    { id: '1', index: 0, start_time: 0, end_time: 2.5, text: 'Line 1' },
    { id: '2', index: 1, start_time: 2.8, end_time: 5, text: 'Line 2' },
    { id: '3', index: 2, start_time: 5.3, end_time: 8, text: 'Line 3' },
  ];

  test('detects scene end at 5-second subtitle gap', async () => {
    const { result } = renderHook(() =>
      useSceneDetection(videoRef, 'test-content', subtitlesWithGap, {
        enabled: true,
        gapThresholdSeconds: 5.0,
        minSceneDurationSeconds: 30.0,
      })
    );

    // Initially no scene detected
    expect(result.current.sceneEndDetected).toBe(false);
    expect(result.current.currentScene).toBeNull();

    // Fast-forward video to timestamp within first scene
    act(() => {
      videoElement.currentTime = 15;
    });

    // Advance timers to trigger scene detection check (500ms interval)
    act(() => {
      jest.advanceTimersByTime(500);
    });

    await waitFor(() => {
      expect(result.current.sceneEndDetected).toBe(false); // Still in scene
    });

    // Fast-forward to just before gap
    act(() => {
      videoElement.currentTime = 40.5;
    });

    act(() => {
      jest.advanceTimersByTime(500);
    });

    await waitFor(() => {
      expect(result.current.sceneEndDetected).toBe(true);
      expect(result.current.currentScene).not.toBeNull();
      expect(result.current.currentScene?.end_time).toBe(40);
    });
  });

  test('does not detect scenes with continuous dialogue', async () => {
    const { result } = renderHook(() =>
      useSceneDetection(videoRef, 'test-content', continuousSubtitles, {
        enabled: true,
        gapThresholdSeconds: 5.0,
      })
    );

    // Fast-forward through entire subtitle track
    act(() => {
      videoElement.currentTime = 7;
    });

    act(() => {
      jest.advanceTimersByTime(500);
    });

    await waitFor(() => {
      expect(result.current.sceneEndDetected).toBe(false);
      expect(result.current.currentScene).toBeNull();
    });
  });

  test('pauses video when scene end detected', async () => {
    const pauseSpy = jest.spyOn(videoElement, 'pause');

    renderHook(() =>
      useSceneDetection(videoRef, 'test-content', subtitlesWithGap, {
        enabled: true,
      })
    );

    act(() => {
      videoElement.currentTime = 40.5;
      jest.advanceTimersByTime(500);
    });

    await waitFor(() => {
      expect(pauseSpy).toHaveBeenCalled();
    });
  });

  test('respects minSceneDurationSeconds filter', async () => {
    const shortScene: SubtitleCue[] = [
      { id: '1', index: 0, start_time: 0, end_time: 10, text: 'Short' },
      // 5-second gap, but scene is only 10s (< 30s min)
      { id: '2', index: 1, start_time: 15, end_time: 20, text: 'Next' },
    ];

    const { result } = renderHook(() =>
      useSceneDetection(videoRef, 'test-content', shortScene, {
        enabled: true,
        minSceneDurationSeconds: 30.0,
      })
    );

    act(() => {
      videoElement.currentTime = 12;
      jest.advanceTimersByTime(500);
    });

    await waitFor(() => {
      // Scene too short, should not be detected
      expect(result.current.sceneEndDetected).toBe(false);
    });
  });

  test('resetSceneDetection clears state', async () => {
    const { result } = renderHook(() =>
      useSceneDetection(videoRef, 'test-content', subtitlesWithGap, {
        enabled: true,
      })
    );

    // Trigger scene detection
    act(() => {
      videoElement.currentTime = 40.5;
      jest.advanceTimersByTime(500);
    });

    await waitFor(() => {
      expect(result.current.sceneEndDetected).toBe(true);
    });

    // Reset
    act(() => {
      result.current.resetSceneDetection();
    });

    expect(result.current.sceneEndDetected).toBe(false);
    expect(result.current.currentScene).toBeNull();
  });

  test('disables detection when enabled is false', async () => {
    const { result } = renderHook(() =>
      useSceneDetection(videoRef, 'test-content', subtitlesWithGap, {
        enabled: false,
      })
    );

    act(() => {
      videoElement.currentTime = 40.5;
      jest.advanceTimersByTime(500);
    });

    await waitFor(() => {
      expect(result.current.sceneEndDetected).toBe(false);
    });
  });

  test('handles empty subtitles array', async () => {
    const { result } = renderHook(() =>
      useSceneDetection(videoRef, 'test-content', [], {
        enabled: true,
      })
    );

    act(() => {
      videoElement.currentTime = 10;
      jest.advanceTimersByTime(500);
    });

    await waitFor(() => {
      expect(result.current.sceneEndDetected).toBe(false);
      expect(result.current.currentScene).toBeNull();
    });
  });

  test('does not detect same scene twice (lastSceneEndTime tracking)', async () => {
    const { result } = renderHook(() =>
      useSceneDetection(videoRef, 'test-content', subtitlesWithGap, {
        enabled: true,
        minSceneDurationSeconds: 10.0,
      })
    );

    // First detection at 40.5s
    act(() => {
      videoElement.currentTime = 40.5;
      jest.advanceTimersByTime(500);
    });

    await waitFor(() => {
      expect(result.current.sceneEndDetected).toBe(true);
    });

    const firstScene = result.current.currentScene;

    // Reset and try to detect again at 41s (same scene)
    act(() => {
      result.current.resetSceneDetection();
      videoElement.currentTime = 41;
      Object.defineProperty(videoElement, 'paused', { value: false, writable: true });
      jest.advanceTimersByTime(500);
    });

    await waitFor(() => {
      // Should not detect same scene again (within minSceneDuration)
      expect(result.current.sceneEndDetected).toBe(false);
    });
  });

  test('aggregates subtitle text for scene', async () => {
    const { result } = renderHook(() =>
      useSceneDetection(videoRef, 'test-content', subtitlesWithGap, {
        enabled: true,
        minSceneDurationSeconds: 10.0,
      })
    );

    act(() => {
      videoElement.currentTime = 40.5;
      jest.advanceTimersByTime(500);
    });

    await waitFor(() => {
      expect(result.current.currentScene).not.toBeNull();
      expect(result.current.currentScene?.subtitle_text).toContain('Line 1');
      expect(result.current.currentScene?.subtitle_text).toContain('Line 2');
      expect(result.current.currentScene?.cue_count).toBe(2);
    });
  });

  test('cleans up interval on unmount', () => {
    const { unmount } = renderHook(() =>
      useSceneDetection(videoRef, 'test-content', subtitlesWithGap, {
        enabled: true,
      })
    );

    const intervalCount = jest.getTimerCount();

    unmount();

    expect(jest.getTimerCount()).toBeLessThan(intervalCount);
  });
});
