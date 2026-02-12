/**
 * Intent Detector
 * Detects user intent from voice transcripts
 */

import type { CommandIntent, VoiceAction } from './types';

interface IntentPattern {
  action: VoiceAction;
  patterns: RegExp[];
  entityExtractor?: (transcript: string) => string | undefined;
}

const INTENT_PATTERNS: IntentPattern[] = [
  {
    action: 'search',
    patterns: [
      /(?:search|find|look for|show me)\s+(.+)/i,
      /(?:where is|where's)\s+(.+)/i,
      /(?:looking for)\s+(.+)/i
    ],
    entityExtractor: (transcript) => {
      const match = transcript.match(/(?:search|find|look for|show me|where is|where's|looking for)\s+(.+)/i);
      return match?.[1]?.trim();
    }
  },
  {
    action: 'play',
    patterns: [
      /(?:play|watch|start)\s+(.+)/i,
      /(?:put on|show)\s+(.+)/i
    ],
    entityExtractor: (transcript) => {
      const match = transcript.match(/(?:play|watch|start|put on|show)\s+(.+)/i);
      return match?.[1]?.trim();
    }
  },
  {
    action: 'pause',
    patterns: [
      /^(?:pause|stop|hold|wait)$/i,
      /pause\s+(?:it|this|playback)/i
    ]
  },
  {
    action: 'stop',
    patterns: [
      /^(?:stop|end|quit|exit|close)$/i,
      /stop\s+(?:it|this|playback|playing)/i
    ]
  },
  {
    action: 'navigate',
    patterns: [
      /(?:go to|navigate to|open)\s+(.+)/i,
      /(?:show me|take me to)\s+(.+)/i,
      /^(?:home|back|menu|settings)$/i
    ],
    entityExtractor: (transcript) => {
      const match = transcript.match(/(?:go to|navigate to|open|show me|take me to)\s+(.+)/i);
      if (match) return match[1].trim();

      // Handle single-word navigation
      const singleWord = transcript.match(/^(home|back|menu|settings)$/i);
      return singleWord?.[1];
    }
  },
  {
    action: 'volume',
    patterns: [
      /(?:volume|sound)\s+(?:up|down|louder|quieter|higher|lower)/i,
      /(?:turn|make it)\s+(?:up|down|louder|quieter)/i,
      /(?:increase|decrease|raise|lower)\s+(?:volume|sound)/i
    ]
  },
  {
    action: 'settings',
    patterns: [
      /^settings$/i,
      /(?:open|show|go to)\s+settings/i,
      /(?:change|adjust|configure)\s+(.+)/i
    ]
  },
  {
    action: 'help',
    patterns: [
      /^(?:help|assist|support)$/i,
      /(?:how do i|how to|can you help)/i,
      /(?:what can you do|what are|show me)\s+(?:commands|options)/i
    ]
  }
];

/**
 * Detect intent from voice transcript
 */
export function detectIntent(transcript: string): CommandIntent {
  const normalizedTranscript = transcript.trim();

  for (const intentPattern of INTENT_PATTERNS) {
    for (const pattern of intentPattern.patterns) {
      if (pattern.test(normalizedTranscript)) {
        const entity = intentPattern.entityExtractor?.(normalizedTranscript);

        return {
          action: intentPattern.action,
          entity,
          query: normalizedTranscript
        };
      }
    }
  }

  // Default to unknown action
  return {
    action: 'unknown',
    query: normalizedTranscript
  };
}

/**
 * Extract parameters from transcript based on intent
 */
export function extractParameters(
  transcript: string,
  action: VoiceAction
): Record<string, unknown> {
  const params: Record<string, unknown> = {};

  switch (action) {
    case 'volume':
      if (/up|louder|higher|increase|raise/i.test(transcript)) {
        params.direction = 'up';
      } else if (/down|quieter|lower|decrease/i.test(transcript)) {
        params.direction = 'down';
      }

      // Extract percentage if specified
      const percentMatch = transcript.match(/(\d+)\s*(?:%|percent)/i);
      if (percentMatch) {
        params.level = parseInt(percentMatch[1], 10);
      }
      break;

    case 'search':
      // Extract content type if specified
      if (/movie/i.test(transcript)) {
        params.contentType = 'movie';
      } else if (/series|show|episode/i.test(transcript)) {
        params.contentType = 'series';
      } else if (/podcast/i.test(transcript)) {
        params.contentType = 'podcast';
      } else if (/audiobook/i.test(transcript)) {
        params.contentType = 'audiobook';
      }
      break;

    case 'navigate':
      // Already handled by entityExtractor
      break;
  }

  return params;
}
