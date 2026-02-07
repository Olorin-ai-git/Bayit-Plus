/**
 * Constants for useVoiceFeatures Hook
 *
 * TV-specific voice command suggestions organized by language.
 */

import type { CommandSuggestion } from '../types/voiceFeatures.types';

export const TV_COMMAND_SUGGESTIONS: Record<string, CommandSuggestion[]> = {
  he: [
    {
      text: 'Open Home',
      description: 'Go to home screen',
      category: 'navigation',
    },
    {
      text: 'Search for drama',
      description: 'Search for dramas',
      category: 'search',
    },
    {
      text: 'Play Channel 13',
      description: 'Play live TV',
      category: 'playback',
    },
    {
      text: 'Open window 2',
      description: 'Open second window',
      category: 'window',
    },
    {
      text: 'Continue watching',
      description: 'Resume last video',
      category: 'playback',
    },
  ],
  en: [
    {
      text: 'Open Home',
      description: 'Go to home screen',
      category: 'navigation',
    },
    {
      text: 'Search for drama',
      description: 'Search for dramas',
      category: 'search',
    },
    {
      text: 'Play Channel 13',
      description: 'Play live TV',
      category: 'playback',
    },
    {
      text: 'Open window 2',
      description: 'Open second window',
      category: 'window',
    },
    {
      text: 'Continue watching',
      description: 'Resume last video',
      category: 'playback',
    },
  ],
  es: [
    {
      text: 'Open Home',
      description: 'Go to home screen',
      category: 'navigation',
    },
    {
      text: 'Search for drama',
      description: 'Search for dramas',
      category: 'search',
    },
    {
      text: 'Play Channel 13',
      description: 'Play live TV',
      category: 'playback',
    },
    {
      text: 'Open window 2',
      description: 'Open second window',
      category: 'window',
    },
    {
      text: 'Continue watching',
      description: 'Resume last video',
      category: 'playback',
    },
  ],
};
