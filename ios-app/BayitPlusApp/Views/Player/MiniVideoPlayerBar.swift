import BayitDesignSystem
import BayitLocalization
import BayitMedia
import SwiftUI

/// Compact floating bar shown when the video player is minimized.
///
/// Displays thumbnail, title, progress, play/pause and close controls.
/// Tap the bar to restore the fullscreen player.
struct MiniVideoPlayerBar: View {
    @Environment(NavigationCoordinator.self) private var coordinator
    @Environment(MediaPlayer.self) private var player
    @Environment(LocalizationManager.self) private var localization

    var body: some View {
        if coordinator.minimizedRoute != nil, coordinator.fullscreenRoute == nil {
            barContent
                .transition(.asymmetric(
                    insertion: .move(edge: .bottom).combined(with: .opacity),
                    removal: .move(edge: .bottom).combined(with: .opacity)
                ))
        }
    }

    private var barContent: some View {
        VStack(spacing: 0) {
            progressIndicator
            HStack(spacing: DesignTokens.Spacing.md) {
                thumbnail
                titleSection
                Spacer()
                playbackControls
            }
            .padding(.horizontal, DesignTokens.Spacing.md)
            .padding(.vertical, DesignTokens.Spacing.sm)
        }
        .background(
            ZStack {
                Color.black.opacity(0.85)
                VisualEffectBlur(style: .systemUltraThinMaterialDark)
            }
        )
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.lg))
        .overlay(
            RoundedRectangle(cornerRadius: DesignTokens.Radius.lg)
                .stroke(DesignTokens.Glass.border.opacity(0.3), lineWidth: 1)
        )
        .shadow(color: .black.opacity(0.5), radius: 16, x: 0, y: 8)
        .padding(.horizontal, DesignTokens.Spacing.md)
        .contentShape(Rectangle())
        .onTapGesture { coordinator.restoreMinimizedPlayer() }
    }

    // MARK: - Progress

    private var progressIndicator: some View {
        GeometryReader { geometry in
            ZStack(alignment: .leading) {
                Rectangle()
                    .fill(DesignTokens.Glass.bgMedium)

                if player.duration > 0 {
                    Rectangle()
                        .fill(DesignTokens.Primary.default)
                        .frame(width: geometry.size.width * progressFraction)
                }
            }
        }
        .frame(height: 3)
        .clipShape(RoundedRectangle(cornerRadius: 1.5))
    }

    private var progressFraction: CGFloat {
        guard player.duration > 0 else { return 0 }
        return CGFloat(min(player.currentTime / player.duration, 1.0))
    }

    // MARK: - Thumbnail

    private var thumbnail: some View {
        Group {
            if let urlString = coordinator.minimizedThumbnail,
               let url = URL(string: urlString)
            {
                CachedAsyncImage(url: url) { thumbnailPlaceholder }
            } else {
                thumbnailPlaceholder
            }
        }
        .frame(width: 64, height: 36)
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))
    }

    private var thumbnailPlaceholder: some View {
        ZStack {
            DesignTokens.Glass.bgMedium
            Image(systemName: "play.rectangle.fill")
                .font(.system(size: 14))
                .foregroundColor(DesignTokens.Text.muted)
        }
    }

    // MARK: - Title

    private var titleSection: some View {
        VStack(alignment: .leading, spacing: 2) {
            if let title = coordinator.minimizedTitle {
                Text(title)
                    .font(.system(size: DesignTokens.FontSize.sm, weight: .semibold))
                    .foregroundColor(DesignTokens.Text.primary)
                    .lineLimit(1)
            }

            Text(timeLabel)
                .font(.system(size: DesignTokens.FontSize.xs))
                .foregroundColor(DesignTokens.Text.muted)
                .monospacedDigit()
        }
    }

    private var timeLabel: String {
        guard player.duration > 0 else { return "" }
        return "\(formatTime(player.currentTime)) / \(formatTime(player.duration))"
    }

    // MARK: - Controls

    private var playbackControls: some View {
        HStack(spacing: DesignTokens.Spacing.md) {
            Button {
                player.togglePlayPause()
            } label: {
                Image(systemName: player.rate > 0 ? "pause.fill" : "play.fill")
                    .font(.system(size: 20, weight: .semibold))
                    .foregroundColor(DesignTokens.Text.primary)
                    .frame(width: 36, height: 36)
            }
            .accessibilityLabel(player.rate > 0 ? "Pause" : "Play")

            Button {
                player.stop()
                coordinator.closeMinimizedPlayer()
            } label: {
                Image(systemName: "xmark")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(DesignTokens.Text.muted)
                    .frame(width: 36, height: 36)
            }
            .accessibilityLabel(localization.t("miniPlayer.closePlayer"))
        }
    }

    // MARK: - Helpers

    private func formatTime(_ time: TimeInterval) -> String {
        let totalSeconds = Int(time)
        let hours = totalSeconds / 3600
        let minutes = (totalSeconds % 3600) / 60
        let seconds = totalSeconds % 60
        if hours > 0 {
            return String(format: "%d:%02d:%02d", hours, minutes, seconds)
        }
        return String(format: "%d:%02d", minutes, seconds)
    }
}
