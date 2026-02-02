/**
 * Remotion Root Composition Registry
 * Central registration of all Remotion compositions
 */

import React from 'react';
import { Composition, registerRoot } from 'remotion';

// Gesture compositions
import { ConjuringGesture } from './compositions/gestures/ConjuringGesture';
import { ThinkingGesture } from './compositions/gestures/ThinkingGesture';
import { GreetingGesture } from './compositions/gestures/GreetingGesture';
import { PresentingGesture } from './compositions/gestures/PresentingGesture';
import { BrowsingGesture } from './compositions/gestures/BrowsingGesture';
import { ShruggingGesture } from './compositions/gestures/ShruggingGesture';
import { ConfusedGesture } from './compositions/gestures/ConfusedGesture';
import { SingleResultGesture } from './compositions/gestures/SingleResultGesture';
import { MagicalRevealGesture } from './compositions/gestures/MagicalRevealGesture';
import { SuccessGesture } from './compositions/gestures/SuccessGesture';
import { CheeringGesture } from './compositions/gestures/CheeringGesture';
import { AttentiveGesture } from './compositions/gestures/AttentiveGesture';
import { ConfirmationGesture } from './compositions/gestures/ConfirmationGesture';
import { FarewellGesture } from './compositions/gestures/FarewellGesture';
import { PuffsInGesture } from './compositions/gestures/PuffsInGesture';
import { PuffsOutGesture } from './compositions/gestures/PuffsOutGesture';
import { ClappingGesture } from './compositions/gestures/ClappingGesture';
import { SpeakingGesture } from './compositions/gestures/SpeakingGesture';
import { CryingGesture } from './compositions/gestures/CryingGesture';
import { SmackingGesture } from './compositions/gestures/SmackingGesture';
import { ListeningGesture } from './compositions/gestures/ListeningGesture';
import { ClarificationGesture } from './compositions/gestures/ClarificationGesture';
import { WarningGesture } from './compositions/gestures/WarningGesture';
import { AgreementGesture } from './compositions/gestures/AgreementGesture';
import { DisagreementGesture } from './compositions/gestures/DisagreementGesture';
import { WaitingGesture } from './compositions/gestures/WaitingGesture';
import { EmphaticGesture } from './compositions/gestures/EmphaticGesture';
import { ReadingGesture } from './compositions/gestures/ReadingGesture';
import { ShiftsWeightGesture } from './compositions/gestures/ShiftsWeightGesture';
import { AdjustsHatGesture } from './compositions/gestures/AdjustsHatGesture';
import { LooksAroundGesture } from './compositions/gestures/LooksAroundGesture';

// Sequence compositions
import { ProcessAndPresentSequence } from './compositions/sequences/ProcessAndPresent';
import { SummonWizardSequence } from './compositions/sequences/SummonWizard';
import { DismissWizardSequence } from './compositions/sequences/DismissWizard';
import { MagicalRevealSequence } from './compositions/sequences/MagicalReveal';
import { ErrorShakeSequence } from './compositions/sequences/ErrorShake';
import { SuccessSequence } from './compositions/sequences/Success';
import { AcknowledgeNewSequence } from './compositions/sequences/AcknowledgeNew';

// Utilities
import { calculateFrameCount, getSequenceDefinition } from './utils/sequencing';
import { calculateRemotionDuration } from './sprites/SpritesheetConfig';
import { REMOTION_CONFIG } from './config/remotion.config';

/**
 * Remotion Root - Register all compositions
 */
