/**
 * Error Shake Sequence
 * confused → shrugging (3s)
 */

import React from 'react';
import { AbsoluteFill, Sequence, interpolate, useCurrentFrame } from 'remotion';
import { ConfusedGesture } from '../gestures/ConfusedGesture';
import { ShruggingGesture } from '../gestures/ShruggingGesture';
import { getSequenceDefinition, getStepFrameOffset } from '../../utils/sequencing';
import { EASING_FUNCTIONS } from '../../utils/easing';

export const ErrorShakeSequence: React.FC = () => {
  const frame = useCurrentFrame();
  const sequence = getSequenceDefinition('error_shake');

  const confusedStart = getStepFrameOffset('error_shake', 0);
  const confusedDuration = sequence.steps[0].durationInFrames;
  const confusedTransition = sequence.steps[0].transition!;

  const shruggingStart = getStepFrameOffset('error_shake', 1);
  const shruggingDuration = sequence.steps[1].durationInFrames;

  return (
    <AbsoluteFill style={{ backgroundColor: 'transparent' }}>
      <Sequence from={confusedStart} durationInFrames={confusedDuration}>
        <ConfusedGesture />
      </Sequence>

      {/* Crossfade */}
      {frame >= confusedStart + confusedDuration - confusedTransition.durationInFrames &&
        frame < confusedStart + confusedDuration && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              opacity: interpolate(
                frame,
                [
                  confusedStart + confusedDuration - confusedTransition.durationInFrames,
                  confusedStart + confusedDuration,
                ],
                [0, 1],
                { easing: EASING_FUNCTIONS[confusedTransition.easing || 'easeInOutCubic'] }
              ),
            }}
          >
            <ShruggingGesture />
          </div>
        )}

      <Sequence from={shruggingStart} durationInFrames={shruggingDuration}>
        <ShruggingGesture />
      </Sequence>
    </AbsoluteFill>
  );
};

export default ErrorShakeSequence;
