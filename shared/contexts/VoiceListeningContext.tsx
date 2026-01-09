import { createContext, useContext, useState, ReactNode, useCallback, useMemo } from 'react';
import type { AudioLevel } from '@bayit/shared-utils/vadDetector';

interface VoiceListeningContextType {
  isListening: boolean;
  isAwake: boolean;
  isProcessing: boolean;
  audioLevel: AudioLevel;
  setListeningState: (state: {
    isListening?: boolean;
    isAwake?: boolean;
    isProcessing?: boolean;
    audioLevel?: AudioLevel;
  }) => void;
}

export const VoiceListeningContext = createContext<VoiceListeningContextType | undefined>(undefined);

export function VoiceListeningProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{
    isListening: boolean;
    isAwake: boolean;
    isProcessing: boolean;
    audioLevel: AudioLevel;
  }>({
    isListening: false,
    isAwake: false,
    isProcessing: false,
    audioLevel: { average: 0, peak: 0 },
  });

  // Memoize the setListeningState function to avoid recreating it on every render
  const setListeningState = useCallback((updates: Parameters<typeof setState>[0]) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  // Memoize the context value to avoid unnecessary re-renders
  const contextValue = useMemo(
    () => ({ ...state, setListeningState }),
    [state, setListeningState]
  );

  return (
    <VoiceListeningContext.Provider value={contextValue}>
      {children}
    </VoiceListeningContext.Provider>
  );
}

export function useVoiceListeningContext() {
  const context = useContext(VoiceListeningContext);
  if (!context) {
    throw new Error('useVoiceListeningContext must be used within VoiceListeningProvider');
  }
  return context;
}

export type { VoiceListeningContextType };
