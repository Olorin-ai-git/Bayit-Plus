/**
 * Voice Dialogue Effects Hook
 * Manages dialogue text and gesture state transitions based on voice state changes
 * Handles response pattern matching (errors, not found) and gesture selection
 */

import { useEffect, useRef } from 'react';
import { VoiceState, GestureState } from '../stores/supportStore';
import { useAvatarDialogue } from './useAvatarDialogue';

interface UseVoiceDialogueEffectsOptions {
  voiceState: VoiceState;
  lastResponse: string | null;
  hasAppeared: boolean;
  setCurrentDialogue: (dialogue: { text?: string; gesture?: string } | null) => void;
  setGestureState: (gesture: GestureState) => void;
  onIntroComplete: () => void;
}

export function useVoiceDialogueEffects({
  voiceState,
  lastResponse,
  hasAppeared,
  setCurrentDialogue,
  setGestureState,
  onIntroComplete,
}: UseVoiceDialogueEffectsOptions) {
  const { getWakeDialogue, getProcessingDialogue, getNothingFoundDialogue, getErrorDialogue } =
    useAvatarDialogue({ onGestureChange: (g) => setGestureState(g as GestureState) });

  const prevVoiceStateRef = useRef<VoiceState>(voiceState);

  // Voice state dialogue transitions
  useEffect(() => {
    const prevState = prevVoiceStateRef.current;
    prevVoiceStateRef.current = voiceState;
    if (prevState === voiceState) return;

    if (voiceState === 'listening' && prevState === 'idle') {
      const d = getWakeDialogue();
      setCurrentDialogue(d);
      if (d.gesture) setGestureState(d.gesture as GestureState);
    } else if (voiceState === 'processing') {
      const d = getProcessingDialogue(true);
      setCurrentDialogue(d);
      if (d.gesture) setGestureState(d.gesture as GestureState);
    } else if (voiceState === 'error') {
      const d = getErrorDialogue();
      setCurrentDialogue(d);
      if (d.gesture) setGestureState(d.gesture as GestureState);
    } else if (voiceState === 'idle' && prevState === 'speaking' && hasAppeared) {
      onIntroComplete();
      setTimeout(() => setCurrentDialogue(null), 1000);
    }
  }, [voiceState, hasAppeared, setCurrentDialogue, setGestureState, getWakeDialogue, getProcessingDialogue, getErrorDialogue, onIntroComplete]);

  // Update dialogue when lastResponse changes during speaking
  useEffect(() => {
    if (voiceState !== 'speaking' || !lastResponse) return;
    const lower = lastResponse.toLowerCase();
    if (lower.includes('sorry') || lower.includes('couldn\'t find') || lower.includes('no results')) {
      const d = getNothingFoundDialogue();
      setCurrentDialogue({ ...d, text: lastResponse });
      setGestureState('shrugging');
    } else if (lower.includes('error') || lower.includes('went wrong')) {
      const d = getErrorDialogue();
      setCurrentDialogue({ ...d, text: lastResponse });
      setGestureState('confused');
    } else {
      setCurrentDialogue({ text: lastResponse });
    }
  }, [lastResponse, voiceState, setCurrentDialogue, setGestureState, getNothingFoundDialogue, getErrorDialogue]);
}

export default useVoiceDialogueEffects;
