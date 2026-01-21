/**
 * Voice Command Processor
 * Converts voice transcripts to structured commands/actions
 * Handles Hebrew language processing and intent recognition
 *
 * Command Categories:
 * - Navigation: Go to specific pages/sections
 * - Search: Find content by query
 * - Playback: Control content playback (play, pause, stop)
 * - Scroll: Navigate lists and grids
 * - Control: System controls (volume, language, etc.)
 * - Chat: Natural language chat (pass to LLM)
 */

export interface VoiceAction {
  type: 'navigate' | 'search' | 'play' | 'pause' | 'scroll' | 'control' | 'chat';
  payload: Record<string, any>;
}

export interface VoiceCommandResponse {
  intent: 'NAVIGATION' | 'SEARCH' | 'PLAYBACK' | 'SCROLL' | 'CONTROL' | 'CHAT';
  action: VoiceAction;
  spokenResponse: string;
  contentIds?: string[];
  visualAction?: 'show_grid' | 'show_details' | 'highlight' | 'scroll' | 'navigate';
  confidence: number;
}

// Hebrew command patterns mapped to intents
const hebrewCommandPatterns = {
  // Navigation commands
  navigation: {
    home: ['בית', 'בעמוד הבית', 'חזור הביתה', 'עמוד ראשי'],
    liveTV: ['ערוצים בשידור חי', 'טלוויזיה בשידור', 'שידור חי', 'עבור לערוצים'],
    vod: ['סרטים', 'סדרות', 'תוכן', 'וידאו'],
    radio: ['רדיו', 'תחנות רדיו'],
    podcasts: ['פודקאסטים', 'פודקסט'],
    favorites: ['מועדפים', 'המועדפים שלי'],
    watchlist: ['רשימת הצפייה', 'לצפות מאוחר'],
    profile: ['פרופיל', 'החשבון שלי', 'הגדרות'],
  },

  // Search commands
  search: {
    action_movies: ['סרטי פעולה', 'אקשן'],
    comedy: ['קומדיה', 'סרטים מצחיקים'],
    drama: ['דרמה', 'סרטים דרמטיים'],
    documentaries: ['דוקומנטרים', 'תיעודיים'],
    kids: ['ילדים', 'תוכניות לילדים'],
    news: ['חדשות', 'אקטואליה'],
    year: ['מ-\\d{4}', 'שנת'],
    recent: ['חדש', 'לאחרונה', 'עדכני'],
  },

  // Playback commands
  playback: {
    play: ['נגן', 'הפעל', 'התחל', 'לנגן'],
    pause: ['השהה', 'עצור לרגע'],
    resume: ['המשך', 'חזור'],
    stop: ['עצור', 'סגור'],
    trailer: ['טריילר', 'טריילר הסרט'],
  },

  // Scroll commands
  scroll: {
    down: ['גלול למטה', 'למטה', 'הבא'],
    up: ['גלול למעלה', 'למעלה', 'הקודם'],
    more: ['עוד', 'הראה עוד', 'עוד תוכן'],
    next_page: ['עמוד הבא', 'הבא'],
    previous_page: ['עמוד קודם', 'הקודם'],
  },

  // Control commands
  control: {
    volume_up: ['חזק יותר', 'הגבר'],
    volume_down: ['שקט יותר', 'הנמך'],
    mute: ['השתק', 'סגור קול'],
    unmute: ['הפתח קול', 'הסר השתקה'],
    language: ['שפה', 'החלף שפה'],
    help: ['עזרה', 'איך משתמשים', 'עזר'],
  },
};

interface ConversationContext {
  currentRoute?: string;
  visibleContentIds?: string[];
  lastMentionedContentIds?: string[];
  previousCommands?: VoiceCommandResponse[];
  lastSearchQuery?: string;
}

export class VoiceCommandProcessor {
  private context: ConversationContext = {
    previousCommands: [],
  };

  /**
   * Update conversation context for smarter command interpretation
   */
  updateContext(updates: Partial<ConversationContext>): void {
    this.context = { ...this.context, ...updates };
  }

  /**
   * Get current context
   */
  getContext(): ConversationContext {
    return this.context;
  }

  /**
   * Process voice input and return structured command
   * Falls back to CHAT intent for ambiguous/natural language
   */
  processVoiceInput(transcript: string): VoiceCommandResponse {
    if (!transcript || !transcript.trim()) {
      return this.createChatResponse(transcript, 0);
    }

    const cleanedTranscript = transcript.toLowerCase().trim();
    let intent: VoiceCommandResponse['intent'] = 'CHAT';
    let confidence = 0;

    // Try to match against command patterns (order matters - more specific first)
    const navigationMatch = this.matchCommandCategory(cleanedTranscript, 'navigation');
    if (navigationMatch) {
      return this.createNavigationResponse(navigationMatch, cleanedTranscript);
    }

    const searchMatch = this.matchCommandCategory(cleanedTranscript, 'search');
    if (searchMatch) {
      return this.createSearchResponse(searchMatch, cleanedTranscript);
    }

    const playbackMatch = this.matchCommandCategory(cleanedTranscript, 'playback');
    if (playbackMatch) {
      return this.createPlaybackResponse(playbackMatch, cleanedTranscript);
    }

    const scrollMatch = this.matchCommandCategory(cleanedTranscript, 'scroll');
    if (scrollMatch) {
      return this.createScrollResponse(scrollMatch, cleanedTranscript);
    }

    const controlMatch = this.matchCommandCategory(cleanedTranscript, 'control');
    if (controlMatch) {
      return this.createControlResponse(controlMatch, cleanedTranscript);
    }

    // Default to chat/natural language processing
    return this.createChatResponse(cleanedTranscript, 0.5);
  }

