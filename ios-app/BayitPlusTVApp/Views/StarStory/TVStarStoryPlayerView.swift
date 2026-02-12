import AVKit
import BayitDesignSystem
import BayitMedia
import SwiftUI

/// tvOS full-screen playback view for Star in Story episodes.
struct TVStarStoryPlayerView: View {
    @Environment(MediaPlayer.self) private var mediaPlayer
    @Environment(\.dismiss) private var dismiss

    let episodeId: String
    let hlsUrl: String
    let episodeTitle: String

    @State private var isLoading = true
    @State private var showOverlay = true
    @State private var streamError: String?

    var body: some View {
        ZStack {
            if isLoading {
                loadingView
            } else if let error = streamError {
                errorView(error)
            } else {
                TVVideoPlayerRepresentable(player: mediaPlayer.avPlayer)
                    .ignoresSafeArea()

                if showOverlay {
                    titleOverlay
                }
            }
        }
        .background(Color.black)
        .ignoresSafeArea()
        .onAppear { loadStream() }
        .onDisappear { mediaPlayer.pause() }
        .onPlayPauseCommand { mediaPlayer.togglePlayPause() }
        .onMoveCommand { direction in
            switch direction {
            case .up: showOverlay = true
            case .down: showOverlay = false
            case .left: Task { await mediaPlayer.skipBackward(seconds: 10) }
            case .right: Task { await mediaPlayer.skipForward(seconds: 10) }
            @unknown default: break
            }
        }
        .onExitCommand {
            if showOverlay {
                showOverlay = false
            } else {
                mediaPlayer.stop()
                dismiss()
            }
        }
    }

    private var titleOverlay: some View {
        VStack {
            HStack {
                VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.sm) {
                    Text("Star in Story")
                        .font(.system(size: TVDesignTokens.FontSize.base))
                        .foregroundStyle(DesignTokens.Text.muted)

                    Text(episodeTitle)
                        .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                        .foregroundStyle(DesignTokens.Text.primary)
                }
                .padding(TVDesignTokens.Spacing.xl)

                Spacer()
            }
            .background(
                LinearGradient(
                    colors: [Color.black.opacity(0.8), .clear],
                    startPoint: .top,
                    endPoint: .bottom
                )
            )

            Spacer()

            progressBar
                .padding(.horizontal, TVDesignTokens.Spacing.xxl)
                .padding(.bottom, TVDesignTokens.Spacing.xxl)
                .background(
                    LinearGradient(
                        colors: [.clear, Color.black.opacity(0.8)],
                        startPoint: .top,
                        endPoint: .bottom
                    )
                )
        }
        .transition(.opacity)
        .animation(.easeInOut(duration: 0.3), value: showOverlay)
    }

    private var progressBar: some View {
        VStack(spacing: TVDesignTokens.Spacing.xs) {
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 3)
                        .fill(Color.white.opacity(0.2))
                        .frame(height: 6)

                    RoundedRectangle(cornerRadius: 3)
                        .fill(DesignTokens.Primary.p400)
                        .frame(
                            width: geo.size.width * progressFraction,
                            height: 6
                        )
                }
            }
            .frame(height: 6)

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
    }

    private var progressFraction: CGFloat {
        guard mediaPlayer.duration > 0 else { return 0 }
        return min(CGFloat(mediaPlayer.currentTime / mediaPlayer.duration), 1.0)
    }

    private func loadStream() {
        guard let url = URL(string: hlsUrl) else {
            streamError = "Invalid episode URL"
            isLoading = false
            return
        }
        mediaPlayer.load(url: url, contentType: .vod)
        mediaPlayer.avPlayer.play()
        isLoading = false
    }

    private func formatTime(_ seconds: TimeInterval) -> String {
        guard seconds.isFinite, seconds >= 0 else { return "00:00" }
        let total = Int(seconds)
        let m = (total % 3600) / 60
        let s = total % 60
        return String(format: "%02d:%02d", m, s)
    }

    private var loadingView: some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            ProgressView()
                .tint(DesignTokens.Primary.default)
                .scaleEffect(2.0)
            Text("Loading episode...")
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Text.muted)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private func errorView(_ message: String) -> some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: TVDesignTokens.FontSize.hero))
                .foregroundStyle(DesignTokens.Warning.default)
            Text(message)
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Text.secondary)
            GlassButton("Retry", variant: .secondary, size: .large) {
                loadStream()
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}
