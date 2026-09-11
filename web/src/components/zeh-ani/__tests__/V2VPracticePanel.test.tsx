import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { V2VPracticePanel } from '../V2VPracticePanel';
import { useV2VStore } from '@/stores/v2vStore';
import api from '@/services/api';

jest.mock('@/services/api');
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
let mockToken: string | null = null;
jest.mock('@bayit/shared-stores/authStore', () => ({ useAuthStore: (selector: any) => selector({ token: mockToken }) }));

const trackStop = jest.fn();
const stream = { getTracks: () => [{ stop: trackStop }] };
const getUserMedia = jest.fn();
class Recorder {
  static instances: Recorder[] = [];
  state = 'inactive';
  mimeType = 'audio/webm';
  ondataavailable: ((event: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  constructor() { Recorder.instances.push(this); }
  start() { this.state = 'recording'; }
  stop() {
    this.state = 'inactive';
    this.ondataavailable?.({ data: new Blob(['captured audio'], { type: this.mimeType }) });
    this.onstop?.();
  }
}
const result = { input_transcript: 'שלום', corrected_transcript: 'שלום', v2v_audio_url: '/audio/result.webm', latency_ms: 25, score_before: 60, score_after: 85, score_delta: 25 };

beforeEach(() => {
  jest.clearAllMocks();
  Recorder.instances = [];
  mockToken = null;
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia } });
  Object.defineProperty(globalThis, 'MediaRecorder', { configurable: true, value: Recorder });
  getUserMedia.mockResolvedValue(stream);
  useV2VStore.setState({ lastResult: null, sessions: [], error: null, loading: false, wsConnected: false });
});
const panel = () => render(<V2VPracticePanel profileId="profile-123" avatarId="avatar-456" />);
const start = () => fireEvent.click(screen.getByRole('button', { name: 'zehAni.v2v.record' }));
const stop = async () => fireEvent.click(await screen.findByRole('button', { name: 'zehAni.v2v.stop' }));

it('renders the configured practice phrase', () => {
  panel();
  expect(screen.getByText('zehAni.v2v.targetLabel')).toBeInTheDocument();
  expect(screen.getByText('zehAni.v2v.defaultPhrase')).toHaveAttribute('dir', 'rtl');
});
it('starts microphone recording through the accessible control', async () => {
  panel(); start();
  expect(await screen.findByText('zehAni.v2v.recording')).toBeInTheDocument();
  expect(getUserMedia).toHaveBeenCalledWith({ audio: true });
  expect(Recorder.instances[0].state).toBe('recording');
});
it('stops capture and submits actual audio and score response fields', async () => {
  (api.post as jest.Mock).mockResolvedValue(result);
  panel(); start(); await stop();
  expect(await screen.findByText('85.0')).toBeInTheDocument();
  expect(screen.getByText('60.0')).toBeInTheDocument();
  expect(screen.getByText('+25.0')).toBeInTheDocument();
  expect(api.post).toHaveBeenCalledWith('/zeh-ani/v2v/transform', expect.objectContaining({ avatar_id: 'avatar-456', profile_id: 'profile-123', audio_base64: btoa('captured audio'), target_phrase_he: 'zehAni.v2v.defaultPhrase' }));
  expect(trackStop).toHaveBeenCalledTimes(1);
});
it('displays a real microphone denial and sends no audio', async () => {
  getUserMedia.mockRejectedValue(new Error('Microphone permission denied'));
  panel(); start();
  expect(await screen.findByText('Microphone permission denied')).toBeInTheDocument();
  expect(api.post).not.toHaveBeenCalled();
});
it('fetches practice history through its actual store and backend envelope', async () => {
  const sessions = [{ id: 'session-1', avatar_id: 'avatar-456', total_transforms: 2, average_latency_ms: 25, score_improvement: 0.9, credits_charged: 1, status: 'completed', created_at: '2026-02-15T10:00:00Z' }];
  (api.get as jest.Mock).mockResolvedValue({ sessions, total: 1 });
  await useV2VStore.getState().fetchSessions('profile-123');
  expect(api.get).toHaveBeenCalledWith('/zeh-ani/v2v/sessions/profile-123');
  expect(useV2VStore.getState().sessions).toEqual(sessions);
});
it('stops microphone tracks without uploading after unmount', async () => {
  const { unmount } = panel(); start();
  await screen.findByText('zehAni.v2v.recording');
  unmount();
  expect(trackStop).toHaveBeenCalledTimes(1);
  expect(Recorder.instances[0].state).toBe('inactive');
  expect(api.post).not.toHaveBeenCalled();
});
it('disposes a permission response that arrives after unmount', async () => {
  let allow!: (value: typeof stream) => void;
  getUserMedia.mockReturnValue(new Promise(resolve => { allow = resolve; }));
  const { unmount } = panel(); start(); unmount();
  await act(async () => { allow(stream); });
  expect(trackStop).toHaveBeenCalledTimes(1);
  expect(Recorder.instances).toHaveLength(0);
  expect(api.post).not.toHaveBeenCalled();
});
it('clears a previous score when the next transform fails', async () => {
  useV2VStore.setState({ lastResult: result });
  (api.post as jest.Mock).mockRejectedValue({ detail: 'Voice transformation failed' });
  panel(); start(); await stop();
  expect(await screen.findByText('Voice transformation failed')).toBeInTheDocument();
  expect(screen.queryByText('85.0')).not.toBeInTheDocument();
  expect(useV2VStore.getState().lastResult).toBeNull();
});

it('sends authenticated websocket audio with the exact server message contract', async () => {
  let socket: any;
  class CaptureSocket {
    static OPEN = 1;
    readyState = 1;
    send = jest.fn();
    close = jest.fn();
    onopen: (() => void) | null = null;
    onmessage: ((event: { data: string }) => void) | null = null;
    constructor() { socket = this; }
  }
  Object.defineProperty(globalThis, 'WebSocket', { configurable: true, value: CaptureSocket });
  mockToken = 'test-token';
  panel();
  act(() => { socket.onopen(); socket.onmessage({ data: JSON.stringify({ type: 'authenticated' }) }); });
  start(); await stop();
  await waitFor(() => expect(socket.send).toHaveBeenCalledTimes(2));
  expect(JSON.parse(socket.send.mock.calls[1][0])).toEqual({ type: 'audio_chunk', audio: btoa('captured audio'), target_phrase_he: 'zehAni.v2v.defaultPhrase', profile_id: 'profile-123' });
  expect(api.post).not.toHaveBeenCalled();
  act(() => socket.onmessage({ data: JSON.stringify({ type: 'error', message: 'Transform unavailable' }) }));
  expect(await screen.findByRole('button', { name: 'zehAni.v2v.record' })).toBeInTheDocument();
});
