/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

import { useState, useCallback, useRef } from "react";
import logger from "@bayit/shared-utils/logger";

const srLogger = logger.scope("SpeechRecognition");

export function useSpeechRecognition(onResult: (text: string) => void) {
  const [isListening, setIsListening] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const recognitionRef = useRef<any>(null);

  const startListening = useCallback(() => {
    const API = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!API) {
      srLogger.warn("SpeechRecognition API not available");
      return;
    }
    const recognition = new API();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.onresult = (event: any) => {
      const result = event.results[event.results.length - 1];
      if (result.isFinal) {
        onResult(result[0].transcript);
        setIsListening(false);
      }
    };
    recognition.onaudioprocess = () => setAudioLevel(Math.random() * 0.5 + 0.3);
    recognition.onend = () => {
      setIsListening(false);
      setAudioLevel(0);
    };
    recognition.onerror = (event: any) => {
      srLogger.error("Speech recognition error", { error: event.error });
      setIsListening(false);
    };
    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [onResult]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  return { isListening, audioLevel, startListening, stopListening };
}
