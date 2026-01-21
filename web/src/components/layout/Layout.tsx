import { useState, useCallback, useEffect } from 'react';
import { View, Text } from 'react-native';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import GlassSidebar from './GlassSidebar';
import Breadcrumbs from './Breadcrumbs';
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
import { VoiceAvatarFAB, VoiceChatModal } from '@bayit/shared/components/support';
import { useVoiceSupport } from '@bayit/shared-hooks';
import { supportConfig } from '@bayit/shared-config/supportConfig';

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
    console.log('[Layout] Wizard avatar pressed - activating voice assistant');
    window.dispatchEvent(new CustomEvent('bayit:toggle-voice'));

    // Activate voice assistant (handles intro + modal + listening)
    activateVoiceAssistant();
  }, [activateVoiceAssistant]);

  // Handle closing the voice modal - must also toggle the microphone button back
  const handleCloseVoiceModal = useCallback(() => {
    console.log('[Layout] Voice modal closing - toggling microphone button off');
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
  // Sidebar widths must match GlassSidebar: TV uses 80/280, web uses 64/220
  const collapsedWidth = IS_TV_BUILD ? 80 : 64;
  const expandedWidth = IS_TV_BUILD ? 280 : 220;
  const sidebarWidth = isSidebarExpanded ? expandedWidth : collapsedWidth;

  return (
    <View className="flex-1 min-h-screen bg-[#111122] relative flex-row">
      {/* Decorative blur circles - wrapped to contain overflow */}
      <View className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <View className="absolute w-96 h-96 -top-48 -right-48 rounded-full opacity-50 blur-[100px]" style={{ backgroundColor: colors.primary }} />
        <View className="absolute w-72 h-72 top-[33%] -left-36 rounded-full opacity-40 blur-[100px]" style={{ backgroundColor: colors.secondary }} />
        <View className="absolute w-64 h-64 bottom-[25%] right-[25%] rounded-full opacity-30 blur-[100px]" style={{ backgroundColor: colors.success }} />
      </View>

      {/* Sidebar - Always visible on web, toggleable on TV */}
      <GlassSidebar
        isExpanded={isSidebarExpanded}
        onToggle={toggleSidebar}
      />

      {/* Main content wrapper with sidebar offset */}
      <View
        className="flex-1 flex-col min-h-screen pt-[env(safe-area-inset-top,0px)]"
        style={{
          transition: 'margin-left 0.3s ease-out',
          ...(isRTL ? { marginRight: sidebarWidth } : { marginLeft: sidebarWidth }),
        }}
      >
        <Header />

        {/* Breadcrumbs Navigation */}
        <Breadcrumbs />

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

        <View className="flex-1 relative z-10">
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
