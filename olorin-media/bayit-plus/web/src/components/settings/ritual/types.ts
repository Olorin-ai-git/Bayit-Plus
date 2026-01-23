/**
 * Ritual Settings Types
 * Type definitions and Zod schemas for ritual settings
 */

import { z } from 'zod';

// Content type options
export const ContentTypeSchema = z.enum(['news', 'radio', 'vod']);
export type ContentType = z.infer<typeof ContentTypeSchema>;

// Ritual preferences schema
export const RitualPreferencesSchema = z.object({
  morning_ritual_enabled: z.boolean(),
  morning_ritual_start: z.number().min(5).max(12),
  morning_ritual_end: z.number().min(6).max(14),
  morning_ritual_content: z.array(ContentTypeSchema),
  morning_ritual_auto_play: z.boolean(),
  morning_ritual_skip_weekends: z.boolean(),
});

export type RitualPreferences = z.infer<typeof RitualPreferencesSchema>;

// Component prop types
export interface ToggleProps {
  value: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

export interface RitualHeaderProps {
  isRTL?: boolean;
}

export interface EnableToggleCardProps {
  enabled: boolean;
  onToggle: () => void;
  isRTL?: boolean;
}

export interface TimeRangeSectionProps {
  startTime: number;
  endTime: number;
  enabled: boolean;
  onStartChange: (value: number) => void;
  onEndChange: (value: number) => void;
  isRTL?: boolean;
}

export interface ContentTypesSectionProps {
  selectedContent: ContentType[];
  enabled: boolean;
  onToggle: (contentType: ContentType) => void;
  isRTL?: boolean;
}

export interface OptionsSectionProps {
  autoPlay: boolean;
  skipWeekends: boolean;
  enabled: boolean;
  onAutoPlayToggle: () => void;
  onSkipWeekendsToggle: () => void;
  isRTL?: boolean;
}

export interface SaveButtonProps {
  onSave: () => void;
  saving: boolean;
  saved: boolean;
  isRTL?: boolean;
}

export interface ContentOption {
  id: ContentType;
  label: string;
  icon: string;
}
