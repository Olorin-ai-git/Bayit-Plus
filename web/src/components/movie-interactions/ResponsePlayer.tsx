import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import logger from '@bayit/shared-utils/logger';
import type { ContentCharacter } from '@/stores/movieInteractionStore.types';

const responsePlayerLogger = logger.scope('ResponsePlayer');

export interface DialogueExchange {
  speaker: 'user' | 'character';
  message_text: string;
  audio_url?: string;
  animated_video_url?: string;
}

interface ResponsePlayerProps {
  character: ContentCharacter;
  exchanges: DialogueExchange[];
  isSending: boolean;
}

function CharacterVideoCircle({
  videoUrl,
  videoRef,
  onEnded,
  characterName,
}: {
  videoUrl: string;
  videoRef: React.RefObject<HTMLVideoElement>;
  onEnded: () => void;
  characterName: string;
}) {
  const [isReady, setIsReady] = useState(false);
  const [hasError, setHasError] = useState(false);

  return (
    <div className="relative w-full h-full">
      {!hasError && (
        <video
          ref={videoRef}
          src={videoUrl}
          className="w-full h-full object-cover rounded-full transition-opacity duration-300"
          style={{ opacity: isReady ? 1 : 0 }}
          onCanPlay={() => {
            setIsReady(true);
            videoRef.current?.play().catch((err) => {
              responsePlayerLogger.error('Character video play failed', { characterName, err });
              setHasError(true);
            });
          }}
          onError={() => {
            responsePlayerLogger.error('Character video load error', { videoUrl, characterName });
            setHasError(true);
            onEnded();
          }}
          onEnded={onEnded}
          playsInline
        />
      )}
      {!isReady && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
          <div className="w-6 h-6 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}

const MAX_VISIBLE = 8;

export function ResponsePlayer({ character, exchanges, isSending }: ResponsePlayerProps) {
  const { t } = useTranslation();
  const [characterVideoUrl, setCharacterVideoUrl] = useState<string | null>(null);
  const characterVideoRef = useRef<HTMLVideoElement>(null);
  const listEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const last = exchanges[exchanges.length - 1];
    if (last?.speaker === 'character' && last.animated_video_url) {
      setCharacterVideoUrl(last.animated_video_url);
    }
  }, [exchanges]);

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [exchanges.length]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-center">
        <div className="w-28 h-28 rounded-full overflow-hidden border-2 border-primary-400/40">
          {characterVideoUrl ? (
            <CharacterVideoCircle
              videoUrl={characterVideoUrl}
              videoRef={characterVideoRef}
              onEnded={() => setCharacterVideoUrl(null)}
              characterName={character.name}
            />
          ) : (
            <img
              src={character.frame_url}
              alt={character.name}
              className="w-full h-full object-cover"
            />
          )}
        </div>
      </div>

      {exchanges.length > 0 && (
        <div className="flex flex-col gap-2 max-h-64 overflow-y-auto px-1">
          {exchanges.slice(-MAX_VISIBLE).map((exchange, idx) => (
            <div
              key={`${exchange.speaker}-${idx}`}
              className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-snug ${
                exchange.speaker === 'user'
                  ? 'self-end bg-primary-600/30 text-white ml-auto'
                  : 'self-start bg-white/8 text-purple-300'
              }`}
            >
              {exchange.message_text}
            </div>
          ))}
          {isSending && (
            <div className="self-start bg-white/8 text-purple-300 px-3 py-2 rounded-2xl text-sm">
              <span className="inline-flex gap-1">
                <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
            </div>
          )}
          <div ref={listEndRef} />
        </div>
      )}

      {exchanges.length === 0 && !isSending && (
        <p className="text-center text-white/40 text-sm">
          {t('zehAni.movieInteractions.dialogue.startPrompt', { name: character.name })}
        </p>
      )}
    </div>
  );
}
