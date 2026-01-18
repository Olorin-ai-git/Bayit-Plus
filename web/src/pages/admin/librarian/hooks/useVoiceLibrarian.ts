import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { executeVoiceCommand } from '@/services/librarianService';
import logger from '@/utils/logger';

interface UseVoiceLibrarianProps {
  loadData: () => Promise<void>;
  setSuccessMessage: (message: string) => void;
  setSuccessModalOpen: (open: boolean) => void;
  setErrorMessage: (message: string) => void;
  setErrorModalOpen: (open: boolean) => void;
}

export const useVoiceLibrarian = ({
  loadData,
  setSuccessMessage,
  setSuccessModalOpen,
  setErrorMessage,
  setErrorModalOpen,
}: UseVoiceLibrarianProps) => {
  const { t } = useTranslation();
  const [voiceProcessing, setVoiceProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isVoiceMuted, setIsVoiceMuted] = useState(false);

  const speak = useCallback((text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);

    const langMap: Record<string, string> = {
      he: 'he-IL',
      en: 'en-US',
      es: 'es-ES',
    };
    utterance.lang = langMap[t('common.language') as string] || 'en-US';

    utterance.onstart = () => {
      setIsSpeaking(true);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
    };

    window.speechSynthesis.speak(utterance);
  }, [t]);

  const handleVoiceCommand = useCallback(async (command: string) => {
    logger.info('[VoiceLibrarian] Executing command:', command);
    setVoiceProcessing(true);

    try {
      const response = await executeVoiceCommand(command);
      logger.info('[VoiceLibrarian] Command executed successfully:', response);

      if (!isVoiceMuted && response.spoken_response) {
        speak(response.spoken_response);
      }

      setSuccessMessage(response.message);
      setSuccessModalOpen(true);

      if (response.audit_id) {
        await loadData();
      }
    } catch (error) {
      logger.error('[VoiceLibrarian] Command failed:', error);
      setErrorMessage(t('admin.librarian.voice.commandFailed'));
      setErrorModalOpen(true);
    } finally {
      setVoiceProcessing(false);
    }
  }, [isVoiceMuted, speak, loadData, setSuccessMessage, setSuccessModalOpen, setErrorMessage, setErrorModalOpen, t]);

  const toggleVoiceMute = useCallback(() => {
    setIsVoiceMuted(prev => !prev);
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, [isSpeaking]);

  return {
    voiceProcessing,
    isSpeaking,
    isVoiceMuted,
    handleVoiceCommand,
    toggleVoiceMute,
  };
};
