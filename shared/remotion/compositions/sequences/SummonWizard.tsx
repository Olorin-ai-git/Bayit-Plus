/**
 * Summon Wizard Sequence
 * puffs_in → greeting → attentive (3.5s)
 */

import React from 'react';
import { AbsoluteFill, Sequence, interpolate, useCurrentFrame } from 'remotion';
import { PuffsInGesture } from '../gestures/PuffsInGesture';
import { GreetingGesture } from '../gestures/GreetingGesture';
import { AttentiveGesture } from '../gestures/AttentiveGesture';
import { getSequenceDefinition, getStepFrameOffset } from '../../utils/sequencing';
import { EASING_FUNCTIONS } from '../../utils/easing';

export const SummonWizardSequence: React.FC = () => {
  const frame = useCurrentFrame();
  const sequence = getSequenceDefinition('summon_wizard');

  const puffsInStart = getStepFrameOffset('summon_wizard', 0);
  const puffsInDuration = sequence.steps[0].durationInFrames;
  const puffsInTransition = sequence.steps[0].transition!;

  const greetingStart = getStepFrameOffset('summon_wizard', 1);
  const greetingDuration = sequence.steps[1].durationInFrames;
  const greetingTransition = sequence.steps[1].transition!;

  const attentiveStart = getStepFrameOffset('summon_wizard', 2);
  const attentiveDuration = sequence.steps[2].durationInFrames;

  return (
    <AbsoluteFill style={{ backgroundColor: 'transparent' }}>
      {/* Puffs In */}
      <Sequence from={puffsInStart} durationInFrames={puffsInDuration}>
        <PuffsInGesture />
      </Sequence>

      {/* Crossfade to Greeting */}
      {frame >= puffsInStart + puffsInDuration - puffsInTransition.durationInFrames &&
        frame < puffsInStart + puffsInDuration && (
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
                  puffsInStart + puffsInDuration - puffsInTransition.durationInFrames,
                  puffsInStart + puffsInDuration,
                ],
                [0, 1],
                { easing: EASING_FUNCTIONS[puffsInTransition.easing || 'easeInOutCubic'] }
              ),
            }}
          >
            <GreetingGesture />
          </div>
        )}

      {/* Greeting */}
      <Sequence from={greetingStart} durationInFrames={greetingDuration}>
        <GreetingGesture />
      </Sequence>

      {/* Crossfade to Attentive */}
      {frame >= greetingStart + greetingDuration - greetingTransition.durationInFrames &&
        frame < greetingStart + greetingDuration && (
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
                  greetingStart + greetingDuration - greetingTransition.durationInFrames,
                  greetingStart + greetingDuration,
                ],
                [0, 1],
                { easing: EASING_FUNCTIONS[greetingTransition.easing || 'easeInOutCubic'] }
              ),
            }}
          >
            <AttentiveGesture />
          </div>
        )}

      {/* Attentive */}
      <Sequence from={attentiveStart} durationInFrames={attentiveDuration}>
        <AttentiveGesture />
      </Sequence>
    </AbsoluteFill>
  );
};

export default SummonWizardSequence;
