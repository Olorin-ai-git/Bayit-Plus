/**
 * useSharedInteraction
 *
 * Manages shared avatar interaction sessions within a watch party context.
 * Subscribes to party WebSocket events for turn-based character dialogue.
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { useWatchPartyStore } from "@/stores/watchPartyStore";
import { useAuthStore } from "@bayit/shared-stores/authStore";
import api from "../services/api";
import logger from "@/utils/logger";
import { useSharedInteractionEvents } from "./useSharedInteractionEvents";

const log = logger.scope("useSharedInteraction");

const TURN_WARNING_THRESHOLD = parseInt(
  import.meta.env.VITE_SHARED_INTERACTION_TURN_WARNING_SECS || "10",
  10,
);

const INTERACTION_EVENT_TYPES = new Set([
  "interaction_start",
  "turn_change",
  "character_response",
  "turn_warning",
  "turn_skipped",
  "interaction_end",
]);

export interface SharedParticipant {
  user_id: string;
  user_name: string;
  avatar_url?: string;
}

export interface SharedExchange {
  speaker: "user" | "character";
  user_id?: string;
  user_name?: string;
  character_name?: string;
  message_text: string;
  audio_url?: string;
  animated_video_url?: string;
  timestamp: string;
}

export interface SharedSession {
  session_id: string;
  party_id: string;
  content_id: string;
  character_name: string;
  moment_timestamp: number;
  status: "active" | "ended";
}

interface UseSharedInteractionResult {
  session: SharedSession | null;
  participants: SharedParticipant[];
  currentTurnUserId: string | null;
  isMyTurn: boolean;
  turnCountdown: number | null;
  conversation: SharedExchange[];
  isSending: boolean;
  startSharedInteraction: (
    partyId: string,
    contentId: string,
    momentTimestamp: number,
    characterName: string,
  ) => Promise<void>;
  sendMessage: (text: string, addressedCharacter?: string) => Promise<void>;
  endSharedInteraction: () => Promise<void>;
}

export function useSharedInteraction(): UseSharedInteractionResult {
  const [session, setSession] = useState<SharedSession | null>(null);
  const [participants, setParticipants] = useState<SharedParticipant[]>([]);
  const [currentTurnUserId, setCurrentTurnUserId] = useState<string | null>(
    null,
  );
  const [turnCountdown, setTurnCountdown] = useState<number | null>(null);
  const [conversation, setConversation] = useState<SharedExchange[]>([]);
  const [isSending, setIsSending] = useState(false);

  const partyStore = useWatchPartyStore();
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  const currentUserId = useAuthStore.getState().user?.id ?? null;
  const isMyTurn =
    currentTurnUserId !== null && currentTurnUserId === currentUserId;

  const stopCountdown = useCallback(() => {
    if (countdownIntervalRef.current !== null) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setTurnCountdown(null);
  }, []);

  const startCountdown = useCallback(
    (seconds: number) => {
      stopCountdown();
      setTurnCountdown(seconds);
      let remaining = seconds;
      countdownIntervalRef.current = setInterval(() => {
        remaining -= 1;
        if (remaining <= 0) {
          stopCountdown();
        } else {
          setTurnCountdown(remaining);
        }
      }, 1000);
    },
    [stopCountdown],
  );

  const handleInteractionEvent = useSharedInteractionEvents({
    currentUserId,
    setSession,
    setParticipants,
    setCurrentTurnUserId,
    setConversation,
    setTurnCountdown,
    startCountdown,
    stopCountdown,
    turnWarningThreshold: TURN_WARNING_THRESHOLD,
  });

  useEffect(() => {
    const { ws } = partyStore;
    if (!ws) return;
    const originalOnMessage = ws.onmessage;
    ws.onmessage = (event: MessageEvent) => {
      originalOnMessage?.call(ws, event);
      try {
        const data = JSON.parse(event.data as string);
        if (INTERACTION_EVENT_TYPES.has(data.type)) {
          handleInteractionEvent(data.type, data);
        }
      } catch {
        // Non-JSON party messages handled upstream
      }
    };
    return () => {
      ws.onmessage = originalOnMessage;
    };
  }, [partyStore, handleInteractionEvent]);

  useEffect(() => () => stopCountdown(), [stopCountdown]);

  const startSharedInteraction = useCallback(
    async (
      partyId: string,
      contentId: string,
      momentTimestamp: number,
      characterName: string,
    ): Promise<void> => {
      const authState = useAuthStore.getState();
      const authStateExt = authState as typeof authState & {
        activeProfileId?: string;
        activeAvatarId?: string;
      };
      try {
        await api.post(`/parties/${partyId}/interaction/start`, {
          content_id: contentId,
          moment_timestamp: momentTimestamp,
          character_name: characterName,
          profile_id: authStateExt.activeProfileId ?? "",
          avatar_id: authStateExt.activeAvatarId ?? "",
          display_name: authState.user?.name ?? "",
        });
      } catch (err) {
        log.error("Failed to start shared interaction", err);
        throw err;
      }
    },
    [],
  );

  const sendMessage = useCallback(
    async (text: string, addressedCharacter?: string): Promise<void> => {
      if (!session || !isMyTurn) return;
      setIsSending(true);
      const authState = useAuthStore.getState();
      const userExchange: SharedExchange = {
        speaker: "user",
        user_id: currentUserId ?? undefined,
        user_name: authState.user?.name ?? undefined,
        message_text: text,
        timestamp: new Date().toISOString(),
      };
      setConversation((prev) => [...prev, userExchange]);
      try {
        await api.post(
          `/parties/${session.party_id}/interaction/${session.session_id}/message`,
          {
            message: text,
            addressed_character: addressedCharacter,
          },
        );
      } catch (err) {
        log.error("Failed to send shared interaction message", err);
        throw err;
      } finally {
        setIsSending(false);
      }
    },
    [session, isMyTurn, currentUserId],
  );

  const endSharedInteraction = useCallback(async (): Promise<void> => {
    if (!session) return;
    try {
      await api.post(
        `/parties/${session.party_id}/interaction/${session.session_id}/end`,
      );
    } catch (err) {
      log.error("Failed to end shared interaction", err);
    }
    stopCountdown();
    setSession(null);
    setCurrentTurnUserId(null);
    setConversation([]);
  }, [session, stopCountdown]);

  return {
    session,
    participants,
    currentTurnUserId,
    isMyTurn,
    turnCountdown,
    conversation,
    isSending,
    startSharedInteraction,
    sendMessage,
    endSharedInteraction,
  };
}
