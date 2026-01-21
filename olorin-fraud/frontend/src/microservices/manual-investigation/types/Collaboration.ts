import { User } from '@/types/User';

export interface CollaborationAttachment {
  id: string;
  filename: string;
  file_type: string;
  file_size: number;
  download_url: string;
  thumbnail_url?: string;
  created_at: string;
}

export interface CollaborationMention {
  user_id: string;
  user: User;
  position: number;
  length: number;
}

export interface CollaborationReaction {
  id: string;
  user_id: string;
  user: User;
  emoji: string;
  created_at: string;
}

export interface CollaborationThread {
  id: string;
  investigation_id: string;
  parent_comment_id?: string;
  root_comment_id?: string;

  // Thread metadata
  title?: string;
  is_resolved: boolean;
  resolved_by?: string;
  resolved_at?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';

  // Participants
  participants: Array<{
    user_id: string;
    user: User;
    role: 'creator' | 'participant' | 'observer';
    joined_at: string;
    last_read_at?: string;
  }>;

  // Metadata
  created_at: string;
  updated_at: string;
  tags: string[];
}

export interface Collaboration {
  id: string;
  investigation_id: string;
  thread_id?: string;
  parent_id?: string;

  // Content
  message: string;
  message_type: 'text' | 'system' | 'status_update' | 'mention' | 'file_share';

  // Author information
  user_id: string;
  user: User;

  // Rich content
  attachments: CollaborationAttachment[];
  mentions: CollaborationMention[];
  reactions: CollaborationReaction[];

  // Message status
  is_edited: boolean;
  edited_at?: string;
  is_deleted: boolean;
  deleted_at?: string;
  delete_reason?: string;

  // Visibility and permissions
  visibility: 'public' | 'team' | 'private' | 'system';
  can_edit: boolean;
  can_delete: boolean;

  // Threading
  reply_count: number;
  last_reply_at?: string;

  // Metadata
  created_at: string;
  updated_at: string;

  // System-generated content
  system_data?: {
    event_type: 'step_completed' | 'status_changed' | 'user_assigned' | 'priority_updated' | 'investigation_created';
    event_data: Record<string, any>;
    auto_generated: boolean;
  };
}

export interface CollaborationNotification {
  id: string;
  user_id: string;
  collaboration_id: string;
  investigation_id: string;

  // Notification details
  type: 'mention' | 'reply' | 'thread_update' | 'file_shared' | 'status_change';
  title: string;
  message: string;

  // Status
  is_read: boolean;
  read_at?: string;
  is_actionable: boolean;
  action_url?: string;

  // Metadata
  created_at: string;
  expires_at?: string;
}

export interface CollaborationActivity {
  id: string;
  investigation_id: string;
  user_id: string;
  user: User;

  // Activity details
  action: 'comment_added' | 'comment_edited' | 'comment_deleted' | 'thread_created' |
          'thread_resolved' | 'file_uploaded' | 'mention_added' | 'reaction_added';
  target_type: 'comment' | 'thread' | 'investigation' | 'attachment';
  target_id: string;

  // Activity metadata
  description: string;
  changes?: Record<string, { old_value: any; new_value: any; }>;

  // Context
  ip_address?: string;
  user_agent?: string;
  session_id?: string;

  // Timestamp
  created_at: string;
}

export interface CollaborationSettings {
  investigation_id: string;
  user_id: string;

  // Notification preferences
  email_notifications: boolean;
  push_notifications: boolean;
  mention_notifications: boolean;
  thread_notifications: boolean;

  // Display preferences
  show_system_messages: boolean;
  auto_mark_read: boolean;
  thread_grouping: boolean;

  // Privacy settings
  allow_mentions: boolean;
  visible_to_team: boolean;

  // Metadata
  created_at: string;
  updated_at: string;
}

export interface CreateCollaborationRequest {
  investigation_id: string;
  thread_id?: string;
  parent_id?: string;
  message: string;
  message_type?: Collaboration['message_type'];
  visibility?: Collaboration['visibility'];
  attachments?: Array<{
    filename: string;
    file_data: string;
    file_type: string;
  }>;
  mentions?: Array<{
    user_id: string;
    position: number;
    length: number;
  }>;
}

export interface UpdateCollaborationRequest {
  message?: string;
  visibility?: Collaboration['visibility'];
  attachments?: Array<{
    id?: string;
    filename: string;
    file_data: string;
    file_type: string;
  }>;
}

export interface CreateThreadRequest {
  investigation_id: string;
  title?: string;
  priority?: CollaborationThread['priority'];
  initial_message: string;
  participants?: string[];
  tags?: string[];
}

export interface UpdateThreadRequest {
  title?: string;
  priority?: CollaborationThread['priority'];
  is_resolved?: boolean;
  participants?: Array<{
    user_id: string;
    role: 'creator' | 'participant' | 'observer';
  }>;
  tags?: string[];
}

export interface AddReactionRequest {
  collaboration_id: string;
  emoji: string;
}

export interface CollaborationListResponse {
  collaborations: Collaboration[];
  threads: CollaborationThread[];
  total: number;
  page: number;
  per_page: number;
  has_next: boolean;
  has_prev: boolean;
  unread_count: number;
}

export interface CollaborationStatsResponse {
  total_comments: number;
  active_threads: number;
  total_participants: number;
  comments_today: number;
  most_active_users: Array<{
    user: User;
    comment_count: number;
    last_activity: string;
  }>;
  by_type: Record<Collaboration['message_type'], number>;
  activity_timeline: Array<{
    date: string;
    comment_count: number;
    thread_count: number;
  }>;
}

export interface NotificationListResponse {
  notifications: CollaborationNotification[];
  total: number;
  unread_count: number;
  page: number;
  per_page: number;
  has_next: boolean;
  has_prev: boolean;
}