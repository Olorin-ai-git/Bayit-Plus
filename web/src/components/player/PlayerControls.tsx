/**
 * PlayerControls Component
 * Main control bar with play/pause, skip, volume, and action buttons
 */

import { View } from "react-native";
import { isTV } from "@bayit/shared/utils/platform";
import { useDirection } from "@/hooks/useDirection";
import {
  PlayerState,
  PlayerControls as PlayerControlsType,
  Chapter,
} from "./types";
import {
  LeftControls,
  RightControls,
  controlStyles as styles,
} from "./controls";

interface PlayerControlsProps {
  state: PlayerState;
  controls: PlayerControlsType;
  isLive?: boolean;
  liveSubtitleLang?: string;
  availableLanguages?: string[];
  onLanguageChange?: (lang: string) => void;
  isDubbingActive?: boolean;
  showChaptersPanel?: boolean;
  showSceneSearchPanel?: boolean;
  showSettings?: boolean;
  hasChapters?: boolean;
  hasSceneSearch?: boolean;
  chapters?: Chapter[];
  onChaptersPanelToggle?: () => void;
  onSceneSearchToggle?: () => void;
  onSettingsToggle?: () => void;
  renderWatchPartyButton?: () => React.ReactNode;
  renderSubtitleControls?: () => React.ReactNode;
  renderLiveSubtitleControls?: () => React.ReactNode;
  renderLiveSplitSubtitleControls?: () => React.ReactNode;
  renderDubbingControls?: () => React.ReactNode;
  renderRecordButton?: () => React.ReactNode;
  renderCastButton?: () => React.ReactNode;
  renderAirPlayButton?: () => React.ReactNode;
  renderChromecastButton?: () => React.ReactNode;
  renderPiPButton?: () => React.ReactNode;
  renderChannelChatButton?: () => React.ReactNode;
  renderLiveTriviaButton?: () => React.ReactNode;
  renderCatchUpButton?: () => React.ReactNode;
  renderInteractButton?: () => React.ReactNode;
  renderPreviousInteractionButton?: () => React.ReactNode;
  renderNextInteractionButton?: () => React.ReactNode;
  liveFeatureError?: string | null;
  onDismissLiveFeatureError?: () => void;
}

export default function PlayerControls({
  state,
  controls,
  isLive = false,
  liveSubtitleLang = "en",
  availableLanguages,
  onLanguageChange,
  isDubbingActive = false,
  showChaptersPanel = false,
  showSceneSearchPanel = false,
  showSettings = false,
  hasChapters = false,
  hasSceneSearch = false,
  chapters = [],
  onChaptersPanelToggle,
  onSceneSearchToggle,
  onSettingsToggle,
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
  liveFeatureError,
  onDismissLiveFeatureError,
}: PlayerControlsProps) {
  const { isRTL } = useDirection();

  return (
    <View
      style={[
        styles.controlsRow,
        { flexDirection: isRTL ? "row-reverse" : "row" },
      ]}
    >
      <LeftControls
        state={state}
        controls={controls}
        isLive={isLive}
        hasChapters={hasChapters}
        chapters={chapters}
      />
      <RightControls
        state={state}
        toggleFullscreen={controls.toggleFullscreen}
        isLive={isLive}
        liveSubtitleLang={liveSubtitleLang}
        availableLanguages={availableLanguages}
        onLanguageChange={onLanguageChange}
        isDubbingActive={isDubbingActive}
        showChaptersPanel={showChaptersPanel}
        showSceneSearchPanel={showSceneSearchPanel}
        showSettings={showSettings}
        hasChapters={hasChapters}
        hasSceneSearch={hasSceneSearch}
        onChaptersPanelToggle={onChaptersPanelToggle}
        onSceneSearchToggle={onSceneSearchToggle}
        onSettingsToggle={onSettingsToggle}
        renderWatchPartyButton={renderWatchPartyButton}
        renderCastButton={renderCastButton}
        renderAirPlayButton={renderAirPlayButton}
        renderChromecastButton={renderChromecastButton}
        renderPiPButton={renderPiPButton}
        renderSubtitleControls={renderSubtitleControls}
        renderLiveSubtitleControls={renderLiveSubtitleControls}
        renderLiveSplitSubtitleControls={renderLiveSplitSubtitleControls}
        renderDubbingControls={renderDubbingControls}
        renderRecordButton={renderRecordButton}
        renderChannelChatButton={renderChannelChatButton}
        renderLiveTriviaButton={renderLiveTriviaButton}
        renderCatchUpButton={renderCatchUpButton}
        renderInteractButton={renderInteractButton}
        renderPreviousInteractionButton={renderPreviousInteractionButton}
        renderNextInteractionButton={renderNextInteractionButton}
        liveFeatureError={liveFeatureError}
        onDismissLiveFeatureError={onDismissLiveFeatureError}
      />
    </View>
  );
}
