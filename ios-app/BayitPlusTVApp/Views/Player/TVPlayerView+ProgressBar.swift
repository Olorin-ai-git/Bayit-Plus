import BayitDesignSystem
import BayitMedia
import SwiftUI

extension TVPlayerView {
    // MARK: - Progress Bar

    var playerProgressBar: some View {
        VStack(spacing: TVDesignTokens.Spacing.xs) {
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 3)
                        .fill(Color.white.opacity(0.2))
                        .frame(height: 6)

                    RoundedRectangle(cornerRadius: 3)
                        .fill(Color.white.opacity(0.3))
                        .frame(width: geo.size.width * bufferedFraction, height: 6)

                    RoundedRectangle(cornerRadius: 3)
                        .fill(DesignTokens.Primary.p400)
                        .frame(
                            width: geo.size.width * (state.seekPreviewPosition != nil
                                ? state.seekPreviewPosition! / max(mediaPlayer.duration, 1)
                                : progressFraction),
                            height: 6
                        )

                    if state.seekPreviewPosition != nil {
                        Circle()
                            .fill(DesignTokens.Primary.p300)
                            .frame(width: 12, height: 12)
                            .offset(x: geo.size.width * (state.seekPreviewPosition! / max(mediaPlayer.duration, 1)) - 6)
                    }
                }
            }
            // Expanded 44pt touch target keeps the 6pt visual track centered.
            // The Siri Remote pan overlay covers this full area for continuous drag.
            .frame(height: 6)
            .padding(.vertical, 19)
            .overlay {
                TVSiriRemoteSeekBar(
                    duration: mediaPlayer.duration,
                    currentTime: state.seekPreviewPosition ?? mediaPlayer.currentTime,
                    onScrubChanged: { target in
                        resetOverlayTimer()
                        state.seekPreviewPosition = target
                    },
                    onScrubEnded: {
                        guard let target = state.seekPreviewPosition else { return }
                        Task {
                            await mediaPlayer.seek(to: target)
                            state.seekPreviewPosition = nil
                        }
                    }
                )
            }
            .focusable()
            .focusEffectDisabled()
            .onMoveCommand { direction in
                resetOverlayTimer()
                let current = state.seekPreviewPosition ?? mediaPlayer.currentTime
                switch direction {
                case .left:
                    let target = max(0, current - 10)
                    state.seekPreviewPosition = target
                    Task {
                        await mediaPlayer.seek(to: target)
                        state.seekPreviewPosition = nil
                    }
                case .right:
                    let target = min(mediaPlayer.duration, current + 10)
                    state.seekPreviewPosition = target
                    Task {
                        await mediaPlayer.seek(to: target)
                        state.seekPreviewPosition = nil
                    }
                default:
                    break
                }
            }
            .onPlayPauseCommand {
                state.seekPreviewPosition = nil
                mediaPlayer.togglePlayPause()
                resetOverlayTimer()
            }
            .onExitCommand {
                state.seekPreviewPosition = nil
            }

            HStack {
                Text(formatTime(mediaPlayer.currentTime))
                    .font(.system(size: TVDesignTokens.FontSize.sm).monospacedDigit())
                    .foregroundStyle(DesignTokens.Text.secondary)

                Spacer()

                if mediaPlayer.duration > 0 {
                    Text("-\(formatTime(mediaPlayer.duration - mediaPlayer.currentTime))")
                        .font(.system(size: TVDesignTokens.FontSize.sm).monospacedDigit())
                        .foregroundStyle(DesignTokens.Text.muted)
                }
            }
        }
        .padding(.horizontal, TVDesignTokens.Spacing.xxl)
        .focusSection()
    }

    // MARK: - Progress Helpers

    var progressFraction: CGFloat {
        guard mediaPlayer.duration > 0 else { return 0 }
        return min(CGFloat(mediaPlayer.currentTime / mediaPlayer.duration), 1.0)
    }

    var bufferedFraction: CGFloat {
        guard mediaPlayer.duration > 0 else { return 0 }
        return min(CGFloat(mediaPlayer.bufferedTime / mediaPlayer.duration), 1.0)
    }

    func formatTime(_ seconds: TimeInterval) -> String {
        guard seconds.isFinite, seconds >= 0 else { return "00:00" }
        let total = Int(seconds)
        let h = total / 3600
        let m = (total % 3600) / 60
        let s = total % 60
        if h > 0 {
            return String(format: "%d:%02d:%02d", h, m, s)
        }
        return String(format: "%02d:%02d", m, s)
    }
}
