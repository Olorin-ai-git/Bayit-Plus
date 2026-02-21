import BayitDesignSystem
import SwiftUI

/// Extension on MiniAudioPlayerBar providing playback controls,
/// progress bar, and artwork thumbnail.
extension MiniAudioPlayerBar {
    // MARK: - Progress Bar

    var progressBar: some View {
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

    // MARK: - Playback Controls

    var playbackControls: some View {
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

    // MARK: - Helpers

    func formatTime(_ time: TimeInterval) -> String {
        let totalSeconds = Int(time)
        let minutes = totalSeconds / 60
        let seconds = totalSeconds % 60
        return String(format: "%d:%02d", minutes, seconds)
    }

    @ViewBuilder
    var artworkThumbnail: some View {
        if let url = audioManager.artworkURL {
            CachedAsyncImage(url: url) {
                artworkPlaceholder
            }
        } else {
            artworkPlaceholder
        }
    }

    var artworkPlaceholder: some View {
        ZStack {
            DesignTokens.Glass.bgMedium
            Image(systemName: audioManager.activeContentType == .radio ? "radio" : "headphones")
                .font(.system(size: 16))
                .foregroundColor(DesignTokens.Text.muted)
        }
    }
}
