import { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import GlassSidebar from './GlassSidebar';
import Chatbot from '../chat/Chatbot';
import SoundwaveParticles from '../content/SoundwaveParticles';
import { useVoiceListeningContext } from '@bayit/shared-contexts';
import { ttsService } from '@bayit/shared-services';
import { colors, spacing } from '@bayit/shared/theme';

// Check if this is a TV build (set by webpack)
declare const __TV__: boolean;
const IS_TV_BUILD = typeof __TV__ !== 'undefined' && __TV__;

export default function Layout() {
  // Sidebar state for TV builds
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);

  const toggleSidebar = useCallback(() => {
    setIsSidebarExpanded(prev => !prev);
  }, []);

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
  const sidebarWidth = IS_TV_BUILD ? (isSidebarExpanded ? 280 : 80) : 0;

  return (
    <View style={styles.container}>
      {/* Decorative blur circles - wrapped to contain overflow */}
      <View style={styles.blurContainer}>
        <View style={[styles.blurCircle, styles.blurCirclePrimary]} />
        <View style={[styles.blurCircle, styles.blurCirclePurple]} />
        <View style={[styles.blurCircle, styles.blurCircleSuccess]} />
      </View>

      {/* TV Sidebar */}
      {IS_TV_BUILD && (
        <GlassSidebar
          isExpanded={isSidebarExpanded}
          onToggle={toggleSidebar}
        />
      )}

      {/* Main content wrapper with sidebar offset */}
      <View style={[
        styles.contentWrapper,
        IS_TV_BUILD && { marginLeft: sidebarWidth },
      ]}>
        <Header onMenuPress={IS_TV_BUILD ? toggleSidebar : undefined} />

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
