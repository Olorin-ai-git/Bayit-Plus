export type TabId = 'overview' | 'ai' | 'security';

export interface UserStats {
  favorites: number;
  downloads: number;
}

export interface RecentActivity {
  id: string;
  type: 'watched' | 'favorited';
  title: string;
  timestamp: string;
}
