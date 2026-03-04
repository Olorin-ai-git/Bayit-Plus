/**
 * Audiobook Data Hook
 * Manages audiobook details, chapters, and user interactions
 */

import { useState, useEffect, useCallback } from "react";
import { audiobookService, playlistService } from "@/services/api";
import type {
  AudiobookWithChapters,
  AudiobookChapter,
} from "@/types/audiobook";
import logger from "@/utils/logger";

interface UseAudiobookDataProps {
  audiobookId: string | undefined;
}

interface UseAudiobookDataReturn {
  audiobook: AudiobookWithChapters | null;
  chapters: AudiobookChapter[];
  selectedChapter: AudiobookChapter | null;
  loading: boolean;
  inPlaylist: boolean;
  setSelectedChapter: (chapter: AudiobookChapter | null) => void;
  togglePlaylist: () => Promise<void>;
}

export function useAudiobookData({
  audiobookId,
}: UseAudiobookDataProps): UseAudiobookDataReturn {
  const [audiobook, setAudiobook] = useState<AudiobookWithChapters | null>(
    null,
  );
  const [chapters, setChapters] = useState<AudiobookChapter[]>([]);
  const [selectedChapter, setSelectedChapter] =
    useState<AudiobookChapter | null>(null);
  const [loading, setLoading] = useState(true);
  const [inPlaylist, setInPlaylist] = useState(false);

  const loadAudiobookData = useCallback(async () => {
    if (!audiobookId) return;

    setLoading(true);
    try {
      // Fetch audiobook details and playlist status in parallel
      const [data, playlistResult] = await Promise.all([
        audiobookService.getAudiobookWithChapters(audiobookId),
        playlistService.checkItem(audiobookId).catch(() => null),
      ]);

      setAudiobook(data);
      setChapters(data.chapters || []);

      if (data.chapters && data.chapters.length > 0) {
        setSelectedChapter(data.chapters[0]);
      }

      if (playlistResult && typeof playlistResult.in_playlist === "boolean") {
        setInPlaylist(playlistResult.in_playlist);
      }
    } catch (error) {
      logger.error(
        "Failed to load audiobook details",
        "useAudiobookData",
        error,
      );
    } finally {
      setLoading(false);
    }
  }, [audiobookId]);

  const togglePlaylist = useCallback(async () => {
    if (!audiobook || !audiobook.id) {
      logger.warn(
        "Cannot toggle playlist: audiobook or audiobook.id is missing",
        "useAudiobookData",
      );
      return;
    }

    const previousState = inPlaylist;

    try {
      setInPlaylist(!inPlaylist);

      logger.info("Toggling playlist", "useAudiobookData", {
        audiobookId: audiobook.id,
        contentType: "audiobook",
        currentState: inPlaylist,
      });

      const result = await playlistService.toggleItem(
        audiobook.id,
        "audiobook",
      );

      logger.info("Playlist toggle response", "useAudiobookData", { result });

      if (result && typeof result.in_playlist === "boolean") {
        setInPlaylist(result.in_playlist);
      }
    } catch (error) {
      logger.error("Failed to toggle playlist", "useAudiobookData", error);
      setInPlaylist(previousState);
    }
  }, [audiobook, inPlaylist]);

  useEffect(() => {
    if (audiobookId) {
      loadAudiobookData();
    }
  }, [audiobookId, loadAudiobookData]);

  return {
    audiobook,
    chapters,
    selectedChapter,
    loading,
    inPlaylist,
    setSelectedChapter,
    togglePlaylist,
  };
}
