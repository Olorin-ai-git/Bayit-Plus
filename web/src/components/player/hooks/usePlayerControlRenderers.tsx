import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { WatchPartyButton } from "@/components/watchparty";
import SubtitleControls from "../SubtitleControls";
import LiveSubtitleControls from "../LiveSubtitleControls";
import LiveSplitSubtitleControls from "../LiveSplitSubtitleControls";
import { DubbingControls } from "../dubbing";
import { RecordButton } from "../RecordButton";
import CastButton from "../controls/CastButton";
import AirPlayButton from "../controls/AirPlayButton";
import ChromecastButton from "../controls/ChromecastButton";
import CatchUpButton from "../catchup/CatchUpButton";
import PiPButton from "../controls/PiPButton";
import LiveFeatureButton from "../controls/LiveFeatureButton";
import { MessageCircle, Lightbulb, SkipBack, SkipForward } from "lucide-react";
import { colors } from "@olorin/design-tokens";
import liveSubtitleService from "@/services/liveSubtitleService";
import {
  SubtitleTrack,
  SubtitleSettings,
  HebrewMode,
  EnglishMode,
  SplitLanguages,
} from "@/types/subtitle";
import { UseLiveDubbingState } from "./useLiveDubbing";
import { WatchParty } from "@/types/watchparty";
import { SubtitleCue } from "../types";
import { CastSessions } from "./useCastSession";
import { UsageStats } from "@/services/liveQuotaApi";
import { castConfig } from "@/config/castConfig";
import type { UsePictureInPictureReturn } from "./usePictureInPicture";

const DEBUG_CAST = import.meta.env.VITE_DEBUG_CAST === "true";
const FORCE_SHOW_CAST = import.meta.env.VITE_CAST_FORCE_SHOW === "true";

interface UsePlayerControlRenderersParams {
  // User and content
  user: any;
  contentId?: string;
  usageStats?: UsageStats | null;
  isAdmin?: boolean;
  isLive: boolean;
  containerRef: React.RefObject<HTMLDivElement>;
  videoRef: React.RefObject<HTMLVideoElement>;
  isWidget?: boolean;

  // Watch Party
  party: WatchParty | null;
  showPartyPanel: boolean;
  setShowCreateModal: (show: boolean) => void;
  setShowJoinModal: (show: boolean) => void;
  setShowPartyPanel: (show: boolean) => void;

  // Subtitles (VOD)
  availableSubtitles: SubtitleTrack[];
  currentSubtitleLang: string | null;
  subtitlesEnabled: boolean;
  subtitleSettings: SubtitleSettings;
  subtitlesLoading: boolean;
  handleSubtitleLanguageChange: (lang: string) => void;
  handleSubtitleToggle: () => void;
  handleSubtitleSettingsChange: (settings: SubtitleSettings) => void;
  fetchAvailableSubtitles: () => void;
  hebrewMode: HebrewMode;
  handleHebrewModeChange: (mode: HebrewMode) => void;
  englishMode: EnglishMode;
  handleEnglishModeChange: (mode: EnglishMode) => void;
  // Split mode (dual subtitles)
  splitMode?: boolean;
  handleSplitModeToggle?: (enabled: boolean) => void;
  splitLanguages?: SplitLanguages | null;
  handleSplitLanguagesChange?: (languages: SplitLanguages | null) => void;

  // Live Subtitles
  liveSubtitleLang: string;
  setLiveSubtitleLang: (lang: string) => void;
  handleLiveSubtitleCue: (cue: SubtitleCue) => void;

  // Live Split Subtitles
  liveSplitMode?: boolean;
  handleLiveSplitModeToggle?: (enabled: boolean) => void;
  liveSplitLanguages?: SplitLanguages | null;
  handleLiveSplitLanguagesChange?: (languages: SplitLanguages) => void;
  liveSplitConnected?: boolean;
  liveSplitConnecting?: boolean;

  // Dubbing
  dubbing: UseLiveDubbingState;

