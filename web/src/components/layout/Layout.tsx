import { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Outlet, useNavigate } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import GlassSidebar from './GlassSidebar';
import Breadcrumbs from './Breadcrumbs';
import Chatbot from '../chat/Chatbot';
import SoundwaveParticles from '../content/SoundwaveParticles';
import MobileBottomNav from '../mobile/MobileBottomNav';
import { WidgetManager } from '../widgets';
import { useVoiceListeningContext } from '@bayit/shared-contexts';
import { ttsService } from '@bayit/shared-services';
import { colors, spacing } from '@olorin/design-tokens';
import { useTizenRemoteKeys } from '@/hooks/useTizenRemoteKeys';
import { useSamsungVoice } from '@/hooks/useSamsungVoice';
import { useChatbotStore } from '@/stores/chatbotStore';
import { useDirection } from '@/hooks/useDirection';
import { useResponsive } from '@/hooks/useResponsive';
import { useSupportStore } from '@bayit/shared/stores/supportStore';
import { VoiceResponseBubble } from '@/components/voice/VoiceResponseBubble';
import { VoiceAvatarFAB, VoiceChatModal } from '@bayit/shared/components/support';
import { useVoiceSupport } from '@bayit/shared-hooks';
import { supportConfig } from '@bayit/shared-config/supportConfig';
import logger from '@/utils/logger';

// Check if this is a TV build (set by webpack)
declare const __TV__: boolean;
const IS_TV_BUILD = typeof __TV__ !== 'undefined' && __TV__;

