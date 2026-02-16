/**
 * VOD Interaction Player
 *
 * Wrapper component that adds avatar interaction capabilities to VOD playback.
 * Integrates:
 * - Interactive moment detection
 * - Auto-pause at moments
 * - Interaction UI overlay
 * - Avatar display
 */

import React, { useState, useRef, useCallback } from 'react';
import { useVODInteraction } from '../../hooks/useVODInteraction';
import { InteractiveMomentPrompt } from './InteractiveMomentPrompt';
import { InteractionOverlay } from './InteractionOverlay';

interface Props {
  contentId: string;
  profileId: string;
  avatarId: string;
  videoUrl: string;
  avatarComponent?: React.ReactNode;
  onInteractionComplete?: (sessionId: string) => void;
  className?: string;
}

export const VODInteractionPlayer: React.FC<Props> = ({
  contentId,
  profileId,
  avatarId,
  videoUrl,
  avatarComponent,
  onInteractionComplete,
  className = ''
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const handlePauseRequested = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.pause();
      setIsPaused(true);
    }
  }, []);

  const handleResumeRequested = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.play();
      setIsPaused(false);
    }
  }, []);

  const {
    currentMoment,
    activeSession,
    isInteracting,
    isSending,
    startInteraction,
    sendMessage,
    completeInteraction,
    skipInteraction
  } = useVODInteraction({
    contentId,
    profileId,
    avatarId,
    currentTime,
    onPauseRequested: handlePauseRequested,
    onResumeRequested: handleResumeRequested
  });

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleInteractionComplete = async () => {
    if (activeSession) {
      await completeInteraction();
      onInteractionComplete?.(activeSession.id);
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Video Player */}
      <video
        ref={videoRef}
        src={videoUrl}
        onTimeUpdate={handleTimeUpdate}
        controls
        className="w-full h-full"
      />

      {/* Interactive Moment Prompt */}
      {currentMoment && !isInteracting && (
        <InteractiveMomentPrompt
          moment={currentMoment}
          onStart={startInteraction}
          onSkip={skipInteraction}
        />
      )}

      {/* Interaction Overlay */}
      {isInteracting && activeSession && (
        <InteractionOverlay
          session={activeSession}
          onSendMessage={sendMessage}
          onComplete={handleInteractionComplete}
          isSending={isSending}
          avatarComponent={avatarComponent}
        />
      )}
    </div>
  );
};
