/**
 * Success Sequence
 * success → cheering → clapping (5.5s)
 */

import React from 'react';
import { AbsoluteFill, Sequence, interpolate, useCurrentFrame } from 'remotion';
import { SuccessGesture } from '../gestures/SuccessGesture';
import { CheeringGesture } from '../gestures/CheeringGesture';
import { ClappingGesture } from '../gestures/ClappingGesture';
import { getSequenceDefinition, getStepFrameOffset } from '../../utils/sequencing';
import { EASING_FUNCTIONS } from '../../utils/easing';

export const SuccessSequence: React.FC = () => {
  const frame = useCurrentFrame();
  const sequence = getSequenceDefinition('success');

  const successStart = getStepFrameOffset('success', 0);
  const successDuration = sequence.steps[0].durationInFrames;
  const successTransition = sequence.steps[0].transition!;

  const cheeringStart = getStepFrameOffset('success', 1);
  const cheeringDuration = sequence.steps[1].durationInFrames;
  const cheeringTransition = sequence.steps[1].transition!;

  const clappingStart = getStepFrameOffset('success', 2);
  const clappingDuration = sequence.steps[2].durationInFrames;

  return (
    <AbsoluteFill style={{ backgroundColor: 'transparent' }}>
      <Sequence from={successStart} durationInFrames={successDuration}>
        <SuccessGesture />
      </Sequence>

      {/* Zoom to cheering */}
      {frame >= successStart + successDuration - successTransition.durationInFrames &&
        frame < successStart + successDuration && (
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
                  successStart + successDuration - successTransition.durationInFrames,
                  successStart + successDuration,
                ],
                [0, 1],
                { easing: EASING_FUNCTIONS[successTransition.easing || 'easeInOutBack'] }
              ),
            }}
          >
            <CheeringGesture />
          </div>
        )}

      <Sequence from={cheeringStart} durationInFrames={cheeringDuration}>
        <CheeringGesture />
      </Sequence>

      {/* Crossfade to clapping */}
      {frame >= cheeringStart + cheeringDuration - cheeringTransition.durationInFrames &&
        frame < cheeringStart + cheeringDuration && (
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
                  cheeringStart + cheeringDuration - cheeringTransition.durationInFrames,
                  cheeringStart + cheeringDuration,
                ],
                [0, 1],
                { easing: EASING_FUNCTIONS[cheeringTransition.easing || 'easeInOutCubic'] }
              ),
            }}
          >
            <ClappingGesture />
          </div>
        )}

      <Sequence from={clappingStart} durationInFrames={clappingDuration}>
        <ClappingGesture />
      </Sequence>
    </AbsoluteFill>
  );
};

export default SuccessSequence;
