/**
 * Web Audio API Engine Hook
 *
 * Manages AudioContext, GainNode, and AnalyserNode for audio playback
 */

import { useRef, useEffect } from 'react';

export interface AudioEngine {
  audioContext: AudioContext | null;
  gainNode: GainNode | null;
  analyser: AnalyserNode | null;
  resumeAudioContext: () => Promise<void>;
}

export function useAudioEngine(audioElementRef: React.RefObject<HTMLAudioElement>) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);

  // Resume AudioContext if suspended (required for browser autoplay policies)
  const resumeAudioContext = async () => {
    const ctx = audioContextRef.current;
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      try {
        await ctx.resume();
        console.debug('AudioContext resumed from suspended state');
      } catch (error) {
        console.error('Failed to resume AudioContext:', error);
        throw new Error('Audio playback blocked. Please check browser permissions.');
      }
    }
  };

  useEffect(() => {
    const audioElement = audioElementRef.current;
    if (!audioElement) return;

    // Initialize Web Audio API context
    if (!audioContextRef.current) {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;

      if (!AudioContext) {
        console.error('Web Audio API not supported in this browser');
        return;
      }

      audioContextRef.current = new AudioContext();
    }

    const ctx = audioContextRef.current;

    // Create source node (only once)
    if (!sourceRef.current) {
      sourceRef.current = ctx.createMediaElementSource(audioElement);
    }

    // Create gain node for volume control
    if (!gainNodeRef.current) {
      gainNodeRef.current = ctx.createGain();
      gainNodeRef.current.gain.value = 1.0;
    }

    // Create analyser node for waveform visualization
    if (!analyserRef.current) {
      analyserRef.current = ctx.createAnalyser();
      analyserRef.current.fftSize = 2048;
    }

    // Connect nodes: source → gain → analyser → destination
    try {
      sourceRef.current.connect(gainNodeRef.current);
      gainNodeRef.current.connect(analyserRef.current);
      analyserRef.current.connect(ctx.destination);
    } catch (error) {
      // Nodes already connected, ignore error
      console.debug('Audio nodes already connected');
    }

    return () => {
      // Cleanup: disconnect nodes on unmount
      try {
        sourceRef.current?.disconnect();
        gainNodeRef.current?.disconnect();
        analyserRef.current?.disconnect();
      } catch (error) {
        console.debug('Error disconnecting audio nodes:', error);
      }
    };
  }, [audioElementRef]);

  return {
    audioContextRef,
    gainNodeRef,
    analyserRef,
    resumeAudioContext,
  };
}
