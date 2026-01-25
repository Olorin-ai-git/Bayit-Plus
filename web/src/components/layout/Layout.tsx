import { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import GlassSidebar from './GlassSidebar';
import Breadcrumbs from './Breadcrumbs';
import Chatbot from '../chat/Chatbot';
import SoundwaveParticles from '../content/SoundwaveParticles';
import { WidgetManager } from '../widgets';
import { useVoiceListeningContext } from '@bayit/shared-contexts';
import { ttsService } from '@bayit/shared-services';
import { colors, spacing } from '@olorin/design-tokens';
import { useTizenRemoteKeys } from '@/hooks/useTizenRemoteKeys';
import { useSamsungVoice } from '@/hooks/useSamsungVoice';
import { useChatbotStore } from '@/stores/chatbotStore';
import { useDirection } from '@/hooks/useDirection';
import { VoiceAvatarFAB, VoiceChatModal } from '@bayit/shared/components/support';
import { useVoiceSupport } from '@bayit/shared-hooks';
import { supportConfig } from '@bayit/shared-config/supportConfig';
import logger from '@/utils/logger';

// Check if this is a TV build (set by webpack)
declare const __TV__: boolean;
const IS_TV_BUILD = typeof __TV__ !== 'undefined' && __TV__;

export default function Layout() {
  // Sidebar state: always expanded by default on both web and TV
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const { isRTL } = useDirection();

  // Voice Support for floating wizard hat FAB
  const {
    voiceState,
    isVoiceModalOpen,
    isSupported: voiceSupported,
    closeVoiceModal,
    startListening,
    stopListening,
    interrupt,
    activateVoiceAssistant,
  } = useVoiceSupport();

  const handleVoiceAvatarPress = useCallback(() => {
    // Dispatch custom event to toggle topbar microphone button state
    logger.debug('Wizard avatar pressed - activating voice assistant', 'Layout');
    window.dispatchEvent(new CustomEvent('bayit:toggle-voice'));

    // Activate voice assistant (handles intro + modal + listening)
    activateVoiceAssistant();
  }, [activateVoiceAssistant]);

  // Handle closing the voice modal - must also toggle the microphone button back
  const handleCloseVoiceModal = useCallback(() => {
    logger.debug('Voice modal closing - toggling microphone button off', 'Layout');
    // Dispatch custom event to toggle topbar microphone button state back off
    window.dispatchEvent(new CustomEvent('bayit:toggle-voice'));
    // Close the modal
    closeVoiceModal();
  }, [closeVoiceModal]);

  const toggleSidebar = useCallback(() => {
    setIsSidebarExpanded(prev => !prev);
  }, []);

  // Handle Red button on TV remote to toggle voice listening
  const handleRedButton = useCallback(() => {
    logger.debug('Red button pressed - toggling voice', 'Layout');
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
    logger.debug('Bixby search received', 'Layout', query);
    toggleOpen(); // Open chatbot
    sendMessage(query); // Send the voice query to chatbot
  }, [sendMessage, toggleOpen]);

  const handleBixbyCommand = useCallback((command: string, data?: any) => {
    logger.debug('Bixby command', 'Layout', { command, data });
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
      logger.debug('Bixby voice integration available', 'Layout', bixbyAvailable);
    }
  }, [bixbyAvailable]);

  // Voice listening context - shared across all pages
  const { isListening, isAwake, isProcessing, audioLevel } = useVoiceListeningContext();

  // Debug: Log when processing state is received
  useEffect(() => {
    if (isProcessing || isAwake) {
      logger.debug('CONTEXT RECEIVED - Processing', 'Layout', {
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

  // Animation for voice panel slide up/down
  const voicePanelAnim = useRef(new Animated.Value(0)).current;

  // Voice panel is visible when any voice activity is happening
  const isVoiceActive = isListening || isAwake || isProcessing || isResponding || isTTSSpeaking;

  // Animate the voice panel visibility
  useEffect(() => {
    Animated.timing(voicePanelAnim, {
      toValue: isVoiceActive ? 1 : 0,
      duration: 300,
      useNativeDriver: false, // height animation doesn't support native driver
    }).start();
  }, [isVoiceActive, voicePanelAnim]);

  // Listen for TTS events to track response speaking state
  useEffect(() => {
    logger.debug('Setting up TTS event listeners', 'Layout');

    const handlePlaying = (item: any) => {
      logger.debug('TTS playing event fired', 'Layout', item.text?.substring(0, 50));
      // Delay setting isResponding to allow Processing state to be visible first
      setTimeout(() => {
        setIsResponding(true);
      }, 300);
      setIsTTSSpeaking(true);
      setVoiceResponse(item.text || '');
    };

    const handleCompleted = () => {
      logger.debug('TTS completed event fired', 'Layout');
      setIsResponding(false);
      setIsTTSSpeaking(false);
      // Keep response text for a moment before clearing
      setTimeout(() => setVoiceResponse(''), 2000);
    };

    const handleError = (data: any) => {
      logger.error('TTS error event fired', 'Layout', data?.error);
      setVoiceError(true);
      setIsResponding(false);
      setIsTTSSpeaking(false);
      setTimeout(() => setVoiceError(false), 3000);
    };

    // Listen to TTS events
    logger.debug('Registering TTS event listeners - playing, completed, error', 'Layout');
    ttsService.on('playing', handlePlaying);
    ttsService.on('completed', handleCompleted);
    ttsService.on('error', handleError);

    return () => {
      logger.debug('Cleanup: removing TTS event listeners', 'Layout');
      ttsService.off('playing', handlePlaying);
      ttsService.off('completed', handleCompleted);
      ttsService.off('error', handleError);
    };
  }, []);

  // Calculate content margin based on sidebar state
  // Sidebar widths must match GlassSidebar: TV uses 80/280, web uses 64/220
  const collapsedWidth = IS_TV_BUILD ? 80 : 64;
  const expandedWidth = IS_TV_BUILD ? 280 : 220;
  const sidebarWidth = isSidebarExpanded ? expandedWidth : collapsedWidth;

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

        {/* Breadcrumbs Navigation */}
        <Breadcrumbs />

        {/* Voice Soundwave Particles - visible only when voice control is active */}
        <Animated.View
          style={[
            styles.voicePanelWrapper,
            {
              height: voicePanelAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 100],
              }),
              opacity: voicePanelAnim,
            },
          ]}
        >
          <SoundwaveParticles
            isListening={isListening}
            isProcessing={isAwake || isProcessing}
            audioLevel={audioLevel}
            hasError={voiceError}
            isResponding={isResponding || isTTSSpeaking}
            responseText={voiceResponse}
          />
        </Animated.View>

        <View style={styles.main}>
          <Outlet />
        </View>
        {!IS_TV_BUILD && <Footer />}
      </View>

      {/* Chatbot enabled on both web and TV for voice interaction */}
      <Chatbot />

      {/* Voice Avatar FAB - Floating wizard hat for voice support */}
      {voiceSupported && supportConfig.voiceAssistant.enabled && (
        <VoiceAvatarFAB
          onPress={handleVoiceAvatarPress}
          visible={!isVoiceModalOpen}
        />
      )}

      {/* Voice Chat Modal - Full-screen voice interaction */}
      <VoiceChatModal
        visible={isVoiceModalOpen}
        onClose={handleCloseVoiceModal}
        onStartListening={startListening}
        onStopListening={stopListening}
        onInterrupt={interrupt}
      />

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
    // Ensure content isn't clipped at the top edge
    paddingTop: 'env(safe-area-inset-top, 0px)',
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
    backgroundColor: colors.primary.DEFAULT,
    opacity: 0.5,
  },
  blurCirclePurple: {
    width: 288,
    height: 288,
    top: '33%' as any,
    left: -144,
    backgroundColor: colors.secondary.DEFAULT,
    opacity: 0.4,
  },
  blurCircleSuccess: {
    width: 256,
    height: 256,
    bottom: '25%' as any,
    right: '25%' as any,
    backgroundColor: colors.success.DEFAULT,
    opacity: 0.3,
  },
  main: {
    flex: 1,
    position: 'relative',
    zIndex: 10,
  },
  voicePanelWrapper: {
    overflow: 'hidden',
    width: '100%',
  },
});
