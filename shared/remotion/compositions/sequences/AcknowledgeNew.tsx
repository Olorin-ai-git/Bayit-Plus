/**
 * Acknowledge New Sequence
 * attentive → confirmation (2s)
 */

import React from 'react';
import { AbsoluteFill, Sequence, interpolate, useCurrentFrame } from 'remotion';
import { AttentiveGesture } from '../gestures/AttentiveGesture';
import { ConfirmationGesture } from '../gestures/ConfirmationGesture';
import { getSequenceDefinition, getStepFrameOffset } from '../../utils/sequencing';
import { EASING_FUNCTIONS } from '../../utils/easing';

export const AcknowledgeNewSequence: React.FC = () => {
  const frame = useCurrentFrame();
  const sequence = getSequenceDefinition('acknowledge_new');

  const attentiveStart = getStepFrameOffset('acknowledge_new', 0);
  const attentiveDuration = sequence.steps[0].durationInFrames;
  const attentiveTransition = sequence.steps[0].transition!;

  const confirmationStart = getStepFrameOffset('acknowledge_new', 1);
  const confirmationDuration = sequence.steps[1].durationInFrames;

  return (
    <AbsoluteFill style={{ backgroundColor: 'transparent' }}>
      <Sequence from={attentiveStart} durationInFrames={attentiveDuration}>
        <AttentiveGesture />
      </Sequence>

      {/* Crossfade */}
      {frame >= attentiveStart + attentiveDuration - attentiveTransition.durationInFrames &&
        frame < attentiveStart + attentiveDuration && (
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
                  attentiveStart + attentiveDuration - attentiveTransition.durationInFrames,
                  attentiveStart + attentiveDuration,
                ],
                [0, 1],
                { easing: EASING_FUNCTIONS[attentiveTransition.easing || 'easeInOutCubic'] }
              ),
            }}
          >
            <ConfirmationGesture />
          </div>
        )}

      <Sequence from={confirmationStart} durationInFrames={confirmationDuration}>
        <ConfirmationGesture />
      </Sequence>
    </AbsoluteFill>
  );
};

export default AcknowledgeNewSequence;
