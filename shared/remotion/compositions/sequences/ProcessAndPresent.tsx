/**
 * Process and Present Sequence
 * thinking → conjuring → presenting (6 seconds)
 */

import React from 'react';
import { AbsoluteFill, Sequence, interpolate, useCurrentFrame } from 'remotion';
import { ThinkingGesture } from '../gestures/ThinkingGesture';
import { ConjuringGesture } from '../gestures/ConjuringGesture';
import { SpritesheetPlayer } from '../../sprites/SpritesheetPlayer';
import { getSequenceDefinition, getStepFrameOffset } from '../../utils/sequencing';
import { EASING_FUNCTIONS } from '../../utils/easing';

/**
 * Process and Present sequence
 * Used when wizard is processing a query and presenting results
 */
export const ProcessAndPresentSequence: React.FC = () => {
  const frame = useCurrentFrame();
  const sequence = getSequenceDefinition('process_command');

  // Get frame offsets for each step
  const thinkingStart = getStepFrameOffset('process_command', 0);
  const thinkingDuration = sequence.steps[0].durationInFrames;
  const thinkingTransition = sequence.steps[0].transition!;

  const conjuringStart = getStepFrameOffset('process_command', 1);
  const conjuringDuration = sequence.steps[1].durationInFrames;
  const conjuringTransition = sequence.steps[1].transition!;

  const presentingStart = getStepFrameOffset('process_command', 2);
  const presentingDuration = sequence.steps[2].durationInFrames;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: 'transparent',
      }}
    >
      {/* Thinking gesture */}
      <Sequence from={thinkingStart} durationInFrames={thinkingDuration}>
        <ThinkingGesture />
      </Sequence>

      {/* Crossfade transition from thinking to conjuring */}
      {frame >= thinkingStart + thinkingDuration - thinkingTransition.durationInFrames &&
        frame < thinkingStart + thinkingDuration && (
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
                  thinkingStart + thinkingDuration - thinkingTransition.durationInFrames,
                  thinkingStart + thinkingDuration,
                ],
                [0, 1],
                {
                  easing: EASING_FUNCTIONS[thinkingTransition.easing || 'easeInOutCubic'],
                }
              ),
            }}
          >
            <ConjuringGesture />
          </div>
        )}

      {/* Conjuring gesture */}
      <Sequence from={conjuringStart} durationInFrames={conjuringDuration}>
        <ConjuringGesture />
      </Sequence>

      {/* Crossfade transition from conjuring to presenting */}
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
                {
                  easing: EASING_FUNCTIONS[conjuringTransition.easing || 'easeInOutCubic'],
                }
              ),
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
              }}
            >
              <SpritesheetPlayer spritesheet="presenting" size={330} />
            </div>
          </div>
        )}

      {/* Presenting gesture */}
      <Sequence from={presentingStart} durationInFrames={presentingDuration}>
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
          }}
        >
          <SpritesheetPlayer spritesheet="presenting" size={330} />
        </div>
      </Sequence>
    </AbsoluteFill>
  );
};

export default ProcessAndPresentSequence;
