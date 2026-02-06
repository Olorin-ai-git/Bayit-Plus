/**
 * Text Chunking Hook
 * Splits long text into sequential chunks for mobile speech bubbles
 * Cycles through chunks with configurable delay during speaking state
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { VoiceState } from '../stores/supportStore';

const MOBILE_CHUNK_SIZE = 80;
const CHUNK_DELAY_MS = 3000;

interface UseTextChunkingOptions {
  text: string | undefined;
  isMobile: boolean;
  voiceState: VoiceState;
}

interface UseTextChunkingResult {
  displayText: string | undefined;
  textChunks: string[];
  currentChunkIndex: number;
}

export function useTextChunking({
  text,
  isMobile,
  voiceState,
}: UseTextChunkingOptions): UseTextChunkingResult {
  const [textChunks, setTextChunks] = useState<string[]>([]);
  const [currentChunkIndex, setCurrentChunkIndex] = useState(0);
  const chunkTimerRef = useRef<NodeJS.Timeout | null>(null);

  const splitTextIntoChunks = useCallback((inputText: string): string[] => {
    if (!inputText || !isMobile) return [inputText];
    if (inputText.length <= MOBILE_CHUNK_SIZE) return [inputText];

    const chunks: string[] = [];
    const words = inputText.split(' ');
    let currentChunk = '';

    for (const word of words) {
      const testChunk = currentChunk ? `${currentChunk} ${word}` : word;
      if (testChunk.length <= MOBILE_CHUNK_SIZE) {
        currentChunk = testChunk;
      } else {
        if (currentChunk) chunks.push(currentChunk);
        currentChunk = word;
      }
    }
    if (currentChunk) chunks.push(currentChunk);

    return chunks.length > 0 ? chunks : [inputText];
  }, [isMobile]);

  useEffect(() => {
    if (text && isMobile) {
      const chunks = splitTextIntoChunks(text);
      setTextChunks(chunks);
      setCurrentChunkIndex(0);

      if (chunkTimerRef.current) {
        clearInterval(chunkTimerRef.current);
        chunkTimerRef.current = null;
      }

      if (chunks.length > 1 && voiceState === 'speaking') {
        chunkTimerRef.current = setInterval(() => {
          setCurrentChunkIndex(prev => {
            const nextIndex = prev + 1;
            if (nextIndex >= chunks.length) {
              if (chunkTimerRef.current) {
                clearInterval(chunkTimerRef.current);
                chunkTimerRef.current = null;
              }
              return prev;
            }
            return nextIndex;
          });
        }, CHUNK_DELAY_MS);
      }
    } else {
      setTextChunks([]);
      setCurrentChunkIndex(0);
    }

    return () => {
      if (chunkTimerRef.current) {
        clearInterval(chunkTimerRef.current);
        chunkTimerRef.current = null;
      }
    };
  }, [text, isMobile, voiceState, splitTextIntoChunks]);

  const displayText = isMobile && textChunks.length > 0
    ? textChunks[currentChunkIndex]
    : text;

  return { displayText, textChunks, currentChunkIndex };
}

export default useTextChunking;
