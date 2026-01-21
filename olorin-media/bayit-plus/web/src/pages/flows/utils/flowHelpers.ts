/**
 * Flow Helper Utilities
 * Common utility functions for the Flows feature
 */

import type {
  Flow,
  FlowTrigger,
  FlowItem,
  ContentItem,
  DayOfWeek,
  FlowIconConfig,
  FlowFormState,
} from '../types/flows.types';

// Day names for i18n keys
export const DAY_KEYS: Record<DayOfWeek, string> = {
  0: 'flows.days.sunday',
  1: 'flows.days.monday',
  2: 'flows.days.tuesday',
  3: 'flows.days.wednesday',
  4: 'flows.days.thursday',
  5: 'flows.days.friday',
  6: 'flows.days.saturday',
};

// All days array
export const ALL_DAYS: DayOfWeek[] = [0, 1, 2, 3, 4, 5, 6];

// Weekdays only
export const WEEKDAYS: DayOfWeek[] = [0, 1, 2, 3, 4];

/**
 * Get localized name for a flow based on current language
 */
export const getLocalizedName = (
  flow: Flow,
  language: string
): string => {
  if (language === 'en' && flow.name_en) return flow.name_en;
  if (language === 'es' && flow.name_es) return flow.name_es;
  return flow.name;
};

/**
 * Get localized description for a flow based on current language
 */
export const getLocalizedDescription = (
  flow: Flow,
  language: string
): string | undefined => {
  if (language === 'en' && flow.description_en) return flow.description_en;
  if (language === 'es' && flow.description_es) return flow.description_es;
  return flow.description;
};

/**
 * Format trigger time for display (e.g., "07:00 - 09:00")
 */
export const formatTriggerTime = (
  trigger: FlowTrigger,
  t: (key: string) => string
): string => {
  if (trigger.type === 'shabbat') {
    return t('flows.trigger.shabbat');
  }
  if (trigger.type === 'holiday') {
    return t('flows.trigger.holiday');
  }
  if (trigger.start_time && trigger.end_time) {
    return `${trigger.start_time} - ${trigger.end_time}`;
  }
  return t('flows.manual');
};

/**
 * Format days array for display
 */
export const formatDays = (
  days: DayOfWeek[],
  t: (key: string) => string
): string => {
  if (!days || days.length === 0) return t('flows.days.selectAll');
  if (days.length === 7) return t('flows.days.everyday');

  // Check for weekdays only
  const isWeekdays = days.length === 5 &&
    [0, 1, 2, 3, 4].every(d => days.includes(d as DayOfWeek));
  if (isWeekdays) return t('flows.days.weekdays');

  // Check for weekends only
  const isWeekends = days.length === 2 &&
    days.includes(5) && days.includes(6);
  if (isWeekends) return t('flows.days.weekends');

  // List specific days
  return days
    .sort((a, b) => a - b)
    .map(day => t(DAY_KEYS[day]).substring(0, 3))
    .join(', ');
};

/**
 * Check if a flow is currently active based on trigger
 */
export const isFlowActive = (flow: Flow): boolean => {
  if (!flow.triggers || flow.triggers.length === 0) return false;

  const trigger = flow.triggers[0];
  const now = new Date();
  const currentDay = now.getDay() as DayOfWeek;
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  // Check if current day is in trigger days
  if (trigger.days && !trigger.days.includes(currentDay)) {
    return false;
  }

  // Check if current time is within range
  if (trigger.start_time && trigger.end_time) {
    return currentTime >= trigger.start_time && currentTime <= trigger.end_time;
  }

  return false;
};

/**
 * Convert ContentItem to FlowItem
 */
export const contentItemToFlowItem = (
  item: ContentItem,
  order: number
): FlowItem => ({
  content_id: item.id,
  content_type: item.type,
  title: item.title,
  thumbnail: item.thumbnail,
  duration_hint: item.duration,
  order,
});

/**
 * Create empty flow form state
 */
export const createEmptyFormState = (): FlowFormState => ({
  name: '',
  name_en: '',
  name_es: '',
  description: '',
  description_en: '',
  description_es: '',
  trigger: {
    type: 'time',
    start_time: '08:00',
    end_time: '10:00',
    days: ALL_DAYS,
    skip_shabbat: false,
  },
  items: [],
  auto_play: false,
  ai_enabled: false,
  ai_brief_enabled: false,
});

/**
 * Create form state from existing flow
 */
export const flowToFormState = (flow: Flow): FlowFormState => ({
  name: flow.name,
  name_en: flow.name_en || '',
  name_es: flow.name_es || '',
  description: flow.description || '',
  description_en: flow.description_en || '',
  description_es: flow.description_es || '',
  trigger: flow.triggers[0] || createEmptyFormState().trigger,
  items: [...flow.items],
  auto_play: flow.auto_play || false,
  ai_enabled: flow.ai_enabled || false,
  ai_brief_enabled: flow.ai_brief_enabled || false,
});

/**
 * Convert form state to API payload
 */
export const formStateToPayload = (state: FlowFormState) => ({
  name: state.name,
  name_en: state.name_en || undefined,
  name_es: state.name_es || undefined,
  description: state.description || undefined,
  description_en: state.description_en || undefined,
  description_es: state.description_es || undefined,
  triggers: [state.trigger],
  items: state.items,
  auto_play: state.auto_play,
  ai_enabled: state.ai_enabled,
  ai_brief_enabled: state.ai_brief_enabled,
});

/**
 * Validate flow form state
 */
export const validateFlowForm = (
  state: FlowFormState,
  t: (key: string) => string
): string[] => {
  const errors: string[] = [];

  if (!state.name.trim()) {
    errors.push(t('flows.validation.nameRequired'));
  }

  if (state.trigger.type === 'time') {
    if (!state.trigger.start_time) {
      errors.push(t('flows.validation.startTimeRequired'));
    }
    if (!state.trigger.end_time) {
      errors.push(t('flows.validation.endTimeRequired'));
    }
    if (state.trigger.start_time && state.trigger.end_time) {
      if (state.trigger.start_time >= state.trigger.end_time) {
        errors.push(t('flows.validation.timeRange'));
      }
    }
    if (!state.trigger.days || state.trigger.days.length === 0) {
      errors.push(t('flows.validation.daysRequired'));
    }
  }

  if (state.items.length === 0 && !state.ai_enabled) {
    errors.push(t('flows.validation.contentRequired'));
  }

  return errors;
};

/**
 * Get content type icon name
 */
export const getContentTypeIcon = (type: string): string => {
  const icons: Record<string, string> = {
    live: 'radio',
    radio: 'headphones',
    vod: 'film',
    podcast: 'mic',
  };
  return icons[type] || 'play';
};

/**
 * Get content type label key
 */
export const getContentTypeLabelKey = (type: string): string => {
  return `flows.contentPicker.tabs.${type}`;
};

/**
 * Format duration in minutes/hours
 */
export const formatDuration = (seconds?: number): string => {
  if (!seconds) return '';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};

/**
 * Check if item already exists in flow
 */
export const isItemInFlow = (
  contentId: string,
  items: FlowItem[]
): boolean => {
  return items.some(item => item.content_id === contentId);
};