export const RemotionRoot: React.FC = () => {
  // Individual gesture compositions (31 implemented - 100% complete!)
  const gestureCompositions = [
    {
      id: 'ConjuringGesture',
      component: ConjuringGesture,
      durationInFrames: calculateRemotionDuration('conjuring'),
    },
    {
      id: 'ThinkingGesture',
      component: ThinkingGesture,
      durationInFrames: calculateRemotionDuration('thinking'),
    },
    {
      id: 'GreetingGesture',
      component: GreetingGesture,
      durationInFrames: calculateRemotionDuration('greeting'),
    },
    {
      id: 'PresentingGesture',
      component: PresentingGesture,
      durationInFrames: calculateRemotionDuration('presenting'),
    },
    {
      id: 'BrowsingGesture',
      component: BrowsingGesture,
      durationInFrames: calculateRemotionDuration('browsing'),
    },
    {
      id: 'ShruggingGesture',
      component: ShruggingGesture,
      durationInFrames: calculateRemotionDuration('shrugging'),
    },
    {
      id: 'ConfusedGesture',
      component: ConfusedGesture,
      durationInFrames: calculateRemotionDuration('confused'),
    },
    {
      id: 'SingleResultGesture',
      component: SingleResultGesture,
      durationInFrames: calculateRemotionDuration('single_result'),
    },
    {
      id: 'MagicalRevealGesture',
      component: MagicalRevealGesture,
      durationInFrames: calculateRemotionDuration('magical_reveal'),
    },
    {
      id: 'SuccessGesture',
      component: SuccessGesture,
      durationInFrames: calculateRemotionDuration('success'),
    },
    {
      id: 'CheeringGesture',
      component: CheeringGesture,
      durationInFrames: calculateRemotionDuration('cheering'),
    },
    {
      id: 'ClappingGesture',
      component: ClappingGesture,
      durationInFrames: calculateRemotionDuration('clapping'),
    },
    {
      id: 'AttentiveGesture',
      component: AttentiveGesture,
      durationInFrames: calculateRemotionDuration('attentive'),
    },
    {
      id: 'ConfirmationGesture',
      component: ConfirmationGesture,
      durationInFrames: calculateRemotionDuration('confirmation'),
    },
    {
      id: 'FarewellGesture',
      component: FarewellGesture,
      durationInFrames: calculateRemotionDuration('farewell'),
    },
    {
      id: 'PuffsInGesture',
      component: PuffsInGesture,
      durationInFrames: calculateRemotionDuration('puffs_in'),
    },
    {
      id: 'PuffsOutGesture',
      component: PuffsOutGesture,
      durationInFrames: calculateRemotionDuration('puffs_out'),
    },
    {
      id: 'SpeakingGesture',
      component: SpeakingGesture,
      durationInFrames: calculateRemotionDuration('speaking'),
    },
    {
      id: 'CryingGesture',
      component: CryingGesture,
      durationInFrames: calculateRemotionDuration('crying'),
    },
    {
      id: 'SmackingGesture',
      component: SmackingGesture,
      durationInFrames: calculateRemotionDuration('smacking'),
    },
    {
      id: 'ListeningGesture',
      component: ListeningGesture,
      durationInFrames: calculateRemotionDuration('listening'),
    },
    {
      id: 'ClarificationGesture',
      component: ClarificationGesture,
      durationInFrames: calculateRemotionDuration('clarification'),
    },
    {
      id: 'WarningGesture',
      component: WarningGesture,
      durationInFrames: calculateRemotionDuration('warning'),
    },
    {
      id: 'AgreementGesture',
      component: AgreementGesture,
      durationInFrames: calculateRemotionDuration('agreement'),
    },
    {
      id: 'DisagreementGesture',
      component: DisagreementGesture,
      durationInFrames: calculateRemotionDuration('disagreement'),
    },
    {
      id: 'WaitingGesture',
      component: WaitingGesture,
      durationInFrames: calculateRemotionDuration('waiting'),
    },
    {
      id: 'EmphaticGesture',
      component: EmphaticGesture,
      durationInFrames: calculateRemotionDuration('emphatic'),
    },
    {
      id: 'ReadingGesture',
      component: ReadingGesture,
      durationInFrames: calculateRemotionDuration('reading'),
    },
    {
      id: 'ShiftsWeightGesture',
      component: ShiftsWeightGesture,
      durationInFrames: calculateRemotionDuration('shifts_weight'),
    },
    {
      id: 'AdjustsHatGesture',
      component: AdjustsHatGesture,
      durationInFrames: calculateRemotionDuration('adjusts_hat'),
    },
    {
      id: 'LooksAroundGesture',
      component: LooksAroundGesture,
      durationInFrames: calculateRemotionDuration('looks_around'),
    },
  ];

  // Multi-gesture sequences (all 7 implemented)
  const sequenceCompositions = [
    {
      id: 'SummonWizardSequence',
      component: SummonWizardSequence,
      durationInFrames: calculateFrameCount('summon_wizard'),
    },
    {
      id: 'DismissWizardSequence',
      component: DismissWizardSequence,
      durationInFrames: calculateFrameCount('dismiss_wizard'),
    },
    {
      id: 'ProcessAndPresentSequence',
      component: ProcessAndPresentSequence,
      durationInFrames: calculateFrameCount('process_command'),
    },
    {
      id: 'MagicalRevealSequence',
      component: MagicalRevealSequence,
      durationInFrames: calculateFrameCount('magical_reveal'),
    },
    {
      id: 'ErrorShakeSequence',
      component: ErrorShakeSequence,
      durationInFrames: calculateFrameCount('error_shake'),
    },
    {
      id: 'SuccessSequence',
      component: SuccessSequence,
      durationInFrames: calculateFrameCount('success'),
    },
    {
      id: 'AcknowledgeNewSequence',
      component: AcknowledgeNewSequence,
      durationInFrames: calculateFrameCount('acknowledge_new'),
    },
  ];

  return (
    <>
      {/* Register individual gesture compositions */}
      {gestureCompositions.map((composition) => (
        <Composition
          key={composition.id}
          id={composition.id}
          component={composition.component}
          durationInFrames={composition.durationInFrames}
          fps={REMOTION_CONFIG.fps}
          width={REMOTION_CONFIG.width}
          height={REMOTION_CONFIG.height}
        />
      ))}

      {/* Register sequence compositions */}
      {sequenceCompositions.map((composition) => (
        <Composition
          key={composition.id}
          id={composition.id}
          component={composition.component}
          durationInFrames={composition.durationInFrames}
          fps={REMOTION_CONFIG.fps}
          width={REMOTION_CONFIG.width}
          height={REMOTION_CONFIG.height}
        />
      ))}
    </>
  );
};

// Register the root component
registerRoot(RemotionRoot);

export default RemotionRoot;
