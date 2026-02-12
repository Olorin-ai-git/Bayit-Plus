import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@bayit/shared-stores/authStore';
import logger from '@bayit/shared-utils/logger';
import { useV2VStore } from '@/stores/v2vStore';
import { V2VWaveformCompare } from './V2VWaveformCompare';
import type { V2VTransformResult } from '@/stores/v2vStore.types';

const panelLogger = logger.scope('V2VPracticePanel');

type PanelState = 'idle' | 'recording' | 'processing' | 'result';

interface V2VPracticePanelProps {
  avatarId: string;
  profileId: string;
}

const WS_RECONNECT_DELAY_MS = 3000;
const MAX_RECONNECT_ATTEMPTS = 5;

function getWebSocketUrl(avatarId: string, token: string): string {
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsHost = import.meta.env.VITE_WS_URL ||
    (import.meta.env.PROD
      ? import.meta.env.VITE_WS_PROD_HOST
      : `${window.location.hostname}:8000`);
  const cleanHost = wsHost.replace(/^wss?:\/\//, '');
  return `${wsProtocol}//${cleanHost}/api/v1/ws/v2v/${avatarId}?token=${token}`;
}

export function V2VPracticePanel({ avatarId, profileId }: V2VPracticePanelProps) {
  const { t } = useTranslation();
  const token = useAuthStore((s) => s.token);
  const { lastResult, loading, error, transformVoice, clearError } = useV2VStore();

  const [panelState, setPanelState] = useState<PanelState>('idle');
  const [wsResult, setWsResult] = useState<V2VTransformResult | null>(null);
  const [targetPhrase] = useState(() => t('zehAni.v2v.defaultPhrase'));

  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const reconnectCountRef = useRef(0);

  const displayResult = wsResult || lastResult;

  const connectWebSocket = useCallback(() => {
    if (!token || wsRef.current?.readyState === WebSocket.OPEN) return;

    const url = getWebSocketUrl(avatarId, token);
    const ws = new WebSocket(url);

    ws.onopen = () => {
      reconnectCountRef.current = 0;
      useV2VStore.setState({ wsConnected: true });
      panelLogger.info('V2V WebSocket connected', { avatarId });
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as V2VTransformResult;
        setWsResult(data);
        setPanelState('result');
        panelLogger.info('V2V result received via WebSocket', {
          scoreDelta: String(data.score_delta),
        });
      } catch (parseError) {
        panelLogger.error('Failed to parse WebSocket message', parseError);
      }
    };

    ws.onclose = () => {
      useV2VStore.setState({ wsConnected: false });
      if (reconnectCountRef.current < MAX_RECONNECT_ATTEMPTS) {
        reconnectCountRef.current += 1;
        setTimeout(connectWebSocket, WS_RECONNECT_DELAY_MS);
      }
    };

    ws.onerror = (wsError) => {
      panelLogger.error('V2V WebSocket error', wsError);
    };

    wsRef.current = ws;
  }, [avatarId, token]);

  useEffect(() => {
    connectWebSocket();
    return () => {
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [connectWebSocket]);

  const startRecording = useCallback(async () => {
    clearError();
    setWsResult(null);
    chunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();

        reader.onloadend = async () => {
          const base64 = (reader.result as string).split(',')[1];
          setPanelState('processing');

          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
              audio_base64: base64,
              target_phrase_he: targetPhrase,
              profile_id: profileId,
            }));
          } else {
            await transformVoice(avatarId, profileId, base64, targetPhrase);
            if (useV2VStore.getState().lastResult) {
              setPanelState('result');
            } else {
              setPanelState('idle');
            }
          }
        };
        reader.readAsDataURL(blob);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setPanelState('recording');
      panelLogger.info('Recording started for V2V practice');
    } catch (micError: any) {
      panelLogger.error('Microphone access denied', micError);
      useV2VStore.setState({
        error: micError?.message || t('zehAni.v2v.errors.micDenied'),
      });
    }
  }, [avatarId, profileId, targetPhrase, clearError, transformVoice, t]);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
  }, []);

  const handleReset = useCallback(() => {
    setPanelState('idle');
    setWsResult(null);
    clearError();
  }, [clearError]);

  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-6 backdrop-blur-md">
      <h3 className="text-lg font-semibold text-white/90 mb-2">
        {t('zehAni.v2v.title')}
      </h3>

      <div className="text-center my-6 p-4 rounded-xl bg-white/5 border border-white/10">
        <p className="text-xs text-white/40 mb-1">{t('zehAni.v2v.targetLabel')}</p>
        <p className="text-2xl font-bold text-white/90 font-hebrew" dir="rtl">
          {targetPhrase}
        </p>
      </div>

      <div className="flex justify-center my-6">
        {panelState === 'idle' && (
          <button type="button" onClick={startRecording}
            className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center transition-colors">
            <div className="w-6 h-6 rounded-full bg-white" />
          </button>
        )}
        {panelState === 'recording' && (
          <button type="button" onClick={stopRecording}
            className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center animate-pulse transition-colors">
            <div className="w-5 h-5 rounded-sm bg-white" />
          </button>
        )}
        {panelState === 'processing' && (
          <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />
          </div>
        )}
      </div>

      <p className="text-sm text-white/50 text-center mb-4">
        {panelState === 'idle' && t('zehAni.v2v.tapToRecord')}
        {panelState === 'recording' && t('zehAni.v2v.recording')}
        {panelState === 'processing' && t('zehAni.v2v.processing')}
        {panelState === 'result' && t('zehAni.v2v.complete')}
      </p>

      {panelState === 'result' && displayResult && (
        <div className="mt-4">
          <V2VWaveformCompare
            scoreBefore={displayResult.score_before}
            scoreAfter={displayResult.score_after}
            scoreDelta={displayResult.score_delta}
          />
          <button type="button" onClick={handleReset}
            className="mt-4 w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 text-sm font-medium transition-colors">
            {t('zehAni.v2v.tryAgain')}
          </button>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-400 text-center mt-3">{error}</p>
      )}
    </div>
  );
}
