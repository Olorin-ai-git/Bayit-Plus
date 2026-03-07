import BayitDesignSystem
import BayitLocalization
import BayitMedia
import SwiftUI

/// Horizontal row of icon buttons at the bottom of the tvOS player screen.
/// Provides quick access to subtitles, dubbing, chapters, audio tracks, speed,
/// and live-specific features (catch-up, scene search, channel chat).
/// Each button is focusable with card styling for natural Siri Remote navigation.
struct TVPlayerControlBar: View {
    @Environment(LocalizationManager.self) var localization
    let contentType: MediaContentType
    let onSubtitles: () -> Void
    let onDubbing: () -> Void
    let onChapters: () -> Void
    var onStartOver: (() -> Void)?
    let onAudioTracks: () -> Void
    let onSpeed: () -> Void
    var onCatchUp: (() -> Void)?
    var onSceneSearch: (() -> Void)?
    var onChat: (() -> Void)?
    var onTalk: (() -> Void)?
    var onVocabulary: (() -> Void)?
    var onInteractiveSubtitles: (() -> Void)?
    var onSharePlay: (() -> Void)?
    var onPreviousInteraction: (() -> Void)?
    var onNextInteraction: (() -> Void)?
    var isInteractiveSubtitlesEnabled: Bool = false

    // Subtitle state for flag display
    var selectedSubtitleLanguage: String? = nil
    var isSplitEnabled: Bool = false
    var splitLanguages: [String] = []

    var body: some View {
        HStack(spacing: TVDesignTokens.Spacing.focusGap) {
            subtitleButton

            if contentType == .liveTV {
                controlButton(icon: "waveform", label: localization.t("player.dubbing"), action: onDubbing)
            }

            controlButton(icon: "list.bullet", label: localization.t("player.chapters"), action: onChapters)

            if let onStartOver {
                controlButton(
                    icon: "arrow.counterclockwise",
                    label: localization.t("player.startOver"),
                    action: onStartOver
                )
            }

            controlButton(icon: "speaker.wave.2", label: localization.t("player.audio"), action: onAudioTracks)
            controlButton(icon: "gauge.medium", label: localization.t("player.speed"), action: onSpeed)

            if let onCatchUp {
                controlButton(icon: "clock.arrow.circlepath", label: localization.t("player.catchUp"), action: onCatchUp)
            }

            if let onSceneSearch {
                controlButton(icon: "magnifyingglass", label: localization.t("player.scenes"), action: onSceneSearch)
            }

            if let onChat {
                controlButton(icon: "bubble.left.and.bubble.right", label: localization.t("player.chat"), action: onChat)
            }

            if let onInteractiveSubtitles {
                controlButton(
                    icon: isInteractiveSubtitlesEnabled ? "character.textbox" : "textformat.abc",
                    label: localization.t("player.interactive.toggle"),
                    action: onInteractiveSubtitles
                )
            }

            if let onVocabulary {
                controlButton(
                    icon: "book.closed",
                    label: localization.t("vocabulary.title"),
                    action: onVocabulary
                )
            }

            if let onSharePlay {
                controlButton(
                    icon: "shareplay",
                    label: localization.t("sharePlay.title"),
                    action: onSharePlay
                )
            }

            if let onTalk {
                controlButton(
                    icon: "bubble.left.and.bubble.right",
                    label: localization.t("player.pauseAsk.title"),
                    action: onTalk
                )
            }

            if let onPreviousInteraction {
                controlButton(
                    icon: "backward.end.fill",
                    label: localization.t("player.interaction.previous"),
                    action: onPreviousInteraction
                )
            }

            if let onNextInteraction {
                controlButton(
                    icon: "forward.end.fill",
                    label: localization.t("player.interaction.next"),
                    action: onNextInteraction
                )
            }
        }
        .padding(.horizontal, TVDesignTokens.Spacing.xxl)
        .padding(.vertical, TVDesignTokens.Spacing.lg)
        .background {
            RoundedRectangle(cornerRadius: TVDesignTokens.Radius.xl)
                .fill(Color.black.opacity(0.35))
                .background(
                    RoundedRectangle(cornerRadius: TVDesignTokens.Radius.xl)
                        .fill(.ultraThinMaterial)
                        .opacity(0.4)
                        .environment(\.colorScheme, .dark)
                )
        }
        .overlay(
            RoundedRectangle(cornerRadius: TVDesignTokens.Radius.xl)
                .stroke(Color.white.opacity(0.06), lineWidth: 1)
        )
        .focusSection()
    }
}