  /**
   * Match transcript against command patterns in a category
   */
  private matchCommandCategory(
    transcript: string,
    category: keyof typeof hebrewCommandPatterns
  ): string | null {
    const patterns = hebrewCommandPatterns[category];

    for (const [command, keywords] of Object.entries(patterns)) {
      for (const keyword of keywords) {
        // Try exact match first
        if (transcript.includes(keyword)) {
          return command;
        }
      }
    }

    return null;
  }

  private createNavigationResponse(
    command: string,
    transcript: string
  ): VoiceCommandResponse {
    const navigationMap: Record<string, { path: string; spoken: string }> = {
      home: { path: '/', spoken: 'עובר לעמוד הבית' },
      liveTV: { path: '/live', spoken: 'עובר לטלוויזיה בשידור חי' },
      vod: { path: '/vod', spoken: 'עובר לסרטים וסדרות' },
      radio: { path: '/radio', spoken: 'עובר לרדיו' },
      podcasts: { path: '/podcasts', spoken: 'עובר לפודקאסטים' },
      favorites: { path: '/favorites', spoken: 'עובר למועדפים' },
      watchlist: { path: '/watchlist', spoken: 'עובר לרשימת הצפייה' },
      profile: { path: '/profile', spoken: 'עובר לפרופיל' },
    };

    const navInfo = navigationMap[command];

    return {
      intent: 'NAVIGATION',
      action: {
        type: 'navigate',
        payload: { path: navInfo.path },
      },
      spokenResponse: navInfo.spoken,
      visualAction: 'navigate',
      confidence: 0.95,
    };
  }

  private createSearchResponse(
    command: string,
    transcript: string
  ): VoiceCommandResponse {
    // Extract search query - use the entire transcript as fallback
    const query = transcript;

    return {
      intent: 'SEARCH',
      action: {
        type: 'search',
        payload: { query, category: command },
      },
      spokenResponse: `מחפש ${query}`,
      visualAction: 'show_grid',
      confidence: 0.8,
    };
  }

  private createPlaybackResponse(
    command: string,
    transcript: string
  ): VoiceCommandResponse {
    const playbackMap: Record<string, { type: string; spoken: string }> = {
      play: { type: 'play', spoken: 'מפעיל הנגן' },
      pause: { type: 'pause', spoken: 'משהה' },
      resume: { type: 'play', spoken: 'ממשיך' },
      stop: { type: 'stop', spoken: 'עוצר' },
      trailer: { type: 'play_trailer', spoken: 'מפעיל טריילר' },
    };

    const playInfo = playbackMap[command];

    return {
      intent: 'PLAYBACK',
      action: {
        type: 'play',
        payload: { action: playInfo.type },
      },
      spokenResponse: playInfo.spoken,
      confidence: 0.9,
    };
  }

  private createScrollResponse(
    command: string,
    transcript: string
  ): VoiceCommandResponse {
    const scrollMap: Record<string, { direction: string; spoken: string }> = {
      down: { direction: 'down', spoken: 'גולל למטה' },
      up: { direction: 'up', spoken: 'גולל למעלה' },
      more: { direction: 'down', spoken: 'מציג עוד תוכן' },
      next_page: { direction: 'down', spoken: 'עמוד הבא' },
      previous_page: { direction: 'up', spoken: 'עמוד קודם' },
    };

    const scrollInfo = scrollMap[command];

    return {
      intent: 'SCROLL',
      action: {
        type: 'scroll',
        payload: { direction: scrollInfo.direction },
      },
      spokenResponse: scrollInfo.spoken,
      visualAction: 'scroll',
      confidence: 0.85,
    };
  }

  private createControlResponse(
    command: string,
    transcript: string
  ): VoiceCommandResponse {
    const controlMap: Record<string, { control: string; spoken: string }> = {
      volume_up: { control: 'volume_up', spoken: 'הגברת הקול' },
      volume_down: { control: 'volume_down', spoken: 'הנמכת הקול' },
      mute: { control: 'mute', spoken: 'השתקת הקול' },
      unmute: { control: 'unmute', spoken: 'ביטול השתקה' },
      language: { control: 'toggle_language', spoken: 'החלפת שפה' },
      help: { control: 'show_help', spoken: 'מציג עזרה' },
    };

    const controlInfo = controlMap[command];

    return {
      intent: 'CONTROL',
      action: {
        type: 'control',
        payload: { control: controlInfo.control },
      },
      spokenResponse: controlInfo.spoken,
      confidence: 0.9,
    };
  }

  private createChatResponse(transcript: string, confidence: number): VoiceCommandResponse {
    return {
      intent: 'CHAT',
      action: {
        type: 'chat',
        payload: { message: transcript },
      },
      spokenResponse: '', // Will be filled by Claude API
      confidence,
    };
  }
}

// Export singleton instance
export const voiceCommandProcessor = new VoiceCommandProcessor();

export default voiceCommandProcessor;