export default function Layout() {
  // Responsive state
  const responsive = useResponsive();
  const { isMobile } = responsive;

  // Sidebar state: always expanded by default on desktop/TV, hidden on mobile
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const { isRTL } = useDirection();

  // Current transcript from voice support store (set by voice pipeline services)
  const currentTranscript = useSupportStore((s) => s.currentTranscript);

  // Voice action execution - navigate, search, playback, scroll
  const navigate = useNavigate();
  const pendingVoiceAction = useSupportStore((s) => s.pendingVoiceAction);
  const lastProcessedActionRef = useRef<string | null>(null);

  useEffect(() => {
    if (!pendingVoiceAction) return;

    // Deduplication: prevent processing the same action twice
    const actionKey = `${pendingVoiceAction.type}:${JSON.stringify(pendingVoiceAction.payload)}`;
    if (lastProcessedActionRef.current === actionKey) return;

    const action = useSupportStore.getState().consumeVoiceAction();
    if (!action) return;

    lastProcessedActionRef.current = actionKey;

    try {
      switch (action.type) {
        case 'navigate':
          if (action.payload.path && typeof action.payload.path === 'string') {
            navigate(action.payload.path);
          }
          break;
        case 'search':
          if (action.payload.query && typeof action.payload.query === 'string') {
            navigate(`/search?q=${encodeURIComponent(action.payload.query)}`);
          }
          break;
        case 'playback':
          window.dispatchEvent(new CustomEvent('bayit:voice-playback', { detail: action.payload }));
          break;
        case 'scroll':
          window.scrollBy({
            top: action.payload.direction === 'up' ? -500 : 500,
            behavior: 'smooth',
          });
          break;
      }
    } catch (error) {
      logger.error('Failed to execute voice action', 'Layout', { actionType: action.type, error });
    }
  }, [pendingVoiceAction, navigate]);

  // Voice Support for floating wizard hat FAB
  const {
    voiceState,
    isVoiceModalOpen,
    isSupported: voiceSupported,
    closeVoiceModal,
    openVoiceModal,
    startListening,
    stopListening,
    interrupt,
    playIntro,
  } = useVoiceSupport();

  const handleVoiceAvatarPress = useCallback(async () => {
    // Dispatch custom event to toggle topbar microphone button state
    logger.debug('Wizard avatar pressed - opening voice modal and starting listening', 'Layout');

    // Toggle particles animation
    window.dispatchEvent(new CustomEvent('bayit:voice-started'));

    // Toggle microphone button state
    window.dispatchEvent(new CustomEvent('bayit:toggle-voice'));

    // Open modal
    openVoiceModal();

    // CRITICAL: Request microphone permission SYNCHRONOUSLY first
    // This MUST happen in the same event loop tick as the user gesture
    // to trigger the browser's permission dialog
    try {
      logger.debug('Requesting microphone permission synchronously', 'Layout');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop()); // Immediately release
      logger.debug('Microphone permission granted', 'Layout');
    } catch (error: any) {
      logger.error('Microphone permission denied', 'Layout', error);

      // Show user-friendly error message based on error type
      const errorName = error?.name || 'UnknownError';
      const errorMessage = error?.message || 'Unknown error';

      let userMessage = '';
      let instructions = '';

      if (errorName === 'NotFoundError') {
        userMessage = 'Microphone not found or not accessible';
        instructions = 'Please check:\n' +
          '1. System Preferences → Security & Privacy → Microphone\n' +
          '2. Enable Chrome to access microphone\n' +
          '3. Restart Chrome\n' +
          '4. Try again';
      } else if (errorName === 'NotAllowedError' || errorName === 'PermissionDeniedError') {
        userMessage = 'Microphone permission denied';
        instructions = 'Please allow microphone access when prompted, or:\n' +
          '1. Click the lock icon in the address bar\n' +
          '2. Allow microphone access\n' +
          '3. Reload the page';
      } else if (errorName === 'NotReadableError' || errorName === 'TrackStartError') {
        userMessage = 'Microphone is in use by another application';
        instructions = 'Please close other applications using the microphone and try again.';
      } else {
        userMessage = 'Could not access microphone';
        instructions = `Error: ${errorMessage}`;
      }

      // Show alert with instructions
      alert(`${userMessage}\n\n${instructions}`);

      // Log detailed error for debugging
      logger.error('Microphone access failed', 'Layout', {
        errorName,
        errorMessage,
        userMessage,
      });

      closeVoiceModal();
      window.dispatchEvent(new CustomEvent('bayit:toggle-voice')); // Toggle mic button back
      return; // Stop if permission denied
    }

    // Now proceed with intro and listening (permission already granted)
    try {
      await playIntro();
      logger.debug('Intro completed, starting listening', 'Layout');
      await startListening();
    } catch (error) {
      logger.warn('Intro or listening failed', 'Layout', error);
    }
  }, [openVoiceModal, playIntro, startListening, closeVoiceModal]);

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

  // Manual voice activation for testing (without microphone)
  const [manualVoiceActive, setManualVoiceActive] = useState(false);

  // Listen for manual voice activation event - toggle on/off
  useEffect(() => {
    const handleVoiceStarted = () => {
      logger.debug('Voice manually toggled - toggling particles', 'Layout');
      setManualVoiceActive(prev => !prev);
    };

    window.addEventListener('bayit:voice-started', handleVoiceStarted);
    return () => window.removeEventListener('bayit:voice-started', handleVoiceStarted);
  }, []);

  // Voice panel is visible when any voice activity is happening
  const isVoiceActive = isListening || isAwake || isProcessing || isResponding || isTTSSpeaking || manualVoiceActive;

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
  // Mobile: sidebar is overlay (drawer), so no margin
  const getSidebarWidth = () => {
    if (IS_TV_BUILD) return isSidebarExpanded ? 280 : 80;
    if (isMobile) return 0; // Sidebar is overlay on mobile
    return isSidebarExpanded ? 220 : 64;
  };
  const sidebarWidth = getSidebarWidth();

  return (
    <View style={styles.container}>
      {/* Decorative blur circles - wrapped to contain overflow */}
      <View style={styles.blurContainer}>
        <View style={[styles.blurCircle, styles.blurCirclePrimary]} />
        <View style={[styles.blurCircle, styles.blurCirclePurple]} />
        <View style={[styles.blurCircle, styles.blurCircleSuccess]} />
      </View>

      {/* Sidebar - Hidden on mobile, always visible on web/TV */}
      {!isMobile && (
        <GlassSidebar
          isExpanded={isSidebarExpanded}
          onToggle={toggleSidebar}
        />
      )}

      {/* Main content wrapper with sidebar offset */}
      <View style={[
        styles.contentWrapper,
        isRTL ? { marginRight: sidebarWidth } : { marginLeft: sidebarWidth },
        isMobile && { paddingBottom: 64 }, // Space for bottom nav
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
        {!IS_TV_BUILD && !isMobile && <Footer />}
      </View>

      {/* Mobile Bottom Navigation - only on mobile */}
      {isMobile && !IS_TV_BUILD && <MobileBottomNav />}

      {/* Chatbot enabled on both web and TV for voice interaction */}
      <Chatbot />

      {/* Voice Avatar FAB - Floating wizard hat for voice support (desktop/TV only, hidden on mobile) */}
      {!isMobile && voiceSupported && supportConfig.voiceAssistant.enabled && (
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

      {/* Voice Response Bubble - shows wizard response text */}
      <VoiceResponseBubble
        transcript={currentTranscript}
        responseText={voiceResponse}
        isVisible={isTTSSpeaking}
        isRTL={isRTL}
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
    position: 'relative',
    zIndex: 9999, // Above modal and all other elements
  },
});
