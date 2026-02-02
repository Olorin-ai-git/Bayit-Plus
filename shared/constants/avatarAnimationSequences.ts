/**
 * Avatar Animation Sequences & Storyboard
 *
 * Complete choreography for Olorin the Wizard avatar.
 * Defines visual forms, transitions, gestures, and interaction triggers.
 */

import { GestureType } from './avatarGestures';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

export type AnimationStepType =
  | 'visual_form_change'
  | 'particle_effect'
  | 'glow_effect'
  | 'movement'
  | 'gesture'
  | 'sound'
  | 'dialogue'
  | 'pause'
  | 'callback';

export type AvatarVisualForm = 'hat' | 'mini' | 'partial' | 'full';

export type ParticleEffect =
  | 'magic_sparkles'
  | 'swirl_up'
  | 'swirl_down'
  | 'burst'
  | 'fade_in'
  | 'fade_out'
  | 'glow_pulse'
  | 'dissolve'
  | 'twinkle';

export type SoundEffect =
  | 'wake_chime'
  | 'magic_whoosh'
  | 'sparkle'
  | 'materialize'
  | 'dismiss_whoosh'
  | 'error_tone'
  | 'soft_twinkle'
  | 'hat_settle';

export interface AnimationStep {
  type: AnimationStepType;
  duration: number;
  delay?: number;
  easing?: string;
  visualForm?: AvatarVisualForm;
  particle?: ParticleEffect;
  gesture?: GestureType;
  sound?: SoundEffect;
  dialogue?: string;
  dialogueKey?: string;
  target?: string;
  from?: Record<string, number | string>;
  to?: Record<string, number | string>;
  callback?: string;
}

