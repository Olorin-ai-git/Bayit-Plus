import { act, cleanup, renderHook } from '@testing-library/react';
import { useSceneDetection } from '../useSceneDetection';
const cues = [
  { index: 0, start_time: 0, end_time: 20, text: 'First line' },
  { index: 1, start_time: 21, end_time: 40, text: 'Closing line' },
  { index: 2, start_time: 45, end_time: 60, text: 'Next scene' },
];
beforeEach(() => jest.useFakeTimers());
afterEach(() => { cleanup(); jest.useRealTimers(); });
function playback(currentTime: number) {
  const video = { currentTime, paused: false, pause: jest.fn() };
  video.pause.mockImplementation(() => { video.paused = true; });
  return { video, ref: { current: video as unknown as HTMLVideoElement } };
}
test('does not interrupt dialogue before the final cue has ended', () => {
  const { video, ref } = playback(35);
  const { result } = renderHook(() => useSceneDetection(ref, 'content-a', cues));
  act(() => { jest.advanceTimersByTime(500); });
  expect(video.pause).not.toHaveBeenCalled();
  expect(result.current.sceneEndDetected).toBe(false);
});
test('detects a qualifying scene during the actual subtitle gap', () => {
  const { video, ref } = playback(40.5);
  const { result } = renderHook(() => useSceneDetection(ref, 'content-a', cues));
  act(() => { jest.advanceTimersByTime(500); });
  expect(video.pause).toHaveBeenCalledTimes(1);
  expect(result.current.currentScene).toEqual({ start_time: 0, end_time: 40, subtitle_text: 'First line Closing line', cue_count: 2 });
});
test('content change clears a scene retained by the same hook instance', () => {
  const { ref } = playback(40);
  const { result, rerender } = renderHook(({ id }) => useSceneDetection(ref, id, cues), { initialProps: { id: 'content-a' } });
  act(() => { jest.advanceTimersByTime(500); });
  expect(result.current.sceneEndDetected).toBe(true);
  rerender({ id: 'content-b' });
  expect(result.current.currentScene).toBeNull();
  expect(result.current.sceneEndDetected).toBe(false);
  expect(result.current.lastSceneEndTime).toBe(0);
});
