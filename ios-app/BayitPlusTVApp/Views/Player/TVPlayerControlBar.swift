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

    // Subtitle state for flag display
    var selectedSubtitleLanguage: String? = nil
    var isSplitEnabled: Bool = false
    var splitLanguages: [String] = []

    var body: some View {
        HStack(spacing: TVDesignTokens.Spacing.focusGap) {
            subtitleButton

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
        .padding(.horizontal, TVDesignTokens.Spacing.xxl)
        .padding(.vertical, TVDesignTokens.Spacing.lg)
        .background {
            RoundedRectangle(cornerRadius: TVDesignTokens.Radius.xl)
                .fill(.ultraThinMaterial)
                .environment(\.colorScheme, .dark)
        }
        .overlay(
            RoundedRectangle(cornerRadius: TVDesignTokens.Radius.xl)
                .stroke(Color.white.opacity(0.1), lineWidth: 1)
        )
        .focusSection()
    }

    // MARK: - Subtitle Button with Flags

    private var subtitleButton: some View {
        Button(action: onSubtitles) {
            VStack(spacing: TVDesignTokens.Spacing.sm) {
                ZStack {
                    Image(systemName: "captions.bubble")
                        .font(.system(size: 32, weight: .medium))
                        .foregroundStyle(hasActiveSubtitles
                            ? DesignTokens.Primary.p400
                            : DesignTokens.Text.primary)

                    // Flag badges
                    if isSplitEnabled, splitLanguages.count == 2 {
                        HStack(spacing: 2) {
                            Text(flag(for: splitLanguages[0]))
                                .font(.system(size: 14))
                            Text(flag(for: splitLanguages[1]))
                                .font(.system(size: 14))
                        }
                        .padding(.horizontal, 4)
                        .padding(.vertical, 2)
                        .background(Color.black.opacity(0.7))
                        .clipShape(Capsule())
                        .offset(x: 24, y: -14)
                    } else if let lang = selectedSubtitleLanguage {
                        Text(flag(for: lang))
                            .font(.system(size: 16))
                            .padding(4)
                            .background(Color.black.opacity(0.7))
                            .clipShape(Circle())
                            .offset(x: 22, y: -14)
                    }
                }

                Text("Subtitles")
                    .font(.system(size: TVDesignTokens.FontSize.sm, weight: .medium))
                    .foregroundStyle(hasActiveSubtitles
                        ? DesignTokens.Primary.p400
                        : DesignTokens.Text.primary)
            }
            .frame(width: 120, height: 80)
        }
        .buttonStyle(.card)
        .accessibilityLabel(subtitleAccessibilityLabel)
    }

    private var hasActiveSubtitles: Bool {
        selectedSubtitleLanguage != nil || isSplitEnabled
    }

    private var subtitleAccessibilityLabel: String {
        if isSplitEnabled, splitLanguages.count == 2 {
            return "Subtitles: Split \(splitLanguages[0]) and \(splitLanguages[1])"
        }
        if let lang = selectedSubtitleLanguage {
            return "Subtitles: \(SubtitleLanguages.info(for: lang)?.name ?? lang)"
        }
        return "Subtitles: Off"
    }

    private func flag(for code: String) -> String {
        SubtitleLanguages.info(for: code)?.emojiFlag ?? code
    }

    // MARK: - Control Button

    private func controlButton(icon: String, label: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            VStack(spacing: TVDesignTokens.Spacing.sm) {
                Image(systemName: icon)
                    .font(.system(size: 32, weight: .medium))
                Text(label)
                    .font(.system(size: TVDesignTokens.FontSize.sm, weight: .medium))
            }
            .foregroundStyle(DesignTokens.Text.primary)
            .frame(width: 120, height: 80)
        }
        .buttonStyle(.card)
        .accessibilityLabel(label)
    }
}
