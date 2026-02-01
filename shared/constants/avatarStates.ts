/**
 * Enhanced Avatar State System - Olorin Wizard Character
 *
 * Core states with visual behaviors and purposes
 */

export type AvatarCoreState =
  | 'dormant'
  | 'listening'
  | 'processing'
  | 'responding'
  | 'confused'
  | 'interrupted';

export type AvatarVisualForm = 'hat' | 'wizard';

export interface AvatarStateDefinition {
  state: AvatarCoreState;
  visualBehavior: string;
  purpose: string;
  form: AvatarVisualForm;
  canInterrupt: boolean;
  autoTransitionTo?: AvatarCoreState;
  autoTransitionDelay?: number;
}

/**
 * Core Avatar States
 */
export const AVATAR_CORE_STATES: Record<AvatarCoreState, AvatarStateDefinition> = {
  dormant: {
    state: 'dormant',
    visualBehavior: 'Subtle ambient presence or hidden (hat only)',
    purpose: 'Not intrusive when unused',
    form: 'hat',
    canInterrupt: false,
  },
  listening: {
    state: 'listening',
    visualBehavior: 'Appears, attentive posture, visual indicator',
    purpose: 'Confirms wake word heard',
    form: 'wizard',
    canInterrupt: true,
  },
  processing: {
    state: 'processing',
    visualBehavior: 'Thinking animation, consulting archives',
    purpose: 'Feedback that command is being handled',
    form: 'wizard',
    canInterrupt: true,
  },
  responding: {
    state: 'responding',
    visualBehavior: 'Gestures toward content, speaks',
    purpose: 'Delivers results with personality',
    form: 'wizard',
    canInterrupt: true,
  },
  confused: {
    state: 'confused',
    visualBehavior: 'Quizzical expression',
    purpose: 'Prompts clarification naturally',
    form: 'wizard',
    canInterrupt: true,
    autoTransitionTo: 'listening',
    autoTransitionDelay: 3000,
  },
  interrupted: {
    state: 'interrupted',
    visualBehavior: 'Pauses mid-action, attentive',
    purpose: 'Acknowledges user interruption',
    form: 'wizard',
    canInterrupt: false,
    autoTransitionTo: 'listening',
    autoTransitionDelay: 500,
  },
};

/**
 * State transition rules
 */
export const AVATAR_STATE_TRANSITIONS: Record<AvatarCoreState, AvatarCoreState[]> = {
  dormant: ['listening'],
  listening: ['processing', 'dormant', 'confused', 'interrupted'],
  processing: ['responding', 'confused', 'interrupted', 'dormant'],
  responding: ['listening', 'dormant', 'interrupted', 'processing'],
  confused: ['listening', 'dormant', 'interrupted'],
  interrupted: ['listening', 'dormant'],
};

/**
 * Check if state transition is valid
 */
export function canTransitionState(from: AvatarCoreState, to: AvatarCoreState): boolean {
  return AVATAR_STATE_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Hat → Wizard Transition Choreography
 */
export const HAT_TO_WIZARD_TRANSITION = {
  phases: [
    { name: 'glow', duration: 200, description: 'Hat glows' },
    { name: 'rise', duration: 300, description: 'Hat rises' },
    { name: 'particles', duration: 400, description: 'Magical particles swirl beneath' },
    { name: 'materialize', duration: 600, description: 'Wizard materializes from below hat' },
    { name: 'settle', duration: 300, description: 'Hat lands on head, wizard settles' },
    { name: 'contact', duration: 200, description: 'Makes eye contact' },
  ],
  totalDuration: 2000,
};

/**
 * Wizard → Hat Transition Choreography
 */
export const WIZARD_TO_HAT_TRANSITION = {
  phases: [
    { name: 'tip_hat', duration: 400, description: 'Wizard tips hat, slight bow' },
    { name: 'dissolve', duration: 600, description: 'Figure dissolves into particles' },
    { name: 'float', duration: 400, description: 'Hat floats back to FAB position' },
    { name: 'twinkle', duration: 300, description: 'Soft twinkle effect' },
    { name: 'settle', duration: 300, description: 'Hat settles into FAB' },
  ],
  totalDuration: 2000,
};

/**
 * State triggers and their actions
 */
export interface StateTrigger {
  trigger: string;
  currentState: AvatarCoreState | 'any';
  nextState: AvatarCoreState;
  action?: string;
}

export const STATE_TRIGGERS: StateTrigger[] = [
  { trigger: 'hat_tapped', currentState: 'dormant', nextState: 'listening' },
  { trigger: 'wake_word', currentState: 'dormant', nextState: 'listening' },
  { trigger: 'command_received', currentState: 'listening', nextState: 'processing' },
  { trigger: 'results_ready', currentState: 'processing', nextState: 'responding' },
  { trigger: 'no_results', currentState: 'processing', nextState: 'confused' },
  { trigger: 'speech_not_understood', currentState: 'listening', nextState: 'confused' },
  { trigger: 'user_dismisses', currentState: 'any', nextState: 'dormant' },
  { trigger: 'thank_you', currentState: 'any', nextState: 'dormant' },
  { trigger: 'silence_timeout', currentState: 'listening', nextState: 'dormant' },
  { trigger: 'idle_timeout', currentState: 'responding', nextState: 'dormant' },
  { trigger: 'stop_command', currentState: 'any', nextState: 'interrupted' },
  { trigger: 'new_command', currentState: 'responding', nextState: 'interrupted' },
  { trigger: 'clarification_given', currentState: 'confused', nextState: 'processing' },
  { trigger: 'new_command_ready', currentState: 'interrupted', nextState: 'listening' },
];

/**
 * Get next state based on trigger
 */
export function getNextState(
  currentState: AvatarCoreState,
  trigger: string
): AvatarCoreState | null {
  const match = STATE_TRIGGERS.find(
    (t) =>
      t.trigger === trigger && (t.currentState === currentState || t.currentState === 'any')
  );
  return match?.nextState ?? null;
}

/**
 * Interruption detection patterns
 */
export const INTERRUPTION_PATTERNS = {
  stopWords: ['stop', 'pause', 'wait', 'hold on', 'never mind', 'cancel', 'עצור', 'חכה', 'בטל'],
  newCommandIndicators: [
    'actually',
    'instead',
    'no',
    'different',
    'actually show me',
    'wait show me',
    'בעצם',
    'לא',
    'אחר',
  ],
};

/**
 * Check if text contains interruption
 */
export function isInterruption(text: string): { isStop: boolean; isNewCommand: boolean } {
  const lowerText = text.toLowerCase().trim();

  const isStop = INTERRUPTION_PATTERNS.stopWords.some(
    (word) => lowerText === word || lowerText.startsWith(word + ' ')
  );

  const isNewCommand = INTERRUPTION_PATTERNS.newCommandIndicators.some((indicator) =>
    lowerText.includes(indicator.toLowerCase())
  );

  return { isStop, isNewCommand };
}

/**
 * Timing configurations for states
 */
export const STATE_TIMING = {
  // Time before listening times out (ms)
  listeningTimeout: 10000,

  // Time before responding wizard auto-dismisses (ms)
  respondingIdleTimeout: 30000,

  // Minimum time in responding before interrupt allowed (ms)
  minRespondingTime: 500,

  // Time to show interrupted state (ms)
  interruptedDisplayTime: 500,

  // Debounce time for state changes (ms)
  stateChangeDebounce: 100,
};
