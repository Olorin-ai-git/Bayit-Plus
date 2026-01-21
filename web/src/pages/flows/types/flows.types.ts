/**
 * Flows Feature Type Definitions
 * Shared types for the Flows feature across web, TV, and tvOS platforms
 */

// Trigger Types
export type TriggerType = 'time' | 'shabbat' | 'holiday';
export type ContentType = 'live' | 'radio' | 'vod' | 'podcast';
export type FlowType = 'system' | 'custom';

// Day of week (0 = Sunday, 6 = Saturday)
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/**
 * Flow Trigger Configuration
 */
export interface FlowTrigger {
  type: TriggerType;
  start_time?: string; // HH:MM format
  end_time?: string; // HH:MM format
  days?: DayOfWeek[]; // Days when trigger is active
  skip_shabbat?: boolean; // Skip on Friday evening/Saturday
  holiday_id?: string; // For holiday triggers
  candle_lighting_offset?: number; // Minutes before candle lighting for Shabbat trigger
}

/**
 * Content Item within a Flow
 */
export interface FlowItem {
  content_id: string;
  content_type: ContentType;
  title: string;
  thumbnail?: string;
  duration_hint?: number; // Duration in seconds
  order: number;
}

/**
 * Flow Definition
 */
export interface Flow {
  id: string;
  name: string;
  name_en?: string;
  name_es?: string;
  description?: string;
  description_en?: string;
  description_es?: string;
  flow_type: FlowType;
  icon?: string;
  triggers: FlowTrigger[];
  items: FlowItem[];
  ai_enabled?: boolean;
  ai_brief_enabled?: boolean;
  auto_play?: boolean;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

/**
 * Content Item for Content Picker
 */
export interface ContentItem {
  id: string;
  title: string;
  type: ContentType;
  thumbnail?: string;
  duration?: number;
  description?: string;
  category?: string;
  isLive?: boolean;
}

/**
 * Content Filters for Content Picker
 */
export interface ContentFilters {
  type: ContentType | 'all';
  category?: string;
  search?: string;
}

/**
 * Flow Form State
 */
export interface FlowFormState {
  name: string;
  name_en: string;
  name_es: string;
  description: string;
  description_en: string;
  description_es: string;
  trigger: FlowTrigger;
  items: FlowItem[];
  auto_play: boolean;
  ai_enabled: boolean;
  ai_brief_enabled: boolean;
}

/**
 * Flow Icon Configuration
 */
export interface FlowIconConfig {
  icon: React.ReactNode;
  colors: [string, string]; // Gradient colors
  bgColor: string;
}

/**
 * Shabbat Times Response
 */
export interface ShabbatTimes {
  candle_lighting: string; // ISO datetime
  havdalah: string; // ISO datetime
  parsha?: string;
  location?: string;
}

/**
 * Trigger Calculation Result
 */
export interface TriggerCalculation {
  nextTriggerTime: Date;
  displayString: string;
  isActive: boolean;
}

/**
 * Content Picker Modal Props
 */
export interface ContentPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (items: ContentItem[]) => void;
  existingItems: FlowItem[];
  defaultType?: ContentType;
}

/**
 * Day Selector Props
 */
export interface DaySelectorProps {
  selectedDays: DayOfWeek[];
  onChange: (days: DayOfWeek[]) => void;
  disabled?: boolean;
  compact?: boolean; // For TV/mobile
}

/**
 * Trigger Config Panel Props
 */
export interface TriggerConfigPanelProps {
  trigger: FlowTrigger;
  onChange: (trigger: FlowTrigger) => void;
  disabled?: boolean;
}

/**
 * Flow Item List Props
 */
export interface FlowItemListProps {
  items: FlowItem[];
  onItemsChange: (items: FlowItem[]) => void;
  onAddContent: () => void;
  editable?: boolean;
  maxItems?: number;
}

/**
 * Flow Card Props
 */
export interface FlowCardProps {
  flow: Flow;
  isSelected?: boolean;
  onPress: () => void;
  onStart?: () => void;
  onEdit?: () => void;
  isRTL?: boolean;
}

/**
 * Active Flow Banner Props
 */
export interface ActiveFlowBannerProps {
  flow: Flow;
  onStart: () => void;
  onSkip: () => void;
  isRTL?: boolean;
}

/**
 * Flow Sidebar Props
 */
export interface FlowSidebarProps {
  selectedFlow: Flow | null;
  onCreateFlow: () => void;
  onStartFlow: (flow: Flow) => void;
  onEditFlow: (flow: Flow) => void;
  onDeleteFlow: (flow: Flow) => void;
  isRTL?: boolean;
}
