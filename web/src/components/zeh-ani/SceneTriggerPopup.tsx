import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import logger from '@bayit/shared-utils/logger';
import type { SceneTrigger, TriggerResult } from '@/stores/liveLayerStore.types';

const triggerLogger = logger.scope('SceneTriggerPopup');

interface SceneTriggerPopupProps {
  trigger: SceneTrigger;
  onResponse: (audioBase64: string) => void;
  onSkip: () => void;
}

type PopupState = 'prompt' | 'recording' | 'processing' | 'result';

const AUTO_DISMISS_BUFFER_MS = 1000;

export function SceneTriggerPopup({
  trigger,
  onResponse,
  onSkip,
}: SceneTriggerPopupProps) {
  const { t } = useTranslation();
  const [popupState, setPopupState] = useState<PopupState>('prompt');
  const [result, setResult] = useState<TriggerResult | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const autoDismissMs = (trigger.duration_seconds * 1000) + AUTO_DISMISS_BUFFER_MS;

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      if (popupState === 'prompt') {
        triggerLogger.info('Trigger auto-skipped', { triggerId: trigger.trigger_id });
        onSkip();
      }
    }, autoDismissMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [trigger.trigger_id, autoDismissMs, onSkip, popupState]);

  const startRecording = useCallback(async () => {
    chunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();

        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          setPopupState('processing');
          onResponse(base64);
          triggerLogger.info('Trigger response sent', {
            triggerId: trigger.trigger_id,
          });
        };
        reader.readAsDataURL(blob);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setPopupState('recording');
    } catch (micError: any) {
      triggerLogger.error('Microphone access denied for trigger', micError);
    }
  }, [trigger.trigger_id, onResponse]);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
  }, []);

  const handleSkip = useCallback(() => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
    onSkip();
  }, [onSkip]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="rounded-2xl bg-white/10 border border-white/15 p-6 backdrop-blur-xl max-w-sm w-full mx-4">
        <p className="text-xs text-white/40 text-center mb-2">
          {t(`zehAni.trigger.types.${trigger.trigger_type}`)}
        </p>

        <div className="text-center my-6 p-4 rounded-xl bg-white/5 border border-white/10">
          <p className="text-3xl font-bold text-white/95 font-hebrew" dir="rtl">
            {trigger.target_word_he}
          </p>
          <p className="text-sm text-white/50 mt-2">
            {trigger.prompt_text_en}
          </p>
        </div>

        <div className="flex justify-center my-4">
          {popupState === 'prompt' && (
            <button type="button" onClick={startRecording}
              className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center transition-colors">
              <div className="w-5 h-5 rounded-full bg-white" />
            </button>
          )}
          {popupState === 'recording' && (
            <button type="button" onClick={stopRecording}
              className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center animate-pulse transition-colors">
              <div className="w-4 h-4 rounded-sm bg-white" />
            </button>
          )}
          {popupState === 'processing' && (
            <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />
            </div>
          )}
          {popupState === 'result' && result && (
            <div className={`text-center px-4 py-3 rounded-xl ${
              result.correct ? 'bg-green-500/20 border border-green-500/30' : 'bg-red-500/20 border border-red-500/30'
            }`}>
              <p className={`text-lg font-bold ${result.correct ? 'text-green-400' : 'text-red-400'}`}>
                {result.correct ? t('zehAni.trigger.correct') : t('zehAni.trigger.incorrect')}
              </p>
              <p className="text-sm text-white/60 mt-1">
                {t('zehAni.trigger.score', { score: result.score.toFixed(0) })}
              </p>
            </div>
          )}
        </div>

        <p className="text-xs text-white/40 text-center mb-4">
          {popupState === 'prompt' && t('zehAni.trigger.tapToSpeak')}
          {popupState === 'recording' && t('zehAni.trigger.listening')}
          {popupState === 'processing' && t('zehAni.trigger.evaluating')}
        </p>

        <button type="button" onClick={handleSkip}
          className="w-full py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 text-xs transition-colors">
          {t('zehAni.trigger.skip')}
        </button>
      </div>
    </div>
  );
}