  // Cast (unified and individual sessions)
  cast: CastSessions;

  // Picture-in-Picture
  pip: UsePictureInPictureReturn;

  // Recording
  setIsRecording: (recording: boolean) => void;
  setRecordingDuration: (duration: number) => void;

  // Channel Chat (Live TV)
  channelChat?: {
    showChat: boolean;
    toggleChat: () => void;
    hasUnreadMessages: boolean;
  };

  // Live Trivia (Live TV)
  liveTrivia?: {
    enabled: boolean;
    toggleEnabled: () => void;
    hasActiveFact: boolean;
  };

  // Catch-Up Summary (Live TV)
  catchUp?: {
    showSummary: boolean;
    toggleSummary: () => void;
    canRequest: boolean;
  };

  // VOD interaction navigation (non-live only)
  vodInteraction?: {
    hasMoments: boolean;
    isFreeDialogueActive: boolean;
    onInteract: () => void;
    onPreviousInteraction: () => void;
    onNextInteraction: () => void;
  };

  // Callbacks
  onShowUpgrade?: () => void;
  onHoveredButtonChange?: (button: string | null) => void;
}

export function usePlayerControlRenderers({
  user,
  contentId,
  isLive,
  containerRef,
  videoRef,
  isWidget = false,
  usageStats,
  isAdmin = false,
  party,
  showPartyPanel,
  setShowCreateModal,
  setShowJoinModal,
  setShowPartyPanel,
  availableSubtitles,
  currentSubtitleLang,
  subtitlesEnabled,
  subtitleSettings,
  subtitlesLoading,
  handleSubtitleLanguageChange,
  handleSubtitleToggle,
  handleSubtitleSettingsChange,
  fetchAvailableSubtitles,
  hebrewMode,
  handleHebrewModeChange,
  englishMode,
  handleEnglishModeChange,
  splitMode,
  handleSplitModeToggle,
  splitLanguages,
  handleSplitLanguagesChange,
  liveSubtitleLang,
  setLiveSubtitleLang,
  handleLiveSubtitleCue,
  liveSplitMode,
  handleLiveSplitModeToggle,
  liveSplitLanguages,
  handleLiveSplitLanguagesChange,
  liveSplitConnected,
  liveSplitConnecting,
  dubbing,
  cast,
  pip,
  setIsRecording,
  setRecordingDuration,
  channelChat,
  liveTrivia,
  catchUp,
  vodInteraction,
  onShowUpgrade,
  onHoveredButtonChange,
}: UsePlayerControlRenderersParams) {
  const { t } = useTranslation();
  const isPremium =
    user?.subscription?.plan === "premium" ||
    user?.subscription?.plan === "family";

  const subtitleQuotaExceeded =
    !isAdmin &&
    !!usageStats &&
    (usageStats.subtitle_available_hour <= 0 ||
      usageStats.subtitle_available_day <= 0 ||
      usageStats.subtitle_available_month <= 0);

  const dubbingQuotaExceeded =
    !isAdmin &&
    !!usageStats &&
    (usageStats.dubbing_available_hour <= 0 ||
      usageStats.dubbing_available_day <= 0 ||
      usageStats.dubbing_available_month <= 0);

  const renderWatchPartyButton = useCallback(() => null, []);

  const renderSubtitleControls = useCallback(
    () =>
      !isLive && contentId ? (
        <SubtitleControls
          contentId={contentId}
          availableLanguages={availableSubtitles}
          currentLanguage={currentSubtitleLang}
          enabled={subtitlesEnabled}
          settings={subtitleSettings}
          onLanguageChange={handleSubtitleLanguageChange as any}
          onToggle={handleSubtitleToggle}
          onSettingsChange={handleSubtitleSettingsChange}
          onSubtitlesRefresh={fetchAvailableSubtitles}
          isLoading={subtitlesLoading}
          containerRef={containerRef}
          hebrewMode={hebrewMode}
          onHebrewModeChange={handleHebrewModeChange}
          englishMode={englishMode}
          onEnglishModeChange={handleEnglishModeChange}
          splitMode={splitMode}
          onSplitModeToggle={handleSplitModeToggle}
          splitLanguages={splitLanguages}
          onSplitLanguagesChange={handleSplitLanguagesChange}
        />
      ) : null,
    [
      isLive,
      contentId,
      availableSubtitles,
      currentSubtitleLang,
      subtitlesEnabled,
      subtitleSettings,
      handleSubtitleLanguageChange,
      handleSubtitleToggle,
      handleSubtitleSettingsChange,
      fetchAvailableSubtitles,
      subtitlesLoading,
      containerRef,
      hebrewMode,
      handleHebrewModeChange,
      englishMode,
      handleEnglishModeChange,
      splitMode,
      handleSplitModeToggle,
      splitLanguages,
      handleSplitLanguagesChange,
    ],
  );

  const renderLiveSubtitleControls = useCallback(
    () =>
      isLive && contentId && !isWidget ? (
        <LiveSubtitleControls
          channelId={contentId}
          isLive={isLive}
          isPremium={isPremium}
          videoElement={videoRef.current}
          onSubtitleCue={handleLiveSubtitleCue as any}
          onShowUpgrade={onShowUpgrade}
          targetLang={liveSubtitleLang}
          onLanguageChange={setLiveSubtitleLang}
          availableLanguages={dubbing.availableLanguages}
          sourceLanguage={dubbing.availability?.source_language}
          onDisableDubbing={dubbing.disconnect}
          onHoveredButtonChange={onHoveredButtonChange}
          quotaExceeded={subtitleQuotaExceeded}
          isDubbingActive={dubbing.isConnected}
        />
      ) : null,
    [
      isLive,
      contentId,
      isWidget,
      isPremium,
      videoRef,
      handleLiveSubtitleCue,
      onShowUpgrade,
      liveSubtitleLang,
      setLiveSubtitleLang,
      dubbing.availableLanguages,
      dubbing.availability?.source_language,
      dubbing.disconnect,
      dubbing.isConnected,
      onHoveredButtonChange,
      subtitleQuotaExceeded,
    ],
  );

  const renderLiveSplitSubtitleControls = useCallback(
    () =>
      isLive &&
      contentId &&
      !isWidget &&
      handleLiveSplitModeToggle &&
      handleLiveSplitLanguagesChange ? (
        <LiveSplitSubtitleControls
          isLive={isLive}
          isPremium={isPremium}
          splitMode={liveSplitMode ?? false}
          splitLanguages={liveSplitLanguages ?? null}
          onSplitModeToggle={handleLiveSplitModeToggle}
          onSplitLanguagesChange={handleLiveSplitLanguagesChange}
          isConnected={liveSplitConnected ?? false}
          isConnecting={liveSplitConnecting ?? false}
          availableLanguages={dubbing.availableLanguages}
          sourceLanguage={dubbing.availability?.source_language}
          onShowUpgrade={onShowUpgrade}
          onHoveredButtonChange={onHoveredButtonChange}
          quotaExceeded={subtitleQuotaExceeded}
        />
      ) : null,
    [
      isLive,
      contentId,
      isWidget,
      isPremium,
      liveSplitMode,
      liveSplitLanguages,
      handleLiveSplitModeToggle,
      handleLiveSplitLanguagesChange,
      liveSplitConnected,
      liveSplitConnecting,
      dubbing.availableLanguages,
      dubbing.availability?.source_language,
      onShowUpgrade,
      onHoveredButtonChange,
      subtitleQuotaExceeded,
    ],
  );

  const renderDubbingControls = useCallback(
    () =>
      isLive && contentId && !isWidget ? (
        <DubbingControls
          isEnabled={dubbing.isConnected}
          isConnecting={dubbing.isConnecting}
          isAvailable={dubbing.isAvailable}
          isPremium={isPremium}
          quotaExceeded={dubbingQuotaExceeded}
          targetLanguage={dubbing.targetLanguage}
          availableLanguages={dubbing.availableLanguages}
          availableVoices={dubbing.availableVoices as any}
          latencyMs={dubbing.latencyMs}
          error={dubbing.error}
          onDisableSubtitles={() => liveSubtitleService.disconnect()}
          onToggle={() => {
            // Prevent toggling while connection is in progress
            if (dubbing.isConnecting) {
              return;
            }

            if (dubbing.isConnected) {
              dubbing.disconnect();
            } else {
              dubbing.connect(dubbing.targetLanguage);
            }
          }}
          onLanguageChange={dubbing.setTargetLanguage}
          onOriginalVolumeChange={dubbing.setOriginalVolume}
          onDubbedVolumeChange={dubbing.setDubbedVolume}
          onVoiceChange={(voiceId) => {
            // Reconnect with new voice
            if (dubbing.isConnected) {
              dubbing.disconnect();
              setTimeout(
                () => dubbing.connect(dubbing.targetLanguage, voiceId),
                500,
              );
            }
          }}
          onShowUpgrade={onShowUpgrade}
          onHoveredButtonChange={onHoveredButtonChange}
          sourceLanguage={dubbing.availability?.source_language}
        />
      ) : null,
    [
      isLive,
      contentId,
      isWidget,
      isPremium,
      dubbingQuotaExceeded,
      onShowUpgrade,
      onHoveredButtonChange,
      dubbing.isConnected,
      dubbing.isConnecting,
      dubbing.isAvailable,
      dubbing.targetLanguage,
      dubbing.availableLanguages,
      dubbing.availableVoices,
      dubbing.latencyMs,
      dubbing.error,
      dubbing.disconnect,
      dubbing.connect,
      dubbing.setTargetLanguage,
      dubbing.setOriginalVolume,
      dubbing.setDubbedVolume,
      dubbing.availability?.source_language,
    ],
  );

  const renderRecordButton = useCallback(
    () =>
      isLive && contentId ? (
        <RecordButton
          channelId={contentId}
          isLive={isLive}
          isPremium={isPremium}
          onShowUpgrade={onShowUpgrade as any}
          onRecordingStateChange={(recording, duration) => {
            setIsRecording(recording);
            setRecordingDuration(duration);
          }}
        />
      ) : null,
    [
      isLive,
      contentId,
      isPremium,
      onShowUpgrade,
      setIsRecording,
      setRecordingDuration,
    ],
  );

  // Unified cast button (for backwards compatibility)
  const renderCastButton = useCallback(() => {
    return (
      <CastButton
        castSession={cast.unified}
        onHoveredButtonChange={onHoveredButtonChange}
      />
    );
  }, [
    cast.unified.isAvailable,
    cast.unified.isConnected,
    cast.unified.isConnecting,
    cast.unified.deviceName,
    cast.unified.castType,
    cast.unified.startCast,
    cast.unified.stopCast,
    onHoveredButtonChange,
  ]);

  // Individual AirPlay button (Safari/WebKit)
  const renderAirPlayButton = useCallback(() => {
    return (
      <AirPlayButton
        session={cast.airplay}
        onHoveredButtonChange={onHoveredButtonChange}
      />
    );
  }, [
    cast.airplay.isAvailable,
    cast.airplay.isConnected,
    cast.airplay.deviceName,
    cast.airplay.startCast,
    cast.airplay.stopCast,
    onHoveredButtonChange,
  ]);

  // Individual Chromecast button (Chrome/Edge)
  const renderChromecastButton = useCallback(() => {
    return (
      <ChromecastButton
        session={cast.chromecast}
        onHoveredButtonChange={onHoveredButtonChange}
      />
    );
  }, [
    cast.chromecast.isAvailable,
    cast.chromecast.isConnecting,
    cast.chromecast.isConnected,
    cast.chromecast.deviceName,
    cast.chromecast.startCast,
    cast.chromecast.stopCast,
    onHoveredButtonChange,
  ]);

  const renderPiPButton = useCallback(() => {
    return (
      <PiPButton pip={pip} onHoveredButtonChange={onHoveredButtonChange} />
    );
  }, [pip.isSupported, pip.isPiP, pip.togglePiP, onHoveredButtonChange]);

  const renderChannelChatButton = useCallback(() => {
    if (!channelChat) return null;
    const chatLabel = isLive
      ? t("player.liveChat", "Live Chat")
      : t("player.chat", "Chat");
    return (
      <LiveFeatureButton
        label={chatLabel}
        icon={
          <MessageCircle
            size={18}
            color={channelChat.showChat ? colors.text : colors.textSecondary}
          />
        }
        isActive={channelChat.showChat}
        onPress={channelChat.toggleChat}
      />
    );
  }, [isLive, channelChat, t]);

  const renderLiveTriviaButton = useCallback(() => {
    if (!isLive || !liveTrivia) return null;
    return (
      <LiveFeatureButton
        label={t("player.liveTrivia", "Live Trivia")}
        icon={
          <Lightbulb
            size={18}
            color={liveTrivia.enabled ? colors.text : colors.textSecondary}
          />
        }
        isActive={liveTrivia.enabled}
        onPress={liveTrivia.toggleEnabled}
      />
    );
  }, [isLive, liveTrivia, t]);

  const renderCatchUpButton = useCallback(
    () =>
      isLive && catchUp ? (
        <CatchUpButton onPress={catchUp.toggleSummary} isLoading={false} />
      ) : null,
    [isLive, catchUp],
  );

  const renderInteractButton = useCallback(
    () =>
      !isLive && vodInteraction?.hasMoments ? (
        <LiveFeatureButton
          label={t("player.pauseAsk.title")}
          icon={
            <MessageCircle
              size={18}
              color={
                vodInteraction.isFreeDialogueActive
                  ? colors.text
                  : colors.textSecondary
              }
            />
          }
          isActive={vodInteraction.isFreeDialogueActive}
          onPress={vodInteraction.onInteract}
        />
      ) : null,
    [isLive, vodInteraction, t],
  );

  const renderPreviousInteractionButton = useCallback(
    () =>
      !isLive && vodInteraction?.hasMoments ? (
        <LiveFeatureButton
          label={t("player.interaction.previous")}
          icon={<SkipBack size={18} color={colors.textSecondary} />}
          isActive={false}
          onPress={vodInteraction.onPreviousInteraction}
        />
      ) : null,
    [isLive, vodInteraction, t],
  );

  const renderNextInteractionButton = useCallback(
    () =>
      !isLive && vodInteraction?.hasMoments ? (
        <LiveFeatureButton
          label={t("player.interaction.next")}
          icon={<SkipForward size={18} color={colors.textSecondary} />}
          isActive={false}
          onPress={vodInteraction.onNextInteraction}
        />
      ) : null,
    [isLive, vodInteraction, t],
  );

  return useMemo(
    () => ({
      renderWatchPartyButton,
      renderSubtitleControls,
      renderLiveSubtitleControls,
      renderLiveSplitSubtitleControls,
      renderDubbingControls,
      renderRecordButton,
      renderCastButton,
      renderAirPlayButton,
      renderChromecastButton,
      renderPiPButton,
      renderChannelChatButton,
      renderLiveTriviaButton,
      renderCatchUpButton,
      renderInteractButton,
      renderPreviousInteractionButton,
      renderNextInteractionButton,
    }),
    [
      renderWatchPartyButton,
      renderSubtitleControls,
      renderLiveSubtitleControls,
      renderLiveSplitSubtitleControls,
      renderDubbingControls,
      renderRecordButton,
      renderCastButton,
      renderAirPlayButton,
      renderChromecastButton,
      renderPiPButton,
      renderChannelChatButton,
      renderLiveTriviaButton,
      renderCatchUpButton,
      renderInteractButton,
      renderPreviousInteractionButton,
      renderNextInteractionButton,
    ],
  );
}
