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
        VStack(spacing: DesignTokens.Spacing.md) {
            closeButton

            artworkThumbnail
                .frame(width: 120, height: 120)
                .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
                .shadow(color: .black.opacity(0.3), radius: 10, x: 0, y: 4)

            VStack(spacing: 4) {
                Text(audioManager.title ?? "")
                    .font(.system(size: DesignTokens.FontSize.base, weight: .semibold))
                    .foregroundColor(DesignTokens.Text.primary)
                    .lineLimit(1)

                if let subtitle = audioManager.subtitle {
                    Text(subtitle)
                        .font(.system(size: DesignTokens.FontSize.sm))
                        .foregroundColor(DesignTokens.Text.muted)
                        .lineLimit(1)
                }
            }

            progressBar

            playbackControls
        }
        .padding(DesignTokens.Spacing.lg)
        .glassCard()
        .padding(.horizontal, DesignTokens.Spacing.base)
    }

    private var closeButton: some View {
        HStack {
            Button {
                audioManager.stop()
            } label: {
                Image(systemName: "xmark")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(DesignTokens.Text.muted)
                    .frame(width: 30, height: 30)
            }
            .accessibilityLabel("Close player")

            Spacer()
        }
    }

    private var progressBar: some View {
        VStack(spacing: 6) {
            GeometryReader { geometry in
                ZStack(alignment: .leading) {
                    Capsule()
                        .fill(DesignTokens.Glass.bgMedium)
                        .frame(height: 4)

                    if audioManager.duration > 0 {
                        Capsule()
                            .fill(DesignTokens.Primary.default)
                            .frame(
                                width: geometry.size.width * CGFloat(audioManager.currentTime / audioManager.duration),
                                height: 4
                            )
                    }
                }
            }
            .frame(height: 4)

            HStack {
                Text(formatTime(audioManager.currentTime))
                    .font(.system(size: DesignTokens.FontSize.xs))
                    .foregroundColor(DesignTokens.Text.muted)
                    .monospacedDigit()

                Spacer()

                Text("-\(formatTime(max(0, audioManager.duration - audioManager.currentTime)))")
                    .font(.system(size: DesignTokens.FontSize.xs))
                    .foregroundColor(DesignTokens.Text.muted)
                    .monospacedDigit()
            }
        }
    }

    private var playbackControls: some View {
        HStack(spacing: DesignTokens.Spacing.xl) {
            if audioManager.isLoading {
                ProgressView()
                    .tint(DesignTokens.Primary.default)
                    .frame(width: 44, height: 44)
            } else {
                Button {
                    audioManager.skipBackward(seconds: 15)
                } label: {
                    Image(systemName: "gobackward.15")
                        .font(.system(size: 32, weight: .light))
                        .foregroundColor(DesignTokens.Text.primary)
                        .frame(width: 44, height: 44)
                }
                .accessibilityLabel("Skip backward 15 seconds")

                Button {
                    audioManager.togglePlayPause()
                } label: {
                    Image(systemName: audioManager.isPlaying ? "pause.fill" : "play.fill")
                        .font(.system(size: 36, weight: .semibold))
                        .foregroundColor(DesignTokens.Text.primary)
                        .frame(width: 60, height: 60)
                }
                .accessibilityLabel(audioManager.isPlaying ? "Pause" : "Play")

                Button {
                    audioManager.skipForward(seconds: 30)
                } label: {
                    Image(systemName: "goforward.30")
                        .font(.system(size: 32, weight: .light))
                        .foregroundColor(DesignTokens.Text.primary)
                        .frame(width: 44, height: 44)
                }
                .accessibilityLabel("Skip forward 30 seconds")
            }
        }
        .frame(maxWidth: .infinity)
    }

    private func formatTime(_ time: TimeInterval) -> String {
        let totalSeconds = Int(time)
        let minutes = totalSeconds / 60
        let seconds = totalSeconds % 60
        return String(format: "%d:%02d", minutes, seconds)
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
