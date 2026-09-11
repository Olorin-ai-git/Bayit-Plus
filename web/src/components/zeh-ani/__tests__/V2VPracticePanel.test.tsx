import '@/__tests__/support/costDashboardI18n';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { V2VPracticePanel } from '../V2VPracticePanel';
import { useV2VStore } from '@/stores/v2vStore';
import api from '@/services/api';

jest.mock('@/services/api');
jest.mock('react-i18next', () => ({ ...jest.requireActual('react-i18next'), useTranslation: () => ({ t: (key: string) => key }) }));
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
  onerror: (() => void) | null = null;
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
it('owns only one microphone permission request while permission is unresolved', async () => {
  let allow!: (value: typeof stream) => void;
  getUserMedia.mockReturnValue(new Promise(resolve => { allow = resolve; }));
  panel(); start(); start();
  expect(getUserMedia).toHaveBeenCalledTimes(1);
  await act(async () => allow(stream));
  expect(Recorder.instances).toHaveLength(1);
});
it('rejects invalid HTTP scores without exposing them as a completed result', async () => {
  (api.post as jest.Mock).mockResolvedValue({ ...result, score_after: null });
  await useV2VStore.getState().transformVoice('avatar', 'profile', 'audio', 'phrase');
  expect(useV2VStore.getState().lastResult).toBeNull();
  expect(typeof useV2VStore.getState().error).toBe('string');
});
it('normalizes structured validation failures into displayable error text', async () => {
  (api.post as jest.Mock).mockRejectedValue({ detail: [{ msg: 'invalid audio' }] });
  await useV2VStore.getState().transformVoice('avatar', 'profile', 'audio', 'phrase');
  expect(typeof useV2VStore.getState().error).toBe('string');
});
it('ends a failed recorder and releases microphone tracks', async () => {
  panel(); start();
  await screen.findByText('zehAni.v2v.recording');
  act(() => Recorder.instances[0].onerror?.());
  expect(trackStop).toHaveBeenCalledTimes(1);
  expect(Recorder.instances[0].state).toBe('inactive');
  expect(screen.getByRole('button', { name: 'zehAni.v2v.record' })).toBeInTheDocument();
  expect(api.post).not.toHaveBeenCalled();
});
it('keeps a newer transform result when an earlier request finishes last', async () => {
  let finish!: (value: typeof result) => void;
  (api.post as jest.Mock).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; })).mockResolvedValueOnce({ ...result, score_after: 90 });
  const earlier = useV2VStore.getState().transformVoice('old-avatar', 'old-profile', 'audio', 'phrase');
  await useV2VStore.getState().transformVoice('new-avatar', 'new-profile', 'audio', 'phrase');
  finish(result); await earlier;
  expect(useV2VStore.getState().lastResult?.score_after).toBe(90);
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
