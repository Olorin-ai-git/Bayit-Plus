import { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import GlassSidebar from './GlassSidebar';
import Chatbot from '../chat/Chatbot';
import SoundwaveParticles from '../content/SoundwaveParticles';
import RunningFlowBanner from '../flow/RunningFlowBanner';
import { WidgetManager } from '../widgets';
import { useVoiceListeningContext } from '@bayit/shared-contexts';
import { ttsService } from '@bayit/shared-services';
import { colors, spacing } from '@bayit/shared/theme';
import { useTizenRemoteKeys } from '@/hooks/useTizenRemoteKeys';
import { useSamsungVoice } from '@/hooks/useSamsungVoice';
import { useChatbotStore } from '@/stores/chatbotStore';
import { useDirection } from '@/hooks/useDirection';
import { useFlowStore } from '@/stores/flowStore';

// Check if this is a TV build (set by webpack)
declare const __TV__: boolean;
const IS_TV_BUILD = typeof __TV__ !== 'undefined' && __TV__;

export default function Layout() {
  // Sidebar state: always expanded by default on both web and TV
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const { isRTL } = useDirection();

  const toggleSidebar = useCallback(() => {
    setIsSidebarExpanded(prev => !prev);
  }, []);

  // Handle Red button on TV remote to toggle voice listening
  const handleRedButton = useCallback(() => {
    console.log('[Layout] Red button pressed - toggling voice');
    // Dispatch custom event that VoiceSearchButton listens for
    window.dispatchEvent(new CustomEvent('bayit:toggle-voice'));
  }, []);

  // Register TV remote key handlers (same for both TV and web)
  useTizenRemoteKeys({
    onRedButton: handleRedButton,
    onGreenButton: toggleSidebar, // Green button toggles sidebar on both platforms
    enabled: IS_TV_BUILD,
  });

  // Samsung Voice Integration (Bixby)
  // When user says "Hey Bixby, search for X", the search query is sent to chatbot
  const { sendMessage, toggleOpen } = useChatbotStore();

  const handleBixbySearch = useCallback((query: string) => {
    console.log('[Layout] Bixby search received:', query);
    toggleOpen(); // Open chatbot
    sendMessage(query); // Send the voice query to chatbot
  }, [sendMessage, toggleOpen]);

  const handleBixbyCommand = useCallback((command: string, data?: any) => {
    console.log('[Layout] Bixby command:', command, data);
    // Could handle play/pause/etc commands here
  }, []);

  // Bixby voice integration disabled - requires voicecontrol privilege
  const bixbyAvailable = false;
  const bixbyError: string | null = null;
  // const { isAvailable: bixbyAvailable, error: bixbyError } = useSamsungVoice({
  //   enabled: IS_TV_BUILD,
  //   onSearch: handleBixbySearch,
  //   onCommand: handleBixbyCommand,
  //   currentState: 'Home',
  // });

  // Log Bixby availability
  useEffect(() => {
    if (IS_TV_BUILD) {
      console.log('[Layout] Bixby voice integration available:', bixbyAvailable);
    }
  }, [bixbyAvailable]);

  // Voice listening context - shared across all pages
  const { isListening, isAwake, isProcessing, audioLevel } = useVoiceListeningContext();

  // Debug: Log when processing state is received
  useEffect(() => {
    if (isProcessing || isAwake) {
      console.log('[Layout] 📊 CONTEXT RECEIVED - Processing:', {
        isProcessing,
        isAwake,
        isListening,
        audioLevel,
      });
    }
  }, [isProcessing, isAwake]);

  // TTS event state - tracks when system is speaking
  const [voiceResponse, setVoiceResponse] = useState<string>('');
  const [voiceError, setVoiceError] = useState<boolean>(false);
  const [isResponding, setIsResponding] = useState<boolean>(false);
  const [isTTSSpeaking, setIsTTSSpeaking] = useState<boolean>(false);

  // Listen for TTS events to track response speaking state
  useEffect(() => {
    console.log('[Layout] Setting up TTS event listeners');

    const handlePlaying = (item: any) => {
      console.log('[Layout] TTS playing event fired:', item.text?.substring(0, 50));
      // Delay setting isResponding to allow Processing state to be visible first
      setTimeout(() => {
        setIsResponding(true);
      }, 300);
      setIsTTSSpeaking(true);
      setVoiceResponse(item.text || '');
    };

    const handleCompleted = () => {
      console.log('[Layout] TTS completed event fired');
      setIsResponding(false);
      setIsTTSSpeaking(false);
      // Keep response text for a moment before clearing
      setTimeout(() => setVoiceResponse(''), 2000);
    };

    const handleError = (data: any) => {
      console.error('[Layout] TTS error event fired:', data?.error);
      setVoiceError(true);
      setIsResponding(false);
      setIsTTSSpeaking(false);
      setTimeout(() => setVoiceError(false), 3000);
    };

    // Listen to TTS events
    console.log('[Layout] Registering TTS event listeners - playing, completed, error');
    ttsService.on('playing', handlePlaying);
    ttsService.on('completed', handleCompleted);
    ttsService.on('error', handleError);

    return () => {
      console.log('[Layout] Cleanup: removing TTS event listeners');
      ttsService.off('playing', handlePlaying);
      ttsService.off('completed', handleCompleted);
      ttsService.off('error', handleError);
    };
  }, []);

  // Calculate content margin based on sidebar state
  // Sidebar is always visible: collapsed = 80px (icons), expanded = 280px (full)
  const sidebarWidth = isSidebarExpanded ? 280 : 80;

  return (
    <View style={styles.container}>
      {/* Decorative blur circles - wrapped to contain overflow */}
      <View style={styles.blurContainer}>
        <View style={[styles.blurCircle, styles.blurCirclePrimary]} />
        <View style={[styles.blurCircle, styles.blurCirclePurple]} />
        <View style={[styles.blurCircle, styles.blurCircleSuccess]} />
      </View>

      {/* Sidebar - Always visible on web, toggleable on TV */}
      <GlassSidebar
        isExpanded={isSidebarExpanded}
        onToggle={toggleSidebar}
      />

      {/* Main content wrapper with sidebar offset */}
      <View style={[
        styles.contentWrapper,
        isRTL ? { marginRight: sidebarWidth } : { marginLeft: sidebarWidth },
      ]}>
        <Header />

        {/* Running Flow Banner - shows when a flow is active */}
        <RunningFlowBanner />

        {/* Voice Soundwave Particles - visible on all pages (100px high) */}
        <SoundwaveParticles
          isListening={isListening}
          isProcessing={isAwake || isProcessing}
          audioLevel={audioLevel}
          hasError={voiceError}
          isResponding={isResponding || isTTSSpeaking}
          responseText={voiceResponse}
        />

        <View style={styles.main}>
          <Outlet />
        </View>
        {!IS_TV_BUILD && <Footer />}
      </View>

      {/* Chatbot enabled on both web and TV for voice interaction */}
      <Chatbot />

      {/* Widget Manager - renders floating overlay widgets */}
      <WidgetManager />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: '100vh' as any,
    backgroundColor: colors.background,
    position: 'relative',
    flexDirection: 'row',
  },
  contentWrapper: {
    flex: 1,
    flexDirection: 'column',
    minHeight: '100vh' as any,
    transition: 'margin-left 0.3s ease-out',
  } as any,
  blurContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
    pointerEvents: 'none' as any,
    zIndex: 0,
  },
  blurCircle: {
    position: 'absolute',
    borderRadius: 9999,
    // @ts-ignore - Web CSS property
    filter: 'blur(100px)',
  },
  blurCirclePrimary: {
    width: 384,
    height: 384,
    top: -192,
    right: -192,
    backgroundColor: colors.primary,
    opacity: 0.5,
  },
  blurCirclePurple: {
    width: 288,
    height: 288,
    top: '33%' as any,
    left: -144,
    backgroundColor: colors.secondary,
    opacity: 0.4,
  },
  blurCircleSuccess: {
    width: 256,
    height: 256,
    bottom: '25%' as any,
    right: '25%' as any,
    backgroundColor: colors.success,
    opacity: 0.3,
  },
  main: {
    flex: 1,
    position: 'relative',
    zIndex: 10,
  },
});
