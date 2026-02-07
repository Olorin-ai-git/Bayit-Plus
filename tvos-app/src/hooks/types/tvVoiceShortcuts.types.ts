/**
 * Types for useTVVoiceShortcuts Hook
 *
 * tvOS Siri Scene Search, Top Shelf integration,
 * and intent donation types.
 */

export interface SceneSearchResult {
  type: 'play' | 'search' | 'resume' | 'topshelf';
  contentId?: string;
  query?: string;
  channelId?: string;
  title?: string;
}

export interface TopShelfItem {
  id: string;
  title: string;
  imageUrl: string;
  description?: string;
  contentType?: 'live' | 'vod' | 'podcast';
}

export interface UseSceneSearchHandlerOptions {
  onNavigate?: (result: SceneSearchResult) => void;
  autoNavigate?: boolean;
}

export interface UseTopShelfOptions {
  autoUpdate?: boolean;
  updateIntervalMs?: number;
}

export interface UseTVVoiceShortcutsResult {
  // Intent donation
  donatePlayIntent: (contentId: string, title: string, type: string) => Promise<void>;
  donateSearchIntent: (query: string) => Promise<void>;
  donateResumeIntent: () => Promise<void>;
  donateTopShelfIntent: (widgetType: string, channelId: string, channelName: string) => Promise<void>;

  // Scene Search handling
  lastSearchResult: SceneSearchResult | null;
  handleSceneSearchLaunch: (userActivity: any) => Promise<void>;
  isProcessingSceneSearch: boolean;

  // Top Shelf management
  topShelfItems: TopShelfItem[];
  updateTopShelf: (items: TopShelfItem[]) => Promise<void>;
  isUpdatingTopShelf: boolean;

  // Cleanup
  deleteAllShortcuts: () => Promise<number>;
  getSuggestedShortcuts: () => Promise<any[]>;
}
