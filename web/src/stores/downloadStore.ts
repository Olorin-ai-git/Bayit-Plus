import { create } from "zustand";
import { downloadsService } from "@/services/api";
import logger from "@/utils/logger";
import * as db from "@/services/downloadDb";
import {
  startDownload as engineStart,
  resumeDownload as engineResume,
  pauseDownload as enginePause,
  recordPartialProgress,
} from "@/services/downloadEngine";
import { getBlob } from "@/services/downloadDb";

const log = logger.scope("DownloadStore");

type DownloadStatus =
  | "downloading"
  | "paused"
  | "completed"
  | "failed"
  | "queued";

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
  stream_url?: string;
  bytes_downloaded?: number;
}

interface DownloadState {
  downloads: DownloadItem[];
  loading: boolean;
  error: string | null;
  offlineBlobUrls: Record<string, string>;

  fetchDownloads: () => Promise<void>;
  startDownload: (
    contentId: string,
    contentType: string,
    quality?: string,
    meta?: Partial<DownloadItem>,
  ) => Promise<void>;
  deleteDownload: (id: string) => Promise<void>;
  pauseDownload: (id: string) => Promise<void>;
  resumeDownload: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
  clearCompleted: () => Promise<void>;
  playOffline: (contentId: string) => Promise<string | null>;
  startPolling: (intervalMs: number) => void;
  stopPolling: () => void;
}

const parseSizeToMB = (sizeStr?: string): number => {
  if (!sizeStr) return 0;
  const upper = sizeStr.toUpperCase();
  if (upper.includes("GB")) return parseFloat(upper) * 1024;
  if (upper.includes("MB")) return parseFloat(upper);
  return 0;
};

let pollingInterval: ReturnType<typeof setInterval> | null = null;

