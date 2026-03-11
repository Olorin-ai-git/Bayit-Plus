/**
 * Interaction Overlay
 *
 * Live interaction UI overlay during VOD avatar interactions.
 * Shows:
 * - User's 3D avatar (existing component)
 * - Animated character response video
 * - Message input and conversation history
 */

import React, { useState, useRef, useEffect } from "react";
import { GlassCard, GlassButton, GlassInput } from "@bayit/glass";
import {
  InteractionSession,
  DialogueExchange,
} from "../../hooks/useVODInteraction";
import logger from "@/utils/logger";

const log = logger.scope("InteractionOverlay");

interface Props {
  session: InteractionSession;
  onSendMessage: (message: string) => Promise<any>;
  onComplete: () => void;
  isSending: boolean;
  avatarComponent?: React.ReactNode;
}

export const InteractionOverlay: React.FC<Props> = ({
  session,
  onSendMessage,
  onComplete,
  isSending,
  avatarComponent,
}) => {
  const [messageInput, setMessageInput] = useState("");
  const [currentVideo, setCurrentVideo] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollToBottom();
  }, [session.dialogue_exchanges]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSend = async () => {
    if (!messageInput.trim() || isSending) return;

    const message = messageInput.trim();
    setMessageInput("");

    try {
      const response = await onSendMessage(message);

      if (response.animated_video_url) {
        setCurrentVideo(response.animated_video_url);
      }
    } catch (error) {
      log.error("Failed to send message:", error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="absolute inset-0 flex z-10 bg-black bg-opacity-70">
      {/* Left Side - Avatar and Character Video */}
      <div className="w-1/2 flex flex-col items-center justify-center p-6">
        {/* User's Avatar */}
        {avatarComponent && <div className="mb-6">{avatarComponent}</div>}

        {/* Character Animated Video */}
        {currentVideo && (
          <div className="relative w-full max-w-md">
            <GlassCard className="p-0 overflow-hidden">
              <video
                ref={videoRef}
                src={currentVideo}
                className="w-full h-auto"
                playsInline
                onCanPlay={() => {
                  videoRef.current?.play().catch((err) => {
                    log.error("Character video play failed:", err);
                    setCurrentVideo(null);
                  });
                }}
                onError={() => {
                  log.error("Character video load error:", {
                    url: currentVideo,
                  });
                  setCurrentVideo(null);
                }}
                onEnded={() => setCurrentVideo(null)}
              />
            </GlassCard>
            <div className="text-center mt-2 text-sm text-gray-300">
              {session.character_name} is speaking...
            </div>
          </div>
        )}

        {!currentVideo && (
          <div className="text-center text-gray-400">
            <div className="text-lg mb-2">
              Talking with {session.character_name}
            </div>
            <div className="text-sm">Type your message below</div>
          </div>
        )}
      </div>

      {/* Right Side - Conversation and Input */}
      <div className="w-1/2 p-6 flex flex-col">
        <GlassCard className="flex-1 flex flex-col">
          {/* Conversation History */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {session.dialogue_exchanges.map((exchange, index) => (
              <div
                key={index}
                className={`flex ${
                  exchange.speaker === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-lg ${
                    exchange.speaker === "user"
                      ? "bg-blue-500 bg-opacity-20"
                      : "bg-white bg-opacity-10"
                  }`}
                >
                  <div className="text-xs font-semibold mb-1 text-gray-300">
                    {exchange.speaker === "user"
                      ? "You"
                      : session.character_name}
                  </div>
                  <div className="text-sm">{exchange.message_text}</div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <div className="p-4 border-t border-white border-opacity-10">
            <div className="flex gap-2">
              <GlassInput
                value={messageInput}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setMessageInput(e.target.value)
                }
                onKeyPress={handleKeyPress}
                placeholder={`Ask ${session.character_name} something...`}
                disabled={isSending}
                className="flex-1"
              />
              <GlassButton
                onClick={handleSend}
                disabled={!messageInput.trim() || isSending}
                isLoading={isSending}
              >
                Send
              </GlassButton>
            </div>
          </div>

          {/* Complete Button */}
          <div className="p-4 border-t border-white border-opacity-10">
            <GlassButton
              onClick={onComplete}
              variant="secondary"
              className="w-full"
            >
              End Interaction & Continue Video
            </GlassButton>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};
