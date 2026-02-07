import SwiftUI

/// Glass-styled media player transport controls.
///
/// Provides play/pause, skip forward/backward, and a timeline scrubber
/// with buffered progress indicator, matching the Bayit+ glass design system.
public struct GlassPlayerControls: View {
    let isPlaying: Bool
    let isLive: Bool
    let isSeekable: Bool
    let currentTime: TimeInterval
    let duration: TimeInterval
    let bufferedTime: TimeInterval
    let onPlayPause: () -> Void
    let onSkipForward: () -> Void
    let onSkipBackward: () -> Void
    let onSeek: (TimeInterval) -> Void

    @State private var isSeeking = false
    @State private var seekValue: Double = 0

    public init(
        isPlaying: Bool,
        isLive: Bool = false,
        isSeekable: Bool = true,
        currentTime: TimeInterval,
        duration: TimeInterval,
        bufferedTime: TimeInterval = 0,
        onPlayPause: @escaping () -> Void,
        onSkipForward: @escaping () -> Void,
        onSkipBackward: @escaping () -> Void,
        onSeek: @escaping (TimeInterval) -> Void
    ) {
        self.isPlaying = isPlaying
        self.isLive = isLive
        self.isSeekable = isSeekable
        self.currentTime = currentTime
        self.duration = duration
        self.bufferedTime = bufferedTime
        self.onPlayPause = onPlayPause
        self.onSkipForward = onSkipForward
        self.onSkipBackward = onSkipBackward
        self.onSeek = onSeek
    }

    public var body: some View {
        VStack(spacing: DesignTokens.Spacing.md) {
            if isSeekable && !isLive {
                timelineSection
            } else if isLive {
                liveIndicator
            }

            transportControls
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    // MARK: - Timeline

    private var timelineSection: some View {
        VStack(spacing: DesignTokens.Spacing.xs) {
            GlassProgressBar(
                progress: isSeeking ? seekValue : safeProgress,
                buffered: bufferedProgress,
                onSeek: { fraction in
                    isSeeking = true
                    seekValue = fraction
                },
                onSeekEnd: { fraction in
                    isSeeking = false
                    onSeek(fraction * duration)
                }
            )

            HStack {
                Text(formatTime(isSeeking ? seekValue * duration : currentTime))
                    .font(.system(size: DesignTokens.FontSize.xs))
                    .foregroundStyle(DesignTokens.Text.secondary)
                    .monospacedDigit()

                Spacer()

                Text(formatTime(duration))
                    .font(.system(size: DesignTokens.FontSize.xs))
                    .foregroundStyle(DesignTokens.Text.secondary)
                    .monospacedDigit()
            }
        }
    }

    private var liveIndicator: some View {
        HStack(spacing: DesignTokens.Spacing.xs) {
            Circle()
                .fill(DesignTokens.live)
                .frame(width: 8, height: 8)
            Text("LIVE")
                .font(.system(size: DesignTokens.FontSize.sm, weight: .bold))
                .foregroundStyle(DesignTokens.live)
        }
    }

    // MARK: - Transport

    private var transportControls: some View {
        HStack(spacing: DesignTokens.Spacing.xxl) {
            if isSeekable {
                controlButton(
                    icon: "gobackward.10",
                    size: 24,
                    action: onSkipBackward
                )
            }

            controlButton(
                icon: isPlaying ? "pause.fill" : "play.fill",
                size: 40,
                action: onPlayPause
            )

            if isSeekable {
                controlButton(
                    icon: "goforward.10",
                    size: 24,
                    action: onSkipForward
                )
            }
        }
    }

    private func controlButton(
        icon: String,
        size: CGFloat,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            Image(systemName: icon)
                .font(.system(size: size, weight: .medium))
                .foregroundStyle(.white)
                .frame(width: size + 16, height: size + 16)
                .contentShape(Rectangle())
        }
    }

    // MARK: - Helpers

    private var safeProgress: Double {
        guard duration > 0 else { return 0 }
        return min(max(currentTime / duration, 0), 1)
    }

    private var bufferedProgress: Double {
        guard duration > 0 else { return 0 }
        return min(max(bufferedTime / duration, 0), 1)
    }

    private func formatTime(_ seconds: TimeInterval) -> String {
        guard seconds.isFinite && seconds >= 0 else { return "0:00" }
        let totalSeconds = Int(seconds)
        let hours = totalSeconds / 3600
        let minutes = (totalSeconds % 3600) / 60
        let secs = totalSeconds % 60
        if hours > 0 {
            return String(format: "%d:%02d:%02d", hours, minutes, secs)
        }
        return String(format: "%d:%02d", minutes, secs)
    }
}