export const useDownloadStore = create<DownloadState>((set, get) => ({
  downloads: [],
  loading: false,
  error: null,
  offlineBlobUrls: {},

  fetchDownloads: async () => {
    set({ loading: true, error: null });
    try {
      const items = await db.getAll<DownloadItem>();
      set({ downloads: items, loading: false });
    } catch (err) {
      log.error("Failed to load downloads from IndexedDB", err);
      set({ error: "Failed to load downloads", loading: false });
    }
  },

  startDownload: async (contentId, contentType, quality, meta) => {
    const id = contentId;
    const record: DownloadItem = {
      id,
      content_id: contentId,
      type: contentType,
      status: "downloading",
      progress: 0,
      title: meta?.title ?? contentId,
      thumbnail: meta?.thumbnail,
      stream_url: meta?.stream_url,
      ...meta,
    };

    await db.put(record);
    set((s) => ({
      downloads: [...s.downloads.filter((d) => d.id !== id), record],
    }));

    const streamUrl = meta?.stream_url;
    if (!streamUrl) {
      try {
        await downloadsService.startDownload(
          contentId,
          contentType,
          quality ?? "hd",
        );
      } catch (err) {
        log.error("Server registration failed for download", err);
      }
      return;
    }

    try {
      await engineStart(streamUrl, contentId, (bytes, total) => {
        const pct = total > 0 ? Math.round((bytes / total) * 100) : 0;
        recordPartialProgress(contentId, bytes);
        const updated = { ...record, progress: pct, bytes_downloaded: bytes };
        db.put(updated);
        set((s) => ({
          downloads: s.downloads.map((d) => (d.id === id ? updated : d)),
        }));
      });

      const sizeBytes = (await db.getBlob(contentId))?.size ?? 0;
      const sizeMB = (sizeBytes / (1024 * 1024)).toFixed(1);
      const completed: DownloadItem = {
        ...record,
        status: "completed",
        progress: 100,
        size: `${sizeMB} MB`,
      };
      await db.put(completed);
      set((s) => ({
        downloads: s.downloads.map((d) => (d.id === id ? completed : d)),
      }));
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        const paused = { ...record, status: "paused" as DownloadStatus };
        await db.put(paused);
        set((s) => ({
          downloads: s.downloads.map((d) => (d.id === id ? paused : d)),
        }));
        return;
      }
      log.error("Download failed", err);
      const failed = { ...record, status: "failed" as DownloadStatus };
      await db.put(failed);
      set((s) => ({
        downloads: s.downloads.map((d) => (d.id === id ? failed : d)),
      }));
    }
  },

  deleteDownload: async (id) => {
    try {
      const { offlineBlobUrls } = get();
      const item = get().downloads.find((d) => d.id === id);
      const cid = item?.content_id ?? id;

      if (offlineBlobUrls[cid]) {
        URL.revokeObjectURL(offlineBlobUrls[cid]);
        set((s) => {
          const next = { ...s.offlineBlobUrls };
          delete next[cid];
          return { offlineBlobUrls: next };
        });
      }

      await db.deleteById(id);
      await db.deleteBlob(cid);
      set((s) => ({ downloads: s.downloads.filter((d) => d.id !== id) }));
    } catch (err) {
      log.error("Failed to delete download", err);
    }
  },

  pauseDownload: async (id) => {
    const item = get().downloads.find((d) => d.id === id);
    if (!item) return;
    enginePause(item.content_id ?? id);
  },

  resumeDownload: async (id) => {
    const item = get().downloads.find((d) => d.id === id);
    if (!item?.stream_url) {
      try {
        await downloadsService.resumeDownload(id);
        await get().fetchDownloads();
      } catch (err) {
        log.error("Failed to resume download via server", err);
      }
      return;
    }

    const updated = { ...item, status: "downloading" as DownloadStatus };
    await db.put(updated);
    set((s) => ({
      downloads: s.downloads.map((d) => (d.id === id ? updated : d)),
    }));

    try {
      await engineResume(
        item.stream_url,
        item.content_id ?? id,
        (bytes, total) => {
          const pct = total > 0 ? Math.round((bytes / total) * 100) : 0;
          recordPartialProgress(item.content_id ?? id, bytes);
          const progress = { ...updated, progress: pct };
          db.put(progress);
          set((s) => ({
            downloads: s.downloads.map((d) => (d.id === id ? progress : d)),
          }));
        },
      );
      const sizeBytes = (await getBlob(item.content_id ?? id))?.size ?? 0;
      const sizeMB = (sizeBytes / (1024 * 1024)).toFixed(1);
      const completed: DownloadItem = {
        ...item,
        status: "completed",
        progress: 100,
        size: `${sizeMB} MB`,
      };
      await db.put(completed);
      set((s) => ({
        downloads: s.downloads.map((d) => (d.id === id ? completed : d)),
      }));
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      log.error("Resume failed", err);
      const failed = { ...updated, status: "failed" as DownloadStatus };
      await db.put(failed);
      set((s) => ({
        downloads: s.downloads.map((d) => (d.id === id ? failed : d)),
      }));
    }
  },

  clearAll: async () => {
    const { offlineBlobUrls } = get();
    Object.values(offlineBlobUrls).forEach((u) => URL.revokeObjectURL(u));
    await db.clear();
    set({ downloads: [], offlineBlobUrls: {} });
  },

  clearCompleted: async () => {
    const completed = get().downloads.filter((d) => d.status === "completed");
    await Promise.all(
      completed.map((d) => {
        db.deleteById(d.id);
        db.deleteBlob(d.content_id ?? d.id);
      }),
    );
    set((s) => ({
      downloads: s.downloads.filter((d) => d.status !== "completed"),
    }));
  },

  playOffline: async (contentId) => {
    const { offlineBlobUrls } = get();
    if (offlineBlobUrls[contentId]) return offlineBlobUrls[contentId];

    const blob = await getBlob(contentId);
    if (!blob) return null;

    const url = URL.createObjectURL(blob);
    set((s) => ({
      offlineBlobUrls: { ...s.offlineBlobUrls, [contentId]: url },
    }));
    return url;
  },

  startPolling: (intervalMs) => {
    if (pollingInterval) return;
    pollingInterval = setInterval(() => get().fetchDownloads(), intervalMs);
  },

  stopPolling: () => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }
  },
}));

export const selectActiveDownloads = (s: DownloadState) =>
  s.downloads.filter(
    (d) =>
      d.status === "downloading" ||
      d.status === "queued" ||
      d.status === "paused",
  );
export const selectCompletedDownloads = (s: DownloadState) =>
  s.downloads.filter((d) => d.status === "completed");
export const selectFailedDownloads = (s: DownloadState) =>
  s.downloads.filter((d) => d.status === "failed");
export const selectStorageUsedGB = (s: DownloadState) => {
  const totalMB = s.downloads.reduce(
    (acc, d) => acc + parseSizeToMB(d.size),
    0,
  );
  return totalMB / 1024;
};
export const selectIsDownloaded = (contentId: string) => (s: DownloadState) =>
  s.downloads.some(
    (d) =>
      (d.content_id === contentId || d.id === contentId) &&
      d.status === "completed",
  );
export const selectIsDownloading = (contentId: string) => (s: DownloadState) =>
  s.downloads.some(
    (d) =>
      (d.content_id === contentId || d.id === contentId) &&
      (d.status === "downloading" || d.status === "queued"),
  );
