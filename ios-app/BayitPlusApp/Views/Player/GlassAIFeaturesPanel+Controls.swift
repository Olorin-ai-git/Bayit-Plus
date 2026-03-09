#if os(iOS)
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    // MARK: - Control Buttons & State

    extension GlassAIFeaturesPanel {
        var liveTranslateButton: some View {
            GlassLiveControlButton(
                icon: "captions.bubble",
                activeIcon: "captions.bubble.fill",
                label: localization.t("subtitles.liveTranslate"),
                state: subtitleControlState,
                onTap: onSubtitlesTap
            )
        }

        var splitSubtitlesButton: some View {
            GlassLiveControlButton(
                icon: "square.split.2x1",
                activeIcon: "square.split.2x1.fill",
                label: localization.t("subtitles.splitScreen.title"),
                state: splitSubtitleControlState,
                onTap: onSplitSubtitlesTap
            )
        }

        var splitSubtitleControlState: GlassLiveControlButton.ControlState {
            if isLiveContent {
                if !isSplitLanguagesReady { return .disabled }
                return isSplitEnabled ? .enabled : .idle
            }
            return isSplitEnabled ? .enabled : .idle
        }

        var liveDubbingButton: some View {
            GlassLiveControlButton(
                icon: "waveform",
                activeIcon: "waveform.fill",
                label: localization.t("dubbing.title"),
                state: dubbingControlState,
                onTap: onDubbingTap
            )
            .featureTooltip(
                featureKey: "live_dubbing",
                titleKey: "tooltip.dubbing.title",
                descriptionKey: "tooltip.dubbing.description",
                arrowDirection: .bottom,
                tooltipManager: tooltipManager
            )
        }

        var liveTriviaButton: some View {
            GlassLiveControlButton(
                icon: "lightbulb",
                activeIcon: "lightbulb.fill",
                label: localization.t("player.liveTrivia"),
                state: triviaControlState,
                onTap: onTriviaTap
            )
        }

        var subtitleControlState: GlassLiveControlButton.ControlState {
            if isSubtitlesPremiumLocked { return .premiumLocked }
            if isSubtitlesConnecting { return .connecting }
            if isSubtitlesEnabled { return .enabled }
            return .idle
        }

        var dubbingControlState: GlassLiveControlButton.ControlState {
            if isDubbingPremiumLocked { return .premiumLocked }
            if isDubbingConnecting { return .connecting }
            if isDubbingEnabled { return .enabled }
            return .idle
        }

        var triviaControlState: GlassLiveControlButton.ControlState {
            if isTriviaConnecting { return .connecting }
            if isTriviaEnabled { return .enabled }
            return .idle
        }

        var panelBackground: some View {
            ZStack {
                Color(hex: 0x111122).opacity(0.95)
                VisualEffectBlur()
                    .opacity(0.3)
            }
        }
    }
#endif
