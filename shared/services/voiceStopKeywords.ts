/**
 * Voice Stop Keywords
 * Multi-language stop keywords that end voice conversations
 * Supports English, Hebrew, and Spanish
 */

export const STOP_KEYWORDS = [
  // English
  'done', 'stop', 'exit', 'quit', 'goodbye', 'bye',
  'that\'s all', 'thank you', 'thanks', 'close', 'end',
  // Hebrew
  '\u05E1\u05D9\u05D9\u05DE\u05EA\u05D9',  // finished
  '\u05E2\u05E6\u05D5\u05E8',                // stop
  '\u05D9\u05E6\u05D9\u05D0\u05D4',          // exit
  '\u05DC\u05D4\u05EA\u05E8\u05D0\u05D5\u05EA', // goodbye
  '\u05D1\u05D9\u05D9',                       // bye
  '\u05E1\u05D5\u05E3',                       // end
  '\u05D7\u05DC\u05D0\u05E1',                 // enough
  '\u05DE\u05E1\u05E4\u05D9\u05E7',           // enough (formal)
  // Spanish
  'terminar', 'parar', 'salir', 'adi\u00F3s',
];

export function containsStopKeyword(transcript: string): boolean {
  const lowercaseTranscript = transcript.toLowerCase().trim();
  return STOP_KEYWORDS.some(keyword =>
    lowercaseTranscript === keyword ||
    lowercaseTranscript.endsWith(keyword) ||
    lowercaseTranscript.startsWith(keyword)
  );
}
