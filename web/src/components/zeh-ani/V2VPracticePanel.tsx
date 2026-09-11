import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import logger from '@bayit/shared-utils/logger';
import { useV2VStore } from '@/stores/v2vStore';
import { v2vErrorText } from '@/stores/v2vData';
import { V2VWaveformCompare } from './V2VWaveformCompare';
import { useV2VWebSocket } from './useV2VWebSocket';

const panelLogger = logger.scope('V2VPracticePanel');

type PanelState = 'idle' | 'recording' | 'processing' | 'result';

interface V2VPracticePanelProps {
  avatarId: string;
  profileId: string;
}

export function V2VPracticePanel(props: V2VPracticePanelProps) {
  return <PracticeSession key={`${props.profileId}:${props.avatarId}`} {...props} />;
}

function PracticeSession({ avatarId, profileId }: V2VPracticePanelProps) {
  const { t } = useTranslation();
  const { lastResult, error, transformVoice, clearError } = useV2VStore();

  const [panelState, setPanelState] = useState<PanelState>('idle');
  const [requestingPermission, setRequestingPermission] = useState(false);
  const captureOwnedRef = useRef(false);
  const [targetPhrase] = useState(() => t('zehAni.v2v.defaultPhrase'));

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const mountedRef = useRef(true);
  const streamRef = useRef<MediaStream | null>(null);
  const readerRef = useRef<FileReader | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      const recorder = mediaRecorderRef.current;
      if (recorder) {
        recorder.onstop = null;
        recorder.ondataavailable = null;
        recorder.onerror = null;
        if (recorder.state !== 'inactive') recorder.stop();
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      if (readerRef.current?.readyState === FileReader.LOADING) readerRef.current.abort();
    };
  }, []);

  const onWsResult = useCallback(() => setPanelState('result'), []);
  const { wsRef, wsResult, setWsResult } = useV2VWebSocket(avatarId, onWsResult);

  const displayResult = wsResult || lastResult;
  useEffect(() => {
    if (error && panelState === 'processing') setPanelState('idle');
  }, [error, panelState]);

  const startRecording = useCallback(async () => {
    if (captureOwnedRef.current) return;
    captureOwnedRef.current = true;
    setRequestingPermission(true);
    clearError();
    setWsResult(null);
    chunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mountedRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      const failCapture = (captureError: unknown) => {
        recorder.onstop = null;
        recorder.ondataavailable = null;
        recorder.onerror = null;
        if (recorder.state !== 'inactive') recorder.stop();
        stream.getTracks().forEach(track => track.stop());
        streamRef.current = null;
        mediaRecorderRef.current = null;
        captureOwnedRef.current = false;
        if (mountedRef.current) {
          setRequestingPermission(false);
          setPanelState('idle');
          useV2VStore.setState({ error: v2vErrorText(captureError, t('zehAni.v2v.errors.transformFailed')) });
        }
      };
      recorder.onerror = failCapture;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        if (!mountedRef.current) return;
        setPanelState('processing');
        try {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
        const reader = new FileReader();
        readerRef.current = reader;

        reader.onloadend = async () => {
          if (!mountedRef.current) return;
          try {
          if (typeof reader.result !== 'string') throw new Error(t('zehAni.v2v.errors.transformFailed'));
          const base64 = (reader.result as string).split(',')[1];
          setPanelState('processing');

          if (useV2VStore.getState().wsConnected && wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
              type: 'audio_chunk',
              audio: base64,
              target_phrase_he: targetPhrase,
              profile_id: profileId,
            }));
          } else {
            await transformVoice(avatarId, profileId, base64, targetPhrase);
            if (mountedRef.current) setPanelState(useV2VStore.getState().lastResult ? 'result' : 'idle');
          }
          } catch (captureError) {
            if (mountedRef.current) {
              useV2VStore.setState({ error: v2vErrorText(captureError, t('zehAni.v2v.errors.transformFailed')) });
              setPanelState('idle');
            }
          } finally { captureOwnedRef.current = false; }
        };
        reader.readAsDataURL(blob);
        } catch (captureError) { failCapture(captureError); }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setRequestingPermission(false);
      setPanelState('recording');
      panelLogger.info('Recording started for V2V practice');
    } catch (micError: unknown) {
      captureOwnedRef.current = false;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      if (!mountedRef.current) return;
      setRequestingPermission(false);
      panelLogger.error('Microphone access denied', micError);
      useV2VStore.setState({
        error: v2vErrorText(micError, t('zehAni.v2v.errors.micDenied')),
      });
    }
  }, [avatarId, profileId, targetPhrase, clearError, transformVoice, t, wsRef, setWsResult]);

  const stopRecording = useCallback(() => {
    setPanelState('processing');
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
  }, []);

  const handleReset = useCallback(() => {
    setPanelState('idle');
    setWsResult(null);
    clearError();
  }, [clearError, setWsResult]);

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
          <button type="button" onClick={startRecording} aria-label={t('zehAni.v2v.record')}
            disabled={requestingPermission} aria-busy={requestingPermission}
            className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center transition-colors">
            <div className="w-6 h-6 rounded-full bg-white" />
          </button>
        )}
        {panelState === 'recording' && (
          <button type="button" onClick={stopRecording} aria-label={t('zehAni.v2v.stop')}
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
        {panelState === 'processing' && t('zehAni.v2v.transforming')}
        {panelState === 'result' && t('zehAni.v2v.pronunciationFeedback')}
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
            {t('zehAni.v2v.continuePracticing')}
          </button>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-400 text-center mt-3">{error}</p>
      )}
    </div>
  );
}
