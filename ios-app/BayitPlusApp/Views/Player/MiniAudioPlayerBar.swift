import BayitDesignSystem
import SwiftUI

/// Compact glass-styled bar that appears above the tab bar when inline audio is playing.
///
/// Displays artwork thumbnail, title/subtitle, play/pause, and close controls.
/// Hides when the fullscreen player is active.
struct MiniAudioPlayerBar: View {
    @Environment(AudioPlaybackManager.self) private var audioManager
    @Environment(NavigationCoordinator.self) private var coordinator

    var body: some View {
        if audioManager.isActive, coordinator.fullscreenRoute == nil {
            barContent
                .transition(.asymmetric(
                    insertion: .move(edge: .bottom).combined(with: .opacity),
                    removal: .move(edge: .bottom).combined(with: .opacity)
                ))
        }
    }

    private var barContent: some View {
        HStack(spacing: DesignTokens.Spacing.md) {
            artworkThumbnail
                .frame(width: 40, height: 40)
                .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))

            VStack(alignment: .leading, spacing: 2) {
                Text(audioManager.title ?? "")
                    .font(.system(size: DesignTokens.FontSize.sm, weight: .semibold))
                    .foregroundColor(DesignTokens.Text.primary)
                    .lineLimit(1)

                if let subtitle = audioManager.subtitle {
                    Text(subtitle)
                        .font(.system(size: DesignTokens.FontSize.xs))
                        .foregroundColor(DesignTokens.Text.muted)
                        .lineLimit(1)
                }
            }

            Spacer()

            if audioManager.isLoading {
                ProgressView()
                    .tint(DesignTokens.Primary.default)
                    .frame(width: 32, height: 32)
            } else {
                Button {
                    audioManager.togglePlayPause()
                } label: {
                    Image(systemName: audioManager.isPlaying ? "pause.fill" : "play.fill")
                        .font(.system(size: 20, weight: .medium))
                        .foregroundColor(DesignTokens.Text.primary)
                        .frame(width: 32, height: 32)
                }
                .accessibilityLabel(audioManager.isPlaying ? "Pause" : "Play")
            }

            Button {
                audioManager.stop()
            } label: {
                Image(systemName: "xmark")
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(DesignTokens.Text.muted)
                    .frame(width: 28, height: 28)
            }
            .accessibilityLabel("Stop audio")
        }
        .padding(.horizontal, DesignTokens.Spacing.md)
        .padding(.vertical, DesignTokens.Spacing.sm)
        .glassCard()
        .padding(.horizontal, DesignTokens.Spacing.base)
    }

    @ViewBuilder
    private var artworkThumbnail: some View {
        if let url = audioManager.artworkURL {
            CachedAsyncImage(url: url) {
                artworkPlaceholder
            }
        } else {
            artworkPlaceholder
        }
    }

    private var artworkPlaceholder: some View {
        ZStack {
            DesignTokens.Glass.bgMedium
            Image(systemName: audioManager.activeContentType == .radio ? "radio" : "headphones")
                .font(.system(size: 16))
                .foregroundColor(DesignTokens.Text.muted)
        }
    }
}
