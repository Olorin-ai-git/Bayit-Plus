/**
 * useAudioRecorder Hook
 * Manages MediaRecorder-based audio capture for web platform.
 * Returns recording state and start/stop controls, with an
 * onRecordingComplete callback that delivers the audio Blob.
 */

import { useState, useRef, useCallback } from 'react';
import { Platform } from 'react-native';

interface UseAudioRecorderOptions {
  onRecordingComplete: (blob: Blob) => Promise<void>;
  onError?: () => void;
}

interface UseAudioRecorderResult {
  isRecording: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
}

export function useAudioRecorder({
  onRecordingComplete,
  onError,
}: UseAudioRecorderOptions): UseAudioRecorderResult {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [isRecording, setIsRecording] = useState(false);

  const startRecording = useCallback(async () => {
    if (Platform.OS !== 'web') return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        await onRecordingComplete(blob);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch {
      onError?.();
    }
  }, [onRecordingComplete, onError]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  return { isRecording, startRecording, stopRecording };
}
