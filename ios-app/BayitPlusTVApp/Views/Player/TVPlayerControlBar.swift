import BayitDesignSystem
import BayitMedia
import SwiftUI

/// Horizontal row of icon buttons at the bottom of the tvOS player screen.
/// Provides quick access to subtitles, dubbing, chapters, audio tracks, speed,
/// and live-specific features (catch-up, scene search, channel chat).
/// Each button is focusable with card styling for natural Siri Remote navigation.
struct TVPlayerControlBar: View {
    let contentType: MediaContentType
    let onSubtitles: () -> Void
    let onDubbing: () -> Void
    let onChapters: () -> Void
    let onAudioTracks: () -> Void
    let onSpeed: () -> Void
    var onCatchUp: (() -> Void)?
    var onSceneSearch: (() -> Void)?
    var onChat: (() -> Void)?

    var body: some View {
        VStack {
            Spacer()
            HStack(spacing: TVDesignTokens.Spacing.focusGap) {
                controlButton(icon: "captions.bubble", label: "Subtitles", action: onSubtitles)

                if contentType == .liveTV {
                    controlButton(icon: "waveform", label: "Dubbing", action: onDubbing)
                }

                controlButton(icon: "list.bullet", label: "Chapters", action: onChapters)
                controlButton(icon: "speaker.wave.2", label: "Audio", action: onAudioTracks)
                controlButton(icon: "gauge.medium", label: "Speed", action: onSpeed)

                if let onCatchUp {
                    controlButton(icon: "clock.arrow.circlepath", label: "Catch Up", action: onCatchUp)
                }

                if let onSceneSearch {
                    controlButton(icon: "magnifyingglass", label: "Scenes", action: onSceneSearch)
                }

                if let onChat {
                    controlButton(icon: "bubble.left.and.bubble.right", label: "Chat", action: onChat)
                }
            }
            .padding(.horizontal, TVDesignTokens.Spacing.xl)
            .padding(.vertical, TVDesignTokens.Spacing.lg)
            .background(DesignTokens.Glass.bgStrong)
            .cornerRadius(TVDesignTokens.Radius.lg)
        }
        .padding(.bottom, TVDesignTokens.Spacing.xl)
        .transition(.move(edge: .bottom).combined(with: .opacity))
        .focusSection()
    }

    // MARK: - Control Button

    private func controlButton(icon: String, label: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            VStack(spacing: TVDesignTokens.Spacing.xs) {
                Image(systemName: icon)
                    .font(.system(size: 28))
                Text(label)
                    .font(.system(size: TVDesignTokens.FontSize.xs))
            }
            .foregroundStyle(DesignTokens.Text.primary)
            .frame(
                minWidth: TVDesignTokens.MinSize.focusableWidth,
                minHeight: TVDesignTokens.MinSize.focusableHeight
            )
        }
        .buttonStyle(.card)
        .accessibilityLabel(label)
    }
}
