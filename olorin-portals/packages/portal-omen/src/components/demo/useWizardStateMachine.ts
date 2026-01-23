import { useState, useEffect } from 'react';
import { ANIMATION_CONFIG } from '../../config/animation.config';

export type WizardState = 'speaking' | 'thinking' | 'result';

interface WizardStateMachineProps {
  autoPlay?: boolean;
  onStateChange?: (state: WizardState) => void;
}

export const useWizardStateMachine = ({
  autoPlay = true,
  onStateChange
}: WizardStateMachineProps) => {
  const [state, setState] = useState<WizardState>('speaking');

  useEffect(() => {
    if (!autoPlay) return;

    const runSequence = async () => {
      // Speaking phase
      setState('speaking');
      onStateChange?.('speaking');
      await new Promise(resolve =>
        setTimeout(resolve, ANIMATION_CONFIG.wizard.speakingMs)
      );

      // Thinking phase
      setState('thinking');
      onStateChange?.('thinking');
      await new Promise(resolve =>
        setTimeout(resolve, ANIMATION_CONFIG.wizard.thinkingMs)
      );

      // Result phase
      setState('result');
      onStateChange?.('result');
      await new Promise(resolve =>
        setTimeout(resolve, ANIMATION_CONFIG.wizard.resultMs)
      );

      // Loop back
      setState('speaking');
    };

    const interval = setInterval(
      runSequence,
      ANIMATION_CONFIG.wizard.loopMs
    );
    runSequence();

    return () => clearInterval(interval);
  }, [autoPlay, onStateChange]);

  return { state, setState };
};
