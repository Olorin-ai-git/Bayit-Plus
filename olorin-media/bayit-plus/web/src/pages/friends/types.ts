export type TabId = 'friends' | 'requests' | 'search';

export type ModalType = 'error' | 'warning' | 'success' | 'info';

export interface Friend {
  user_id: string;
  name: string;
  avatar: string | null;
  friendship_id: string;
  friends_since: string;
  last_game_at: string | null;
}

export interface FriendRequest {
  id: string;
  sender_id: string;
  sender_name: string;
  sender_avatar: string | null;
  receiver_id: string;
  receiver_name: string;
  receiver_avatar: string | null;
  message: string | null;
  sent_at: string;
}

export interface SearchResult {
  user_id: string;
  name: string;
  avatar: string | null;
  friend_count?: number;
  games_played?: number;
  relationship?: 'none' | 'friend' | 'request_sent' | 'request_received';
}

export interface UserCardProps {
  userId: string;
  name: string;
  avatar: string | null;
  friendCount?: number;
  gamesPlayed?: number;
  relationship?: string;
  onAction?: () => void;
  actionLabel?: string;
  actionIcon?: any;
  actionColor?: string;
  secondaryAction?: () => void;
  secondaryLabel?: string;
  secondaryIcon?: any;
  subtitle?: string;
}
