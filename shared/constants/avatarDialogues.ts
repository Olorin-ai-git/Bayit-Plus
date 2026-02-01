/**
 * Avatar Dialogue System - Olorin Wizard Character
 *
 * Character Traits:
 * - Wise but warm, not intimidating
 * - Slight twinkle of humor (Gandalf's wry smile)
 * - Patient with users, never condescending
 * - Mysterious enough to feel magical, approachable enough to feel like a companion
 */

export type DialogueCategory =
  | 'wake'
  | 'listening'
  | 'processing'
  | 'presenting_media'
  | 'presenting_list'
  | 'presenting_single'
  | 'fuzzy_search'
  | 'nothing_found'
  | 'clarification'
  | 'confirmation'
  | 'dismissal'
  | 'dismissal_late'
  | 'interruption'
  | 'error'
  | 'personality'
  | 'idle_timeout';

export type DialogueContext =
  | 'default'
  | 'channels'
  | 'podcasts'
  | 'movies'
  | 'series'
  | 'radio'
  | 'search'
  | 'complex_request'
  | 'obscure_find'
  | 'polite_user'
  | 'repeat_request';

export interface DialogueLine {
  text: string;
  gesture?: string;
  duration?: number;
  context?: DialogueContext;
}

export interface DialogueSet {
  lines: DialogueLine[];
  fallback: string;
}

/**
 * Get a random dialogue line from a category
 */
export function getRandomDialogue(
  category: DialogueCategory,
  context: DialogueContext = 'default'
): DialogueLine {
  const set = AVATAR_DIALOGUES[category];
  if (!set) {
    return { text: 'I am here.', gesture: 'idle' };
  }

  const contextLines = set.lines.filter(
    (line) => !line.context || line.context === context || line.context === 'default'
  );

  const lines = contextLines.length > 0 ? contextLines : set.lines;
  const randomIndex = Math.floor(Math.random() * lines.length);
  return lines[randomIndex] || { text: set.fallback, gesture: 'idle' };
}

/**
 * Get dialogue for time-based greeting
 */
export function getTimeBasedGreeting(): DialogueLine {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 12) {
    return { text: 'Good morning. What do you seek?', gesture: 'greeting' };
  } else if (hour >= 12 && hour < 17) {
    return { text: 'Good afternoon. How may I help?', gesture: 'greeting' };
  } else if (hour >= 17 && hour < 21) {
    return { text: 'Good evening. I am at your service.', gesture: 'greeting' };
  } else {
    return { text: 'The hour grows late. What do you need?', gesture: 'greeting' };
  }
}

/**
 * Complete Dialogue Database
 */
