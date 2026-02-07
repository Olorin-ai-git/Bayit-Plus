/**
 * TVHeaderActions - Action buttons section for TV Header
 * Extracted from TVHeader.tsx for file size compliance
 */

import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { NativeIcon } from '@olorin/shared-icons/native';
import { LanguageSelector } from '@bayit/shared';
import { ProfileDropdown } from '@bayit/shared/ProfileDropdown';

interface TVHeaderActionsProps {
  isAuthenticated: boolean;
  user: any;
  isListening: boolean;
  focusedAction: string | null;
  onNavigate: (route: string) => void;
  onProfileNavigate: (path: string) => void;
  onLogout: () => void;
  onStopListening: () => void;
  onChatbotOpen?: () => void;
  onFocusAction: (action: string) => void;
  onBlurAction: () => void;
}

export const TVHeaderActions: React.FC<TVHeaderActionsProps> = ({
  isAuthenticated,
  user,
  isListening,
  focusedAction,
  onNavigate,
  onProfileNavigate,
  onLogout,
  onStopListening,
  onChatbotOpen,
  onFocusAction,
  onBlurAction,
}) => {
  const { t } = useTranslation();

  return (
    <View className="flex-row items-center gap-4">
      {/* Recordings Button */}
      <Pressable
        onPress={() => onNavigate('Recordings')}
        onFocus={() => onFocusAction('recordings')}
        onBlur={onBlurAction}
        className={`w-[60px] h-[60px] rounded-lg bg-white/5 justify-center items-center border-2 ${
          focusedAction === 'recordings' ? 'border-purple-500 bg-purple-500/30 scale-105' : 'border-transparent'
        }`}
      >
        <NativeIcon
          name="recordings"
          size="xl"
          color={focusedAction === 'recordings' ? '#ffffff' : '#a0a0a0'}
          variant={focusedAction === 'recordings' ? 'colored' : 'monochrome'}
        />
      </Pressable>

      {/* Settings Button */}
      <Pressable
        onPress={() => onNavigate('Settings')}
        onFocus={() => onFocusAction('settings')}
        onBlur={onBlurAction}
        className={`w-[60px] h-[60px] rounded-lg bg-white/5 justify-center items-center border-2 ${
          focusedAction === 'settings' ? 'border-purple-500 bg-purple-500/30 scale-105' : 'border-transparent'
        }`}
      >
        <NativeIcon
          name="settings"
          size="xl"
          color={focusedAction === 'settings' ? '#ffffff' : '#a0a0a0'}
          variant={focusedAction === 'settings' ? 'colored' : 'monochrome'}
        />
      </Pressable>

      {/* Profile/Login */}
      {isAuthenticated ? (
        <ProfileDropdown
          user={user}
          onNavigate={onProfileNavigate}
          onLogout={onLogout}
        />
      ) : (
        <Pressable
          onPress={() => onNavigate('Login')}
          onFocus={() => onFocusAction('login')}
          onBlur={onBlurAction}
          className={`px-6 py-4 rounded-lg bg-purple-500 border-2 ${
            focusedAction === 'login' ? 'border-white' : 'border-transparent'
          }`}
        >
          <Text className="text-xl font-medium text-white">{t('account.login', 'Login')}</Text>
        </Pressable>
      )}

      {/* Language Selector */}
      <LanguageSelector />

      {/* Search Button */}
      <Pressable
        onPress={() => onNavigate('Search')}
        onFocus={() => onFocusAction('search')}
        onBlur={onBlurAction}
        className={`w-[60px] h-[60px] rounded-lg bg-white/5 justify-center items-center border-2 ${
          focusedAction === 'search' ? 'border-purple-500 bg-purple-500/30 scale-105' : 'border-transparent'
        }`}
      >
        <NativeIcon
          name="search"
          size="xl"
          color={focusedAction === 'search' ? '#ffffff' : '#a0a0a0'}
          variant={focusedAction === 'search' ? 'colored' : 'monochrome'}
        />
      </Pressable>

      {/* Voice Indicator - Show when listening */}
      {isListening && (
        <Pressable className="px-3" onPress={onStopListening}>
          <NativeIcon name="podcasts" size="lg" color="#A855F7" variant="colored" />
        </Pressable>
      )}

      {/* Voice/Chatbot Button */}
      <Pressable
        onPress={onChatbotOpen}
        onFocus={() => onFocusAction('voice')}
        onBlur={onBlurAction}
        className={`w-[60px] h-[60px] rounded-lg bg-purple-500/30 border-2 border-purple-500 justify-center items-center ${
          focusedAction === 'voice' ? 'border-purple-500 bg-purple-500/30 scale-105' : ''
        }`}
      >
        <NativeIcon
          name="podcasts"
          size="xl"
          color={focusedAction === 'voice' ? '#ffffff' : '#a0a0a0'}
          variant={focusedAction === 'voice' ? 'colored' : 'monochrome'}
        />
      </Pressable>
    </View>
  );
};
