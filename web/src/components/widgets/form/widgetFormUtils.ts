/**
 * Widget Form Utilities
 * Payload building and validation utilities for widget forms
 */

import type { FormState } from './useWidgetForm';

/**
 * Build widget API payload from form state
 */
export function buildWidgetPayload(formState: FormState, isAdminWidget: boolean): any {
  const payload: any = {
    title: formState.title,
    description: formState.description || null,
    icon: formState.icon || null,
    content: {
      content_type:
        formState.content_type === 'live_channel'
          ? 'live_channel'
          : formState.content_type === 'iframe'
          ? 'iframe'
          : formState.content_type,
      ...(formState.content_type === 'live_channel' && {
        live_channel_id: formState.content_id,
      }),
      ...(formState.content_type === 'podcast' && { podcast_id: formState.content_id }),
      ...(formState.content_type === 'vod' && { content_id: formState.content_id }),
      ...(formState.content_type === 'radio' && { station_id: formState.content_id }),
      ...(formState.content_type === 'iframe' && {
        iframe_url: formState.iframe_url,
        iframe_title: formState.iframe_title,
      }),
    },
    position: {
      x: formState.position_x,
      y: formState.position_y,
      width: formState.position_width,
      height: formState.position_height,
      z_index: 100,
    },
    is_muted: formState.is_muted ?? true,
    is_closable: formState.is_closable ?? true,
    is_draggable: formState.is_draggable ?? true,
  };

  if (isAdminWidget) {
    payload.visible_to_roles = formState.visible_to_roles || ['user'];
    payload.visible_to_subscription_tiers = [];
    payload.target_pages = formState.target_pages || [];
    payload.order = formState.order || 0;
  }

  return payload;
}

/**
 * Map initial data from API to form state
 */
export function mapInitialDataToFormState(initialData: any): FormState {
  return {
    title: initialData.title || '',
    description: initialData.description || '',
    icon: initialData.icon || '',
    content_type: initialData.content?.content_type || 'live_channel',
    content_id:
      initialData.content?.live_channel_id ||
      initialData.content?.podcast_id ||
      initialData.content?.content_id ||
      initialData.content?.station_id ||
      '',
    iframe_url: initialData.content?.iframe_url || '',
    iframe_title: initialData.content?.iframe_title || '',
    position_x: initialData.position?.x || 20,
    position_y: initialData.position?.y || 100,
    position_width: initialData.position?.width || 350,
    position_height: initialData.position?.height || 197,
    is_muted: initialData.is_muted ?? true,
    is_closable: initialData.is_closable ?? true,
    is_draggable: initialData.is_draggable ?? true,
    visible_to_roles: initialData.visible_to_roles || ['user'],
    target_pages: initialData.target_pages || [],
    order: initialData.order || 0,
  };
}