export const AVATAR_DIALOGUES: Record<DialogueCategory, DialogueSet> = {
  // Wake Word Responses
  wake: {
    lines: [
      { text: 'I am here.', gesture: 'greeting' },
      { text: 'At your service.', gesture: 'greeting' },
      { text: 'Speak, and I shall listen.', gesture: 'listening' },
      { text: 'Yes?', gesture: 'attentive' },
      { text: 'What do you seek?', gesture: 'greeting' },
      { text: "I'm listening.", gesture: 'listening' },
      { text: 'The wizard awaits.', gesture: 'greeting' },
    ],
    fallback: 'I am here.',
  },

  // Listening / Short Processing
  listening: {
    lines: [
      { text: 'Hmm, let me see...', gesture: 'thinking' },
      { text: 'One moment...', gesture: 'thinking' },
      { text: 'Consulting the archives...', gesture: 'browsing' },
      { text: 'Ah, yes...', gesture: 'thinking' },
      { text: 'Let me find that...', gesture: 'browsing' },
    ],
    fallback: 'One moment...',
  },

  // Longer Processing
  processing: {
    lines: [
      { text: 'The scrolls are vast... patience.', gesture: 'thinking' },
      { text: 'Searching the depths...', gesture: 'browsing' },
      { text: 'This requires a deeper look...', gesture: 'thinking' },
      { text: 'Consulting ancient knowledge...', gesture: 'conjuring' },
    ],
    fallback: 'Searching...',
  },

  // Presenting Media (Channels)
  presenting_media: {
    lines: [
      { text: 'Here you are.', gesture: 'presenting', context: 'channels' },
      { text: 'As you wish. Your channels.', gesture: 'presenting', context: 'channels' },
      { text: 'Behold.', gesture: 'presenting' },
      { text: "I've summoned them for you.", gesture: 'conjuring' },
      { text: 'Here — exactly as requested.', gesture: 'presenting' },
    ],
    fallback: 'Here you are.',
  },

  // Presenting Lists (Podcasts, Movies, Shows)
  presenting_list: {
    lines: [
      { text: 'I found {count} that may interest you...', gesture: 'presenting' },
      { text: 'Your podcasts have new tales to tell.', gesture: 'presenting', context: 'podcasts' },
      { text: 'Several treasures match your request...', gesture: 'presenting' },
      { text: 'The archives reveal these...', gesture: 'browsing' },
      { text: 'Here is what I found...', gesture: 'presenting' },
    ],
    fallback: 'Here is what I found.',
  },

  // Presenting Single Item
  presenting_single: {
    lines: [
      { text: 'This is what you seek.', gesture: 'presenting' },
      { text: 'Found it.', gesture: 'presenting' },
      { text: 'Here — exactly as you described.', gesture: 'presenting' },
      { text: 'Ah! This one.', gesture: 'presenting' },
    ],
    fallback: 'Here it is.',
  },

  // Fuzzy Search Success
  fuzzy_search: {
    lines: [
      { text: "You said '{query}'... I found these in your collection.", gesture: 'presenting' },
      { text: "Ah — '{query}.' Several possibilities here.", gesture: 'presenting' },
      { text: "The word '{query}' appears in these titles...", gesture: 'browsing' },
      { text: "Searching for '{query}'... here are the matches.", gesture: 'presenting' },
    ],
    fallback: 'I found these matches.',
  },

  // Nothing Found
  nothing_found: {
    lines: [
      { text: 'Hmm. The archives reveal nothing. Perhaps rephrase?', gesture: 'shrugging' },
      { text: "I searched, but found no match. Shall we try another way?", gesture: 'thinking' },
      { text: 'Nothing by that name. Could you describe it differently?', gesture: 'confused' },
      { text: "Even wizards have limits. I couldn't find that.", gesture: 'shrugging' },
      { text: 'The scrolls are silent on this matter.', gesture: 'thinking' },
    ],
    fallback: 'I could not find that.',
  },

  // Clarification Needed
  clarification: {
    lines: [
      { text: "I didn't quite catch that. Once more?", gesture: 'confused' },
      { text: "My hearing isn't what it was. Again?", gesture: 'listening' },
      { text: 'Say that again for me.', gesture: 'listening' },
      { text: "I'm uncertain what you mean. Could you clarify?", gesture: 'confused' },
      { text: "Did you say '{guess}', or something else?", gesture: 'thinking' },
    ],
    fallback: 'Could you repeat that?',
  },

  // Confirmation Prompts
  confirmation: {
    lines: [
      { text: 'Shall I play it?', gesture: 'attentive' },
      { text: 'Want me to continue?', gesture: 'attentive' },
      { text: 'Should I read through the list?', gesture: 'attentive' },
      { text: 'Would you like more details?', gesture: 'attentive' },
    ],
    fallback: 'Shall I continue?',
  },

  // Dismissal / Goodbye
  dismissal: {
    lines: [
      { text: 'The wizard rests. Call when you need me.', gesture: 'farewell' },
      { text: 'Until next time.', gesture: 'farewell' },
      { text: "I'll be here.", gesture: 'farewell' },
      { text: 'Farewell for now.', gesture: 'farewell' },
      { text: 'I am but a word away.', gesture: 'farewell' },
    ],
    fallback: 'Until next time.',
  },

  // Late Night Dismissal
  dismissal_late: {
    lines: [
      { text: 'The hour grows late. Sweet dreams.', gesture: 'farewell' },
      { text: 'Goodnight. May your dreams be peaceful.', gesture: 'farewell' },
      { text: 'Rest well. The wizard watches over you.', gesture: 'farewell' },
    ],
    fallback: 'Goodnight.',
  },

  // Interruption Handling
  interruption: {
    lines: [
      { text: 'Got it — what would you like instead?', gesture: 'attentive' },
      { text: 'Understood. I await your new command.', gesture: 'listening' },
      { text: 'Very well. What now?', gesture: 'attentive' },
      { text: 'Stopped. What do you seek?', gesture: 'listening' },
    ],
    fallback: 'Got it — what would you like instead?',
  },

  // Error Recovery
  error: {
    lines: [
      { text: 'Something went awry. Shall we try again?', gesture: 'confused' },
      { text: 'The magic faltered. Once more?', gesture: 'thinking' },
      { text: 'An unexpected obstacle. Let me try differently.', gesture: 'thinking' },
    ],
    fallback: 'Something went wrong. Please try again.',
  },

  // Personality Moments (Use Sparingly)
  personality: {
    lines: [
      { text: 'You ask much... but I deliver.', gesture: 'presenting', context: 'complex_request' },
      { text: 'Ah! Hidden, but not from me.', gesture: 'cheering', context: 'obscure_find' },
      { text: 'Manners. I appreciate that.', gesture: 'greeting', context: 'polite_user' },
      { text: 'You already asked me this, but very well...', gesture: 'thinking', context: 'repeat_request' },
      { text: 'A worthy challenge for a wizard.', gesture: 'conjuring', context: 'complex_request' },
    ],
    fallback: '',
  },

  // Idle Timeout
  idle_timeout: {
    lines: [
      { text: 'Still there? Or shall I rest?', gesture: 'attentive' },
      { text: 'The wizard awaits your command...', gesture: 'idle' },
      { text: 'I remain at your service.', gesture: 'idle' },
    ],
    fallback: 'Still there?',
  },
};

/**
 * Dialogue templates with placeholder replacement
 */
export function formatDialogue(
  line: DialogueLine,
  params: Record<string, string | number>
): DialogueLine {
  let text = line.text;
  for (const [key, value] of Object.entries(params)) {
    text = text.replace(`{${key}}`, String(value));
  }
  return { ...line, text };
}

/**
 * Get dismissal dialogue based on time of day
 */
export function getDismissalDialogue(): DialogueLine {
  const hour = new Date().getHours();
  if (hour >= 22 || hour < 5) {
    return getRandomDialogue('dismissal_late');
  }
  return getRandomDialogue('dismissal');
}

/**
 * Check if we should use a personality moment (10% chance)
 */
export function shouldUsePersonalityMoment(): boolean {
  return Math.random() < 0.1;
}

/**
 * Get appropriate dialogue for search results
 */
export function getSearchResultDialogue(count: number, query?: string): DialogueLine {
  if (count === 0) {
    return getRandomDialogue('nothing_found');
  }

  if (count === 1) {
    return getRandomDialogue('presenting_single');
  }

  if (query) {
    const line = getRandomDialogue('fuzzy_search');
    return formatDialogue(line, { query, count });
  }

  const line = getRandomDialogue('presenting_list');
  return formatDialogue(line, { count });
}
