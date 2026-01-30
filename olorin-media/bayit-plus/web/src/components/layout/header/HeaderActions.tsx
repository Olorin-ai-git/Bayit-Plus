/**
 * HeaderActions Component
 *
 * Action buttons and controls on right side of header
 * Part of Header migration from StyleSheet to TailwindCSS
 *
 * Features:
 * - Admin button (conditional)
 * - Profile dropdown or Login button
 * - Language selector
 * - Search button
 * - Voice components (soundwave, voice search)
 * - Mobile menu toggle
 * - Touch targets meet accessibility standards (44x44pt/48x48dp)
 */

import { View, Text, Pressable } from 'react-native';
import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Menu, X, Shield } from 'lucide-react';
import { z } from 'zod';
import {
  VoiceSearchButton,
  LanguageSelector,
  SoundwaveVisualizer,
} from '@bayit/shared';
import { ProfileDropdown } from '@bayit/shared/ProfileDropdown';
import { platformClass } from '../../../utils/platformClass';
import { BetaCreditBalance } from '../../beta/BetaCreditBalance';

// Check if this is a TV build
declare const __TV__: boolean;
const IS_TV_BUILD = typeof __TV__ !== 'undefined' && __TV__;

// Zod schema for user
const UserSchema = z.object({
  id: z.string(),
  email: z.string().optional(),
  name: z.string().optional(),
}).passthrough();

const HeaderActionsPropsSchema = z.object({
  showAdmin: z.boolean(),
  isAuthenticated: z.boolean(),
  user: UserSchema.nullable().optional(),
  isMobile: z.boolean(),
  showSoundwave: z.boolean().optional(),
  audioLevel: z.number().optional(),
  isListening: z.boolean().optional(),
  isProcessing: z.boolean().optional(),
  isSendingToServer: z.boolean().optional(),
  wakeWordActive: z.boolean().optional(),
  onVoiceTranscribed: z.function().args(z.string()).returns(z.void()),
  transcribeAudio: z.function().args(z.any()).returns(z.any()),
  onMobileMenuToggle: z.function().args(z.boolean()).returns(z.void()),
  mobileMenuOpen: z.boolean(),
  onProfileNavigate: z.function().args(z.string()).returns(z.void()),
  onLogout: z.function().returns(z.void()),
});

type HeaderActionsProps = z.infer<typeof HeaderActionsPropsSchema>;

export default function HeaderActions({
  showAdmin = false,
  isAuthenticated = false,
  user = null,
  isMobile = false,
  showSoundwave = false,
  audioLevel = 0,
  isListening = false,
  isProcessing = false,
  isSendingToServer = false,
  wakeWordActive = false,
  onVoiceTranscribed,
  transcribeAudio,
  onMobileMenuToggle,
  mobileMenuOpen = false,
  onProfileNavigate,
  onLogout,
}: Partial<HeaderActionsProps>) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [loginFocused, setLoginFocused] = useState(false);

  // Validate required props
  if (onVoiceTranscribed && !transcribeAudio) {
    throw new Error('transcribeAudio is required when onVoiceTranscribed is provided');
  }

  const handleProfileNavigate = (path: string) => {
    if (onProfileNavigate) {
      onProfileNavigate(path);
    } else {
      navigate(path);
    }
  };

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    }
  };

  const handleMobileMenuToggle = () => {
    if (onMobileMenuToggle) {
      onMobileMenuToggle(!mobileMenuOpen);
    }
  };

  return (
    <View
      className={platformClass(
        'flex-row items-center gap-3',
        'flex-row items-center gap-3'
      )}
    >
      {/* Admin Button */}
      {showAdmin && (
        <Link to="/admin" style={{ textDecoration: 'none' }}>
          <View
            className={platformClass(
              'flex-row items-center gap-2 px-3 py-2 rounded-lg bg-red-500/20 border border-red-500/30 hover:bg-red-500/30',
              'flex-row items-center gap-2 px-3 py-2 rounded-lg bg-red-500/20 border border-red-500/30'
            )}
          >
            <Shield size={16} color="#ef4444" />
            <Text
              className={platformClass(
                'text-sm font-semibold text-red-400',
                'text-sm font-semibold text-red-400'
              )}
            >
              {t('nav.admin', 'Admin')}
            </Text>
          </View>
        </Link>
      )}

      {/* Beta Credit Balance */}
      {isAuthenticated && user && (
        <BetaCreditBalance
          variant="compact"
          apiBaseUrl="/api/v1"
          refreshInterval={30000}
        />
      )}

      {/* Profile or Login */}
      {isAuthenticated && user ? (
        <ProfileDropdown
          user={user}
          onNavigate={handleProfileNavigate}
          onLogout={handleLogout}
        />
      ) : (
        <Pressable
          onPress={() => navigate('/login')}
          onFocus={() => setLoginFocused(true)}
          onBlur={() => setLoginFocused(false)}
          className={platformClass(
            `px-4 py-2 rounded-lg bg-purple-500 hover:bg-purple-600 transition-colors ${
              loginFocused ? 'ring-2 ring-purple-400' : ''
            }`,
            `px-4 py-2 rounded-lg bg-purple-500 ${
              loginFocused ? 'ring-2 ring-purple-400' : ''
            }`
          )}
          accessibilityRole="button"
          accessibilityLabel={t('account.login')}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Text
            className={platformClass(
              'text-sm font-semibold text-white',
              'text-sm font-semibold text-white'
            )}
          >
            {t('account.login')}
          </Text>
        </Pressable>
      )}

      {/* Language Selector */}
      <LanguageSelector />

      {/* Search Button */}
      <Link to="/search" style={{ textDecoration: 'none' }}>
        <View
          className={platformClass(
            `w-11 h-11 justify-center items-center rounded-full bg-white/5 hover:bg-white/10 transition-colors`,
            `w-11 h-11 justify-center items-center rounded-full bg-white/5`
          )}
        >
          <Search size={IS_TV_BUILD ? 32 : 20} color="rgba(255, 255, 255, 0.9)" />
        </View>
      </Link>

      {/* Soundwave Visualizer (TV only) */}
      {showSoundwave && (
        <View className={platformClass('ml-2')}>
          <SoundwaveVisualizer
            audioLevel={audioLevel}
            isListening={isListening || wakeWordActive}
            isProcessing={isProcessing}
            isSendingToServer={isSendingToServer}
            compact
          />
        </View>
      )}

      {/* Voice Search Button (hide on TV when Hebrew selected) */}
      {(!IS_TV_BUILD || i18n.language !== 'he') && onVoiceTranscribed && transcribeAudio && (
        <View className={platformClass('ml-1')}>
          <VoiceSearchButton
            onResult={onVoiceTranscribed}
            transcribeAudio={transcribeAudio}
            tvMode={IS_TV_BUILD}
          />
        </View>
      )}

      {/* Mobile Menu Toggle */}
      {isMobile && (
        <Pressable
          onPress={handleMobileMenuToggle}
          className={platformClass(
            'w-11 h-11 justify-center items-center rounded-full bg-white/5 hover:bg-white/10',
            'w-11 h-11 justify-center items-center rounded-full bg-white/5'
          )}
          accessibilityRole="button"
          accessibilityLabel={t('nav.menu', 'Menu')}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          {mobileMenuOpen ? (
            <X size={20} color="rgba(255, 255, 255, 0.9)" />
          ) : (
            <Menu size={20} color="rgba(255, 255, 255, 0.9)" />
          )}
        </Pressable>
      )}
    </View>
  );
}
