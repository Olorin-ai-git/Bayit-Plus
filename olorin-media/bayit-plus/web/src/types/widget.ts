/**
 * Widget Types
 *
 * TypeScript interfaces for widget system - floating overlays
 * that display live streams or embedded content.
 */

export type WidgetType = 'system' | 'personal';

export type WidgetContentType = 'live_channel' | 'iframe' | 'podcast' | 'vod' | 'radio' | 'live' | 'custom';

export interface WidgetPosition {
  x: number;
  y: number;
  width: number;
  height: number;
  z_index: number;
}

export interface WidgetContent {
  content_type: WidgetContentType;
  live_channel_id?: string | null;
  podcast_id?: string | null;
  content_id?: string | null;
  station_id?: string | null;
  iframe_url?: string | null;
  iframe_title?: string | null;
  component_name?: string | null;  // For custom React components
}

export interface Widget {
  id: string;
  type: WidgetType;
  user_id?: string | null;
  title: string;
  description?: string | null;
  icon?: string | null;
  cover_url?: string | null;
  content: WidgetContent;
  position: WidgetPosition;
  is_active: boolean;
  is_muted: boolean;
  is_visible: boolean;
  is_minimized: boolean;
  is_closable: boolean;
  is_draggable: boolean;
  visible_to_roles: string[];
  visible_to_subscription_tiers: string[];
  target_pages: string[];
  order: number;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

// Request types

export interface WidgetCreateRequest {
  title: string;
  description?: string;
  icon?: string;
  content: WidgetContent;
  position?: Partial<WidgetPosition>;
  is_muted?: boolean;
  is_closable?: boolean;
  is_draggable?: boolean;
  visible_to_roles?: string[];
  visible_to_subscription_tiers?: string[];
  target_pages?: string[];
  order?: number;
}

export interface WidgetUpdateRequest {
  title?: string;
  description?: string | null;
  icon?: string | null;
  content?: WidgetContent;
  position?: Partial<WidgetPosition>;
  is_active?: boolean;
  is_muted?: boolean;
  is_visible?: boolean;
  is_minimized?: boolean;
  is_closable?: boolean;
  is_draggable?: boolean;
  visible_to_roles?: string[];
  visible_to_subscription_tiers?: string[];
  target_pages?: string[];
  order?: number;
}

export interface WidgetPositionUpdate {
  x: number;
  y: number;
  width?: number;
  height?: number;
}

// Response types

export interface WidgetsListResponse {
  items: Widget[];
  total: number;
  page?: number;
  page_size?: number;
  total_pages?: number;
}

// Client-side state (extends backend widget with local state)

export interface WidgetClientState {
  isMuted: boolean;
  isVisible: boolean;
  isMinimized: boolean;
  position: WidgetPosition;
}

export interface WidgetWithState extends Widget {
  clientState: WidgetClientState;
}

// Form types for admin UI

export interface WidgetFormData {
  title: string;
  description: string;
  icon: string;
  content_type: WidgetContentType;
  content_id: string;  // Unified content ID (maps to live_channel_id, podcast_id, content_id, or station_id)
  podcast_id?: string;
  station_id?: string;
  iframe_url: string;
  iframe_title: string;
  position_x: number;
  position_y: number;
  position_width: number;
  position_height: number;
  is_muted: boolean;
  is_closable: boolean;
  is_draggable: boolean;
  visible_to_roles: string[];
  visible_to_subscription_tiers: string[];
  target_pages: string[];
  order: number;
}

// Helper to convert form data to API request
export function formDataToCreateRequest(data: WidgetFormData): WidgetCreateRequest {
  return {
    title: data.title,
    description: data.description || undefined,
    icon: data.icon || undefined,
    content: {
      content_type: data.content_type,
      live_channel_id: data.content_type === 'live_channel' || data.content_type === 'live' ? data.content_id : null,
      podcast_id: data.content_type === 'podcast' ? data.content_id : null,
      content_id: data.content_type === 'vod' ? data.content_id : null,
      station_id: data.content_type === 'radio' ? data.content_id : null,
      iframe_url: data.content_type === 'iframe' ? data.iframe_url : null,
      iframe_title: data.content_type === 'iframe' ? data.iframe_title : null,
    },
    position: {
      x: data.position_x,
      y: data.position_y,
      width: data.position_width,
      height: data.position_height,
    },
    is_muted: data.is_muted,
    is_closable: data.is_closable,
    is_draggable: data.is_draggable,
    visible_to_roles: data.visible_to_roles,
    visible_to_subscription_tiers: data.visible_to_subscription_tiers,
    target_pages: data.target_pages,
    order: data.order,
  };
}

// Default position for new widgets
export const DEFAULT_WIDGET_POSITION: WidgetPosition = {
  x: 20,
  y: 100,
  width: 640,
  height: 360,
  z_index: 100,
};

// User System Widget - tracks user's subscription to a system widget
export interface UserSystemWidget {
  id: string;
  user_id: string;
  widget_id: string;
  added_at: string;
  position?: WidgetPosition;
  is_muted: boolean;
  is_visible: boolean;
  is_minimized: boolean;
  order: number;
}

// Available system widget with subscription status
export interface AvailableSystemWidget extends Widget {
  is_added: boolean;
}

// Available system widgets response
export interface AvailableSystemWidgetsResponse {
  items: AvailableSystemWidget[];
  total: number;
}

// Default form values
export const DEFAULT_WIDGET_FORM: WidgetFormData = {
  title: '',
  description: '',
  icon: '',
  content_type: 'live_channel',
  content_id: '',
  iframe_url: '',
  iframe_title: '',
  position_x: DEFAULT_WIDGET_POSITION.x,
  position_y: DEFAULT_WIDGET_POSITION.y,
  position_width: DEFAULT_WIDGET_POSITION.width,
  position_height: DEFAULT_WIDGET_POSITION.height,
  is_muted: true,
  is_closable: true,
  is_draggable: true,
  visible_to_roles: ['user'],
  visible_to_subscription_tiers: [],
  target_pages: [],
  order: 0,
};
