import BayitDesignSystem
import BayitMedia
import SwiftUI

/// Extension on PlayerView providing the controls overlay, controls gradient,
/// controls toggling, auto-hide timer, and double-tap skip gesture.
extension PlayerView {
    // MARK: - Controls Overlay

    var controlsOverlay: some View {
        VStack {
            topBar
            Spacer()
            if mediaContentType.isLive || mediaContentType == .youtubeVOD {
                glassAIFeaturesPanel
                    .padding(.bottom, DesignTokens.Spacing.sm)
            }
            GlassPlayerControls(
                isPlaying: viewModel.player.state == .playing,
                isLive: mediaContentType.isLive,
                isSeekable: mediaContentType.isSeekable,
                currentTime: viewModel.player.currentTime,
                duration: viewModel.player.duration,
                bufferedTime: viewModel.player.bufferedTime,
                onPlayPause: {
                    viewModel.player.togglePlayPause()
                    Task { await viewModel.syncPlaybackState() }
                },
                onSkipForward: { Task { await viewModel.player.skipForward() } },
                onSkipBackward: { Task { await viewModel.player.skipBackward() } },
                onSeek: { time in Task { await viewModel.player.seek(to: time) } }
            )
            .walkthroughTarget(id: "discover_pause_ask_step2")
            .padding(.bottom, DesignTokens.Spacing.xs)
        }
        .background(controlsGradient)
        .transition(.opacity)
    }

    // MARK: - Controls Gradient

    var controlsGradient: some View {
        VStack(spacing: 0) {
            LinearGradient(
                colors: [.black.opacity(0.7), .clear],
                startPoint: .top, endPoint: .bottom
            )
            .frame(height: 120)
            Spacer()
            LinearGradient(
                colors: [.clear, .black.opacity(0.7)],
                startPoint: .top, endPoint: .bottom
            )
            .frame(height: 80)
        }
        .ignoresSafeArea()
    }

    // MARK: - Toggle Controls

    func toggleControls() {
        withAnimation(.easeInOut(duration: 0.25)) {
            showControls.toggle()
        }
        scheduleControlsHide()
    }

    func scheduleControlsHide() {
        controlsTimer?.cancel()
        guard showControls else { return }
        controlsTimer = Task {
            try? await Task.sleep(for: .seconds(5))
            guard !Task.isCancelled else { return }
            await MainActor.run {
                withAnimation(.easeInOut(duration: 0.25)) {
                    showControls = false
                }
            }
        }
    }

    // MARK: - Double-Tap Skip Gesture

    var doubleTapSkipGesture: some Gesture {
        SpatialTapGesture(count: 2)
            .onEnded { value in
                let tapX = value.location.x
                if tapX < playerWidth / 2 {
                    Task { await viewModel.player.skipBackward() }
                } else {
                    Task { await viewModel.player.skipForward() }
                }
            }
    }
}
