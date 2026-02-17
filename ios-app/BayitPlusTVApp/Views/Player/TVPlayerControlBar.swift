import BayitDesignSystem
import BayitLocalization
import BayitMedia
import SwiftUI

/// Horizontal row of icon buttons at the bottom of the tvOS player screen.
/// Provides quick access to subtitles, dubbing, chapters, audio tracks, speed,
/// and live-specific features (catch-up, scene search, channel chat).
/// Each button is focusable with card styling for natural Siri Remote navigation.
struct TVPlayerControlBar: View {
    @Environment(LocalizationManager.self) private var localization
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

                    // Flag badges (contained within icon area)
                    if isSplitEnabled, splitLanguages.count == 2 {
                        HStack(spacing: 2) {
                            Text(flag(for: splitLanguages[0]))
                                .font(.system(size: 12))
                            Text(flag(for: splitLanguages[1]))
                                .font(.system(size: 12))
                        }
                        .padding(.horizontal, 3)
                        .padding(.vertical, 1)
                        .background(Color.black.opacity(0.7))
                        .clipShape(Capsule())
                        .offset(x: 18, y: -12)
                    } else if let lang = selectedSubtitleLanguage {
                        Text(flag(for: lang))
                            .font(.system(size: 14))
                            .padding(3)
                            .background(Color.black.opacity(0.7))
                            .clipShape(Circle())
                            .offset(x: 16, y: -12)
                    }
                }

                Text(localization.t("subtitles.title"))
                    .font(.system(size: TVDesignTokens.FontSize.sm, weight: .medium))
                    .foregroundStyle(hasActiveSubtitles
                        ? DesignTokens.Primary.p400
                        : DesignTokens.Text.primary)
            }
            .frame(width: 120, height: 80)
            .clipped()
        }
        .buttonStyle(PlayerControlButtonStyle())
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
        .buttonStyle(PlayerControlButtonStyle())
        .accessibilityLabel(label)
    }
}

// MARK: - Player Control Button Style

/// Custom button style for player dock items.
/// Transparent background with dark purple border on focus,
/// replacing the default `.card` style that adds an opaque background.
private struct PlayerControlButtonStyle: ButtonStyle {
    @Environment(\.isFocused) private var isFocused

    func makeBody(configuration: Configuration) -> some View {
        PlayerControlButtonContent(
            configuration: configuration,
            isPressed: configuration.isPressed
        )
    }
}

private struct PlayerControlButtonContent: View {
    let configuration: ButtonStyleConfiguration
    let isPressed: Bool
    @Environment(\.isFocused) private var isFocused

    var body: some View {
        configuration.label
            .padding(TVDesignTokens.Spacing.sm)
            .background(
                RoundedRectangle(cornerRadius: TVDesignTokens.Radius.card)
                    .fill(Color.clear)
            )
            .overlay(
                RoundedRectangle(cornerRadius: TVDesignTokens.Radius.card)
                    .stroke(
                        isFocused ? DesignTokens.Glass.borderFocus : Color.clear,
                        lineWidth: TVDesignTokens.Focus.ringWidth
                    )
            )
            .scaleEffect(isFocused ? TVDesignTokens.Focus.scaleAmount : 1.0)
            .scaleEffect(isPressed ? 0.95 : 1.0)
            .shadow(
                color: isFocused
                    ? DesignTokens.Glass.purpleGlow.opacity(0.6)
                    : Color.clear,
                radius: TVDesignTokens.Focus.shadowRadius,
                x: 0,
                y: isFocused ? 8 : 0
            )
            .animation(
                .spring(duration: TVDesignTokens.Focus.animationDuration, bounce: 0.2),
                value: isFocused
            )
            .animation(.easeInOut(duration: 0.1), value: isPressed)
    }
}