export interface AnimationSequence {
  id: string;
  name: string;
  description: string;
  totalDuration: number;
  steps: AnimationStep[];
  onComplete?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRIGGER → BEHAVIOR MAPPINGS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Defines what happens for each user interaction trigger
 */
export const TRIGGER_BEHAVIORS: Record<string, {
  sequence: string;
  resultingState: string;
  description: string;
}> = {
  // Hat tapped → Wizard appears, listening
  hat_tapped: {
    sequence: 'summon_wizard',
    resultingState: 'listening',
    description: 'Hat tapped - Wizard appears, listening',
  },

  // "Bayit" spoken → Wizard appears, listening
  wake_word: {
    sequence: 'summon_wizard',
    resultingState: 'listening',
    description: '"Bayit" spoken - Wizard appears, listening',
  },

  // Command given → Wizard processes, responds with gestures
  command_received: {
    sequence: 'process_command',
    resultingState: 'responding',
    description: 'Command given - Wizard processes, responds with gestures',
  },

  // "Thank you" / silence / done → Wizard tips hat, returns to FAB
  task_complete: {
    sequence: 'dismiss_wizard',
    resultingState: 'dormant',
    description: 'Task complete - Wizard tips hat, returns to FAB',
  },

  // New command while wizard visible → Wizard stays, handles it
  new_command: {
    sequence: 'acknowledge_new',
    resultingState: 'listening',
    description: 'New command while visible - Wizard stays, handles it',
  },

  // Error / confusion → Wizard stays, asks for clarification
  error_occurred: {
    sequence: 'error_shake',
    resultingState: 'confused',
    description: 'Error/confusion - Wizard stays, asks for clarification',
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// GESTURE LIBRARY - SPEAKING MOMENTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Maps speaking moments to appropriate gestures
 */
export const SPEAKING_GESTURES: Record<string, {
  gesture: GestureType;
  description: string;
}> = {
  greeting: {
    gesture: 'greeting',
    description: 'Slight bow, hand to chest',
  },
  presenting_list: {
    gesture: 'presenting',
    description: 'Open palm toward content, like unveiling',
  },
  single_result: {
    gesture: 'single_result',
    description: 'Points with staff or finger',
  },
  reading_aloud: {
    gesture: 'reading',
    description: 'Looks at content, then back to user',
  },
  emphasis: {
    gesture: 'emphatic',
    description: 'Hand raised slightly',
  },
  thinking: {
    gesture: 'thinking',
    description: 'Strokes beard, looks upward',
  },
  nothing_found: {
    gesture: 'shrugging',
    description: 'Palms up, slight shrug',
  },
  confirmation_prompt: {
    gesture: 'attentive',
    description: 'Head tilt, eyebrows raised',
  },
  goodbye: {
    gesture: 'farewell',
    description: 'Tips hat, nod',
  },
  success: {
    gesture: 'success',
    description: 'Aha! moment, finger snap',
  },
  warning: {
    gesture: 'warning',
    description: 'Open palm stop motion',
  },
  agreement: {
    gesture: 'agreement',
    description: 'Nodding affirmatively',
  },
  disagreement: {
    gesture: 'disagreement',
    description: 'Gentle head shake',
  },
  magical_reveal: {
    gesture: 'magical_reveal',
    description: 'Staff swirl, magical flourish',
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// IDLE BEHAVIOR CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Idle behaviors when wizard stays visible but user pauses
 */
export const IDLE_BEHAVIORS = {
  /** Minimum time before first idle behavior (ms) */
  minIdleDelay: 5000,

  /** Maximum time between idle behaviors (ms) */
  maxIdleBetween: 8000,

  /** Time before prompting user (ms) */
  promptTimeout: 12000,

  /** Behaviors and their weights */
  behaviors: [
    { id: 'shifts_weight', weight: 30, description: 'Shifts weight slightly' },
    { id: 'adjusts_hat', weight: 25, description: 'Adjusts hat' },
    { id: 'looks_around', weight: 25, description: 'Looks around patiently' },
    { id: 'strokes_beard', weight: 15, description: 'Strokes beard thoughtfully' },
    { id: 'sighs_patiently', weight: 5, description: 'Sighs patiently' },
  ],

  /** Prompt dialogue after timeout */
  timeoutPrompt: {
    dialogueKey: 'avatar.dialogue.idleTimeout.stillThere',
    dialogue: 'Still there? Or shall I rest?',
    gesture: 'attentive' as GestureType,
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// ANIMATION SEQUENCES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * HAT → WIZARD (SUMMONING)
 *
 * 1. Wake word or tap
 * 2. Hat glows, rises
 * 3. Magical particles swirl beneath
 * 4. Wizard materializes from below hat, hat lands on head
 * 5. Wizard settles, makes eye contact
 * 6. "What do you seek?"
 */
export const SUMMON_WIZARD_SEQUENCE: AnimationSequence = {
  id: 'summon_wizard',
  name: 'Hat → Wizard (Summoning)',
  description: 'Wake animation: Hat transforms into full wizard',
  totalDuration: 3200,
  steps: [
    // 1. Hat glows
    {
      type: 'glow_effect',
      duration: 400,
      target: 'hat',
      from: { opacity: 0, scale: 1, glowIntensity: 0 },
      to: { opacity: 0.8, scale: 1.05, glowIntensity: 0.6 },
      easing: 'ease-in',
    },
    {
      type: 'sound',
      duration: 100,
      delay: 100,
      sound: 'wake_chime',
    },

    // 2. Hat rises
    {
      type: 'movement',
      duration: 400,
      delay: 400,
      target: 'hat',
      from: { y: 0, rotation: 0 },
      to: { y: -40, rotation: -8 },
      easing: 'ease-out',
    },

    // 3. Magical particles swirl beneath
    {
      type: 'particle_effect',
      duration: 1000,
      delay: 600,
      particle: 'swirl_up',
      target: 'below_hat',
    },
    {
      type: 'sound',
      duration: 100,
      delay: 700,
      sound: 'magic_whoosh',
    },

    // 4. Wizard materializes from below
    {
      type: 'visual_form_change',
      duration: 1200,
      delay: 1000,
      visualForm: 'full',
      easing: 'ease-in-out',
    },
    {
      type: 'particle_effect',
      duration: 600,
      delay: 1200,
      particle: 'magic_sparkles',
      target: 'wizard_body',
    },
    {
      type: 'sound',
      duration: 100,
      delay: 1400,
      sound: 'materialize',
    },

    // Hat lands on head
    {
      type: 'movement',
      duration: 400,
      delay: 2000,
      target: 'hat',
      from: { y: -40, rotation: -8 },
      to: { y: 0, rotation: 0 },
      easing: 'ease-in-out',
    },
    {
      type: 'particle_effect',
      duration: 200,
      delay: 2350,
      particle: 'sparkle',
      target: 'hat',
    },

    // 5. Wizard settles, makes eye contact
    {
      type: 'gesture',
      duration: 500,
      delay: 2400,
      gesture: 'greeting',
    },

    // 6. "What do you seek?"
    {
      type: 'dialogue',
      duration: 400,
      delay: 2800,
      dialogueKey: 'avatar.dialogue.wake.seek',
      dialogue: 'What do you seek?',
    },
  ],
  onComplete: 'listening',
};

/**
 * WIZARD → HAT (DISMISSING)
 *
 * 1. Task complete or user dismisses
 * 2. Wizard tips hat, slight bow
 * 3. Figure dissolves into particles
 * 4. Hat floats back to FAB position
 * 5. Soft twinkle, settles
 */
export const DISMISS_WIZARD_SEQUENCE: AnimationSequence = {
  id: 'dismiss_wizard',
  name: 'Wizard → Hat (Dismissing)',
  description: 'Goodbye animation: Wizard returns to dormant hat',
  totalDuration: 3200,
  steps: [
    // 1 & 2. Wizard tips hat, slight bow
    {
      type: 'gesture',
      duration: 800,
      gesture: 'farewell',
    },
    {
      type: 'dialogue',
      duration: 600,
      delay: 200,
      dialogueKey: 'avatar.dialogue.dismissal.rest',
      dialogue: 'The wizard rests. Call when you need me.',
    },

    // 3. Figure dissolves into particles
    {
      type: 'particle_effect',
      duration: 1000,
      delay: 1000,
      particle: 'dissolve',
      target: 'wizard_body',
    },
    {
      type: 'sound',
      duration: 100,
      delay: 1100,
      sound: 'dismiss_whoosh',
    },

    // Visual form change to hat (during dissolve)
    {
      type: 'visual_form_change',
      duration: 800,
      delay: 1200,
      visualForm: 'hat',
      easing: 'ease-in-out',
    },

    // 4. Hat floats back to FAB position
    {
      type: 'movement',
      duration: 600,
      delay: 2000,
      target: 'hat',
      from: { y: 0, scale: 1.2 },
      to: { y: 0, scale: 1 },
      easing: 'ease-out',
    },

    // 5. Soft twinkle, settles
    {
      type: 'particle_effect',
      duration: 400,
      delay: 2600,
      particle: 'soft_twinkle',
      target: 'hat',
    },
    {
      type: 'sound',
      duration: 100,
      delay: 2700,
      sound: 'soft_twinkle',
    },
    {
      type: 'glow_effect',
      duration: 500,
      delay: 2700,
      target: 'hat',
      from: { opacity: 0.5 },
      to: { opacity: 0 },
      easing: 'ease-out',
    },
  ],
  onComplete: 'dormant',
};

/**
 * PROCESS COMMAND
 * Brief acknowledgment when receiving a new command
 */
export const PROCESS_COMMAND_SEQUENCE: AnimationSequence = {
  id: 'process_command',
  name: 'Process Command',
  description: 'Acknowledges command and begins processing',
  totalDuration: 1200,
  steps: [
    {
      type: 'gesture',
      duration: 600,
      gesture: 'attentive',
    },
    {
      type: 'dialogue',
      duration: 400,
      delay: 200,
      dialogueKey: 'avatar.dialogue.listening.letMeSee',
      dialogue: 'Let me see...',
    },
    {
      type: 'gesture',
      duration: 600,
      delay: 600,
      gesture: 'thinking',
    },
  ],
  onComplete: 'processing',
};

/**
 * ACKNOWLEDGE NEW COMMAND
 * When user gives new command while wizard is visible
 */
export const ACKNOWLEDGE_NEW_SEQUENCE: AnimationSequence = {
  id: 'acknowledge_new',
  name: 'Acknowledge New Command',
  description: 'Wizard stays visible, handles new command',
  totalDuration: 800,
  steps: [
    {
      type: 'gesture',
      duration: 400,
      gesture: 'attentive',
    },
    {
      type: 'dialogue',
      duration: 400,
      delay: 200,
      dialogueKey: 'avatar.dialogue.interruption.got',
      dialogue: 'Got it.',
    },
  ],
  onComplete: 'listening',
};

/**
 * ERROR SHAKE
 * Visual feedback for errors
 */
export const ERROR_SHAKE_SEQUENCE: AnimationSequence = {
  id: 'error_shake',
  name: 'Error Shake',
  description: 'Visual feedback for errors',
  totalDuration: 1400,
  steps: [
    {
      type: 'sound',
      duration: 100,
      sound: 'error_tone',
    },
    {
      type: 'gesture',
      duration: 800,
      gesture: 'confused',
    },
    // Shake animation
    {
      type: 'movement',
      duration: 80,
      delay: 100,
      target: 'wizard',
      from: { x: 0 },
      to: { x: -8 },
      easing: 'ease-out',
    },
    {
      type: 'movement',
      duration: 80,
      delay: 180,
      target: 'wizard',
      from: { x: -8 },
      to: { x: 8 },
      easing: 'linear',
    },
    {
      type: 'movement',
      duration: 80,
      delay: 260,
      target: 'wizard',
      from: { x: 8 },
      to: { x: -4 },
      easing: 'linear',
    },
    {
      type: 'movement',
      duration: 80,
      delay: 340,
      target: 'wizard',
      from: { x: -4 },
      to: { x: 0 },
      easing: 'ease-out',
    },
    {
      type: 'dialogue',
      duration: 600,
      delay: 800,
      dialogueKey: 'avatar.dialogue.error.awry',
      dialogue: 'Something went awry. Shall we try again?',
    },
  ],
  onComplete: 'confused',
};

/**
 * MAGICAL REVEAL
 * Dramatic presentation of search results
 */
export const MAGICAL_REVEAL_SEQUENCE: AnimationSequence = {
  id: 'magical_reveal',
  name: 'Magical Reveal',
  description: 'Dramatic presentation of search results',
  totalDuration: 2200,
  steps: [
    {
      type: 'gesture',
      duration: 1200,
      gesture: 'magical_reveal',
    },
    {
      type: 'particle_effect',
      duration: 800,
      delay: 400,
      particle: 'burst',
      target: 'staff',
    },
    {
      type: 'sound',
      duration: 100,
      delay: 600,
      sound: 'sparkle',
    },
    {
      type: 'dialogue',
      duration: 800,
      delay: 1400,
      dialogueKey: 'avatar.dialogue.presenting.behold',
      dialogue: 'Behold what the archives reveal...',
    },
  ],
  onComplete: 'presenting',
};

/**
 * SUCCESS CELEBRATION
 * Acknowledging successful completion
 */
export const SUCCESS_SEQUENCE: AnimationSequence = {
  id: 'success',
  name: 'Success',
  description: 'Celebrates successful task completion',
  totalDuration: 1600,
  steps: [
    {
      type: 'gesture',
      duration: 800,
      gesture: 'success',
    },
    {
      type: 'particle_effect',
      duration: 400,
      delay: 300,
      particle: 'magic_sparkles',
      target: 'wizard',
    },
    {
      type: 'sound',
      duration: 100,
      delay: 400,
      sound: 'sparkle',
    },
    {
      type: 'dialogue',
      duration: 600,
      delay: 800,
      dialogueKey: 'avatar.dialogue.success.done',
      dialogue: 'It is done.',
    },
  ],
  onComplete: 'idle_active',
};

// ═══════════════════════════════════════════════════════════════════════════════
// SEQUENCE REGISTRY
// ═══════════════════════════════════════════════════════════════════════════════

export const ANIMATION_SEQUENCES: Record<string, AnimationSequence> = {
  summon_wizard: SUMMON_WIZARD_SEQUENCE,
  dismiss_wizard: DISMISS_WIZARD_SEQUENCE,
  process_command: PROCESS_COMMAND_SEQUENCE,
  acknowledge_new: ACKNOWLEDGE_NEW_SEQUENCE,
  error_shake: ERROR_SHAKE_SEQUENCE,
  magical_reveal: MAGICAL_REVEAL_SEQUENCE,
  success: SUCCESS_SEQUENCE,
};

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

export function getAnimationSequence(id: string): AnimationSequence | null {
  return ANIMATION_SEQUENCES[id] || null;
}

export function getSequenceForTrigger(trigger: string): AnimationSequence | null {
  const behavior = TRIGGER_BEHAVIORS[trigger];
  if (!behavior) return null;
  return ANIMATION_SEQUENCES[behavior.sequence] || null;
}

export function getGestureForMoment(moment: string): GestureType | null {
  const mapping = SPEAKING_GESTURES[moment];
  return mapping?.gesture || null;
}

export function selectIdleBehavior(): string {
  const totalWeight = IDLE_BEHAVIORS.behaviors.reduce((sum, b) => sum + b.weight, 0);
  let random = Math.random() * totalWeight;

  for (const behavior of IDLE_BEHAVIORS.behaviors) {
    random -= behavior.weight;
    if (random <= 0) {
      return behavior.id;
    }
  }

  return IDLE_BEHAVIORS.behaviors[0].id;
}

export function calculateSequenceDuration(sequence: AnimationSequence): number {
  let maxEndTime = 0;
  for (const step of sequence.steps) {
    const endTime = (step.delay || 0) + step.duration;
    if (endTime > maxEndTime) {
      maxEndTime = endTime;
    }
  }
  return maxEndTime;
}
