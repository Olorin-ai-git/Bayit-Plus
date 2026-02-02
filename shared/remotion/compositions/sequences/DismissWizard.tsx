/**
 * Dismiss Wizard Sequence
 * farewell → puffs_out (3s)
 */

import React from 'react';
import { AbsoluteFill, Sequence, interpolate, useCurrentFrame } from 'remotion';
import { FarewellGesture } from '../gestures/FarewellGesture';
import { PuffsOutGesture } from '../gestures/PuffsOutGesture';
import { getSequenceDefinition, getStepFrameOffset } from '../../utils/sequencing';
import { EASING_FUNCTIONS } from '../../utils/easing';

export const DismissWizardSequence: React.FC = () => {
  const frame = useCurrentFrame();
  const sequence = getSequenceDefinition('dismiss_wizard');

  const farewellStart = getStepFrameOffset('dismiss_wizard', 0);
  const farewellDuration = sequence.steps[0].durationInFrames;
  const farewellTransition = sequence.steps[0].transition!;

  const puffsOutStart = getStepFrameOffset('dismiss_wizard', 1);
  const puffsOutDuration = sequence.steps[1].durationInFrames;

  return (
    <AbsoluteFill style={{ backgroundColor: 'transparent' }}>
      <Sequence from={farewellStart} durationInFrames={farewellDuration}>
        <FarewellGesture />
      </Sequence>

      {/* Crossfade */}
      {frame >= farewellStart + farewellDuration - farewellTransition.durationInFrames &&
        frame < farewellStart + farewellDuration && (
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
                  farewellStart + farewellDuration - farewellTransition.durationInFrames,
                  farewellStart + farewellDuration,
                ],
                [0, 1],
                { easing: EASING_FUNCTIONS[farewellTransition.easing || 'easeInOutCubic'] }
              ),
            }}
          >
            <PuffsOutGesture />
          </div>
        )}

      <Sequence from={puffsOutStart} durationInFrames={puffsOutDuration}>
        <PuffsOutGesture />
      </Sequence>
    </AbsoluteFill>
  );
};

export default DismissWizardSequence;
