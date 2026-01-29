/**
 * Voice Command Utilities
 * Shared helper functions for voice command handling and display
 */

export interface VoiceCommand {
  id: string;
  transcription: string;
  commandType: string;
  action: string;
  responseText: string;
  success: boolean;
  confidence: number;
  timestamp: Date;
  executionTime: number; // ms
}

/**
 * Get color for command type badge
 * Used across mobile and web for consistent command type visualization
 */
export function getCommandTypeColor(commandType: string): string {
  const colors: Record<string, string> = {
    search: '#3B82F6',    // Blue
    play: '#10B981',      // Green
    control: '#F59E0B',   // Amber
    navigate: '#8B5CF6',  // Purple
    settings: '#6B7280',  // Gray
    chat: '#EC4899',      // Pink
    playback: '#10B981',  // Green
    scroll: '#14B8A6',    // Teal
  };
  return colors[commandType] || '#6B7280';
}

/**
 * Group commands by date (Today, Yesterday, or formatted date)
 */
export function groupCommandsByDate(commands: VoiceCommand[]): Record<string, VoiceCommand[]> {
  const grouped: Record<string, VoiceCommand[]> = {};

  commands.forEach((command) => {
    const date = new Date(command.timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let dateKey: string;

    if (isSameDay(date, today)) {
      dateKey = 'Today';
    } else if (isSameDay(date, yesterday)) {
      dateKey = 'Yesterday';
    } else {
      dateKey = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
      });
    }

    if (!grouped[dateKey]) {
      grouped[dateKey] = [];
    }
    grouped[dateKey].push(command);
  });

  return grouped;
}

/**
 * Check if two dates are on the same day
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}
