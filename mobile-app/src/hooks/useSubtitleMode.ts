/**
 * useSubtitleMode - Manages subtitle display mode state
 *
 * Tracks which subtitle mode is active (standard, AI, split, interactive),
 * selected primary and secondary languages, and AI subtitle availability.
 */

import { useState, useCallback } from 'react';
import { subtitlesService, subtitlePreferencesService } from '@bayit/shared-services/api';
import { logger } from '../utils/logger';

const log = logger.scope('useSubtitleMode');

export type SubtitleMode = 'standard' | 'ai' | 'split' | 'interactive';

export interface AvailableLanguage {
  code: string;
  name: string;
  nativeName: string;
}

export interface UseSubtitleModeState {
  mode: SubtitleMode;
  primaryLanguage: string;
  secondaryLanguage: string;
  availableLanguages: AvailableLanguage[];
  aiAvailable: boolean;
  isLoading: boolean;
  error: string | null;
}

export function useSubtitleMode(contentId: string) {
  const [state, setState] = useState<UseSubtitleModeState>({
    mode: 'standard',
    primaryLanguage: 'he',
    secondaryLanguage: 'en',
    availableLanguages: [],
    aiAvailable: false,
    isLoading: false,
    error: null,
  });

  const setMode = useCallback((mode: SubtitleMode) => {
    setState((prev) => ({ ...prev, mode }));
    log.info('Subtitle mode changed', { contentId, mode });
  }, [contentId]);

  const setPrimaryLanguage = useCallback(async (lang: string) => {
    setState((prev) => ({ ...prev, primaryLanguage: lang }));
    try {
      await subtitlePreferencesService.setPreference(contentId, lang);
      log.info('Primary subtitle language set', { contentId, lang });
    } catch (err) {
      log.error('Failed to save subtitle preference', { contentId, lang, error: err });
    }
  }, [contentId]);

  const setSecondaryLanguage = useCallback((lang: string) => {
    setState((prev) => ({ ...prev, secondaryLanguage: lang }));
    log.info('Secondary subtitle language set', { contentId, lang });
  }, [contentId]);

  const loadAvailableLanguages = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const [languages, tracks] = await Promise.all([
        subtitlesService.getLanguages(),
        subtitlesService.getTracks(contentId),
      ]);
      const available: AvailableLanguage[] = (languages.languages || []).map(
        (l: any) => ({
          code: l.code,
          name: l.name,
          nativeName: l.native_name || l.name,
        }),
      );
      const hasAI = (tracks.tracks || []).some(
        (t: any) => t.source === 'ai' || t.ai_generated,
      );
      setState((prev) => ({
        ...prev,
        availableLanguages: available,
        aiAvailable: hasAI,
        isLoading: false,
      }));
      log.info('Subtitle languages loaded', {
        contentId,
        count: available.length,
        aiAvailable: hasAI,
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load languages';
      setState((prev) => ({ ...prev, isLoading: false, error: errorMsg }));
      log.error('Failed to load subtitle languages', { contentId, error: err });
    }
  }, [contentId]);

  const loadSavedPreference = useCallback(async () => {
    try {
      const pref = await subtitlePreferencesService.getPreference(contentId);
      if (pref?.language) {
        setState((prev) => ({ ...prev, primaryLanguage: pref.language }));
      }
    } catch {
      // No saved preference is acceptable
    }
  }, [contentId]);

  return {
    ...state,
    setMode,
    setPrimaryLanguage,
    setSecondaryLanguage,
    loadAvailableLanguages,
    loadSavedPreference,
  };
}

export type UseSubtitleModeReturn = ReturnType<typeof useSubtitleMode>;
