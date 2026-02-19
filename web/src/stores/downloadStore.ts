import { create } from 'zustand';
import { downloadsService } from '@/services/api';
import logger from '@/utils/logger';

const log = logger.scope('DownloadStore');

type DownloadStatus = 'downloading' | 'paused' | 'completed' | 'failed' | 'queued';

export interface DownloadItem {
  id: string;
  type: string;
  status: DownloadStatus;
  progress?: number;
  size?: string;
  title: string;
  title_en?: string;
  title_es?: string;
  subtitle?: string;
  subtitle_en?: string;
  subtitle_es?: string;
  thumbnail?: string;
  content_id?: string;
}

interface DownloadState {
  downloads: DownloadItem[];
  loading: boolean;
  error: string | null;
  pollingId: ReturnType<typeof setInterval> | null;

  fetchDownloads: () => Promise<void>;
  startDownload: (contentId: string, contentType: string, quality?: string) => Promise<void>;
  deleteDownload: (id: string) => Promise<void>;
  pauseDownload: (id: string) => Promise<void>;
  resumeDownload: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
  clearCompleted: () => Promise<void>;
  startPolling: (intervalMs: number) => void;
  stopPolling: () => void;
}

const parseSizeToMB = (sizeStr?: string): number => {
  if (!sizeStr) return 0;
  const upper = sizeStr.toUpperCase();
  if (upper.includes('GB')) return parseFloat(upper) * 1024;
  if (upper.includes('MB')) return parseFloat(upper);
  return 0;
};

export const useDownloadStore = create<DownloadState>((set, get) => ({
  downloads: [],
  loading: false,
  error: null,
  pollingId: null,

  fetchDownloads: async () => {
    set({ loading: true, error: null });
    try {
      const data = await downloadsService.getDownloads();
      set({ downloads: (data as any).items || [], loading: false });
    } catch (err) {
      log.error('Failed to fetch downloads', err);
      set({ error: 'Failed to load downloads', loading: false });
    }
  },

  startDownload: async (contentId, contentType, quality) => {
    try {
      await downloadsService.startDownload(contentId, contentType, quality);
      await get().fetchDownloads();
    } catch (err) {
      log.error('Failed to start download', err);
    }
  },

  deleteDownload: async (id) => {
    try {
      await downloadsService.deleteDownload(id);
      set((s) => ({ downloads: s.downloads.filter((d) => d.id !== id) }));
    } catch (err) {
      log.error('Failed to delete download', err);
    }
  },

  pauseDownload: async (id) => {
    try {
      await downloadsService.pauseDownload(id);
      await get().fetchDownloads();
    } catch (err) {
      log.error('Failed to pause download', err);
    }
  },

  resumeDownload: async (id) => {
    try {
      await downloadsService.resumeDownload(id);
      await get().fetchDownloads();
    } catch (err) {
      log.error('Failed to resume download', err);
    }
  },

  clearAll: async () => {
    const { downloads } = get();
    try {
      await Promise.all(downloads.map((d) => downloadsService.deleteDownload(d.id)));
      set({ downloads: [] });
    } catch (err) {
      log.error('Failed to clear all downloads', err);
    }
  },

  clearCompleted: async () => {
    const completed = get().downloads.filter((d) => d.status === 'completed');
    try {
      await Promise.all(completed.map((d) => downloadsService.deleteDownload(d.id)));
      set((s) => ({ downloads: s.downloads.filter((d) => d.status !== 'completed') }));
    } catch (err) {
      log.error('Failed to clear completed', err);
    }
  },

  startPolling: (intervalMs) => {
    const { pollingId } = get();
    if (pollingId) return;
    const id = setInterval(() => get().fetchDownloads(), intervalMs);
    set({ pollingId: id });
  },

  stopPolling: () => {
    const { pollingId } = get();
    if (pollingId) {
      clearInterval(pollingId);
      set({ pollingId: null });
    }
  },
}));

// Derived selectors
export const selectActiveDownloads = (s: DownloadState) =>
  s.downloads.filter((d) => d.status === 'downloading' || d.status === 'queued' || d.status === 'paused');
export const selectCompletedDownloads = (s: DownloadState) =>
  s.downloads.filter((d) => d.status === 'completed');
export const selectFailedDownloads = (s: DownloadState) =>
  s.downloads.filter((d) => d.status === 'failed');
export const selectStorageUsedGB = (s: DownloadState) => {
  const totalMB = s.downloads.reduce((acc, d) => acc + parseSizeToMB(d.size), 0);
  return totalMB / 1024;
};
export const selectIsDownloaded = (contentId: string) => (s: DownloadState) =>
  s.downloads.some((d) => (d.content_id === contentId || d.id === contentId) && d.status === 'completed');
export const selectIsDownloading = (contentId: string) => (s: DownloadState) =>
  s.downloads.some((d) =>
    (d.content_id === contentId || d.id === contentId) &&
    (d.status === 'downloading' || d.status === 'queued'),
  );
