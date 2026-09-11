import '@/__tests__/support/costDashboardI18n';
import { renderHook, act } from '@testing-library/react';
import { useV2VWebSocket } from '../useV2VWebSocket';
import { useV2VStore } from '@/stores/v2vStore';
jest.mock('@/services/api');
jest.mock('@/services/wsUrl', () => ({ buildWsUrl: (path: string) => `ws://localhost${path}` }));
jest.mock('@bayit/shared-stores/authStore', () => ({ useAuthStore: (selector: any) => selector({ token: 'test-token' }) }));
class Socket {
  static OPEN = 1;
  static instances: Socket[] = [];
  readyState = 1;
  onopen: (() => void) | null = null;
  onclose: ((event: { code: number }) => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  send = jest.fn();
  close = jest.fn(() => { this.readyState = 3; this.onclose?.({ code: 1006 }); });
  constructor(readonly url: string) { Socket.instances.push(this); }
  message(data: object) { this.onmessage?.({ data: JSON.stringify(data) }); }
}
beforeEach(() => {
  jest.useFakeTimers(); Socket.instances = [];
  Object.defineProperty(globalThis, 'WebSocket', { configurable: true, value: Socket });
  useV2VStore.setState({ error: null, wsConnected: false });
});
afterEach(() => jest.useRealTimers());
it('authenticates, ignores acknowledgments, and emits only valid result frames', () => {
  const onResult = jest.fn();
  const { result } = renderHook(() => useV2VWebSocket('avatar', onResult));
  const ws = Socket.instances[0];
  act(() => ws.onopen?.());
  expect(JSON.parse(ws.send.mock.calls[0][0])).toEqual({ type: 'authenticate', token: 'test-token' });
  expect(useV2VStore.getState().wsConnected).toBe(false);
  act(() => { ws.message({ type: 'authenticated' }); ws.message({ type: 'heartbeat_ack' }); });
  expect(useV2VStore.getState().wsConnected).toBe(true);
  expect(onResult).not.toHaveBeenCalled();
  const frame = { type: 'v2v_result', input_transcript: 'hello', corrected_transcript: 'hello', v2v_audio_url: '/audio/result.webm', score_before: 60, score_after: 80, score_delta: 20, latency_ms: 12 };
  act(() => ws.message(frame));
  expect(onResult).toHaveBeenCalledWith(frame);
  expect(result.current.wsResult).toEqual(frame);
});
it('surfaces server errors without treating them as pronunciation scores', () => {
  const onResult = jest.fn(); renderHook(() => useV2VWebSocket('avatar', onResult));
  act(() => Socket.instances[0].message({ type: 'error', message: 'Consent required' }));
  expect(useV2VStore.getState().error).toBe('Consent required');
  expect(onResult).not.toHaveBeenCalled();
});
it('closes the socket and cancels scheduled reconnect on unmount', () => {
  const { unmount } = renderHook(() => useV2VWebSocket('avatar', jest.fn()));
  act(() => Socket.instances[0].close());
  expect(jest.getTimerCount()).toBeGreaterThan(0);
  unmount(); act(() => jest.runOnlyPendingTimers());
  expect(Socket.instances).toHaveLength(1);
  expect(useV2VStore.getState().wsConnected).toBe(false);
});
it('ignores callbacks from the previous avatar after identity changes', () => {
  const onResult = jest.fn();
  const { rerender } = renderHook(({ id }) => useV2VWebSocket(id, onResult), { initialProps: { id: 'first' } });
  const old = Socket.instances[0]; rerender({ id: 'second' });
  act(() => { old.onopen?.(); old.message({ type: 'authenticated' }); });
  expect(old.send).not.toHaveBeenCalled();
  expect(useV2VStore.getState().wsConnected).toBe(false);
  act(() => jest.runOnlyPendingTimers());
  expect(Socket.instances).toHaveLength(2);
});

it('does not reconnect after a terminal authentication or consent rejection', () => {
  renderHook(() => useV2VWebSocket('avatar', jest.fn()));
  act(() => { Socket.instances[0].message({ type: 'error', message: 'Consent required' }); Socket.instances[0].onclose?.({ code: 4003 }); });
  act(() => jest.runOnlyPendingTimers());
  expect(Socket.instances).toHaveLength(1);
  expect(useV2VStore.getState().error).toBe('Consent required');
});
it('surfaces malformed result frames instead of leaving processing without an outcome', () => {
  const onResult = jest.fn(); renderHook(() => useV2VWebSocket('avatar', onResult));
  act(() => Socket.instances[0].message({ type: 'v2v_result', score_before: null }));
  expect(onResult).not.toHaveBeenCalled();
  expect(useV2VStore.getState().error).toBe('Voice transformation failed');
});
it.each([undefined, '', { detail: 'invalid' }])('gives message-less error frames a displayable outcome (%p)', message => {
  renderHook(() => useV2VWebSocket('avatar', jest.fn()));
  act(() => Socket.instances[0].message({ type: 'error', message }));
  expect(useV2VStore.getState().error).toBe('Voice transformation failed');
});
