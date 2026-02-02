/**
 * Magical Reveal Sequence
 * conjuring → magical_reveal → presenting (6s)
 */

import React from 'react';
import { AbsoluteFill, Sequence, interpolate, useCurrentFrame } from 'remotion';
import { ConjuringGesture } from '../gestures/ConjuringGesture';
import { MagicalRevealGesture } from '../gestures/MagicalRevealGesture';
import { PresentingGesture } from '../gestures/PresentingGesture';
import { getSequenceDefinition, getStepFrameOffset } from '../../utils/sequencing';
import { EASING_FUNCTIONS } from '../../utils/easing';

export const MagicalRevealSequence: React.FC = () => {
  const frame = useCurrentFrame();
  const sequence = getSequenceDefinition('magical_reveal');

  const conjuringStart = getStepFrameOffset('magical_reveal', 0);
  const conjuringDuration = sequence.steps[0].durationInFrames;
  const conjuringTransition = sequence.steps[0].transition!;

  const magicalRevealStart = getStepFrameOffset('magical_reveal', 1);
  const magicalRevealDuration = sequence.steps[1].durationInFrames;
  const magicalRevealTransition = sequence.steps[1].transition!;

  const presentingStart = getStepFrameOffset('magical_reveal', 2);
  const presentingDuration = sequence.steps[2].durationInFrames;

  return (
    <AbsoluteFill style={{ backgroundColor: 'transparent' }}>
      <Sequence from={conjuringStart} durationInFrames={conjuringDuration}>
        <ConjuringGesture />
      </Sequence>

      {/* Zoom transition to magical_reveal */}
      {frame >= conjuringStart + conjuringDuration - conjuringTransition.durationInFrames &&
        frame < conjuringStart + conjuringDuration && (
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
                  conjuringStart + conjuringDuration - conjuringTransition.durationInFrames,
                  conjuringStart + conjuringDuration,
                ],
                [0, 1],
                { easing: EASING_FUNCTIONS[conjuringTransition.easing || 'easeInOutBack'] }
              ),
            }}
          >
            <MagicalRevealGesture />
          </div>
        )}

      <Sequence from={magicalRevealStart} durationInFrames={magicalRevealDuration}>
        <MagicalRevealGesture />
      </Sequence>

      {/* Crossfade to presenting */}
      {frame >= magicalRevealStart + magicalRevealDuration - magicalRevealTransition.durationInFrames &&
        frame < magicalRevealStart + magicalRevealDuration && (
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
                  magicalRevealStart + magicalRevealDuration - magicalRevealTransition.durationInFrames,
                  magicalRevealStart + magicalRevealDuration,
                ],
                [0, 1],
                { easing: EASING_FUNCTIONS[magicalRevealTransition.easing || 'easeInOutCubic'] }
              ),
            }}
          >
            <PresentingGesture />
          </div>
        )}

      <Sequence from={presentingStart} durationInFrames={presentingDuration}>
        <PresentingGesture />
      </Sequence>
    </AbsoluteFill>
  );
};

export default MagicalRevealSequence;
