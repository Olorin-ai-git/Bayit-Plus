#if os(tvOS)
import AVFoundation
import AVKit
import BayitDesignSystem
import SwiftUI

/// PiP-style overlay that plays a Creatify lip-sync video of the
/// child's avatar speaking about the current movie scene.
/// Positioned on the lower-right so the movie remains fully visible.
/// Auto-dismisses when the video finishes playing.
struct TVInteractiveMomentOverlayView: View {

    let videoUrl: String
    let avatarImageUrl: String
    let onDismiss: () -> Void

    private let avatarSize: CGFloat = 240

    @State private var player: AVPlayer?
    @State private var isVideoReady = false

    var body: some View {
        VStack {
            Spacer()
            HStack {
                Spacer()
                ZStack {
                    avatarStillImage
                    if isVideoReady, let avPlayer = player {
                        VideoPlayer(player: avPlayer)
                            .scaleEffect(2)
                    }
                }
                .frame(width: avatarSize, height: avatarSize)
                .clipShape(Circle())
                .overlay(
                    Circle()
                        .stroke(.white.opacity(0.3), lineWidth: 3)
                )
                .shadow(
                    color: DesignTokens.Primary.default.opacity(0.4),
                    radius: 20, x: 0, y: 8
                )
                .padding(.trailing, TVDesignTokens.Spacing.xxl)
                .padding(.bottom, 140)
            }
        }
        .allowsHitTesting(false)
        .onAppear { setupPlayer() }
        .onDisappear { cleanupPlayer() }
    }

    // MARK: - Content

    private var avatarStillImage: some View {
        AsyncImage(url: URL(string: avatarImageUrl)) { phase in
            switch phase {
            case .success(let image):
                image.resizable().scaledToFill()
            default:
                Color.black
            }
        }
    }

    // MARK: - Player

    private func setupPlayer() {
        guard let url = URL(string: videoUrl) else {
            onDismiss()
            return
        }

        let avPlayer = AVPlayer(url: url)
        player = avPlayer

        NotificationCenter.default.addObserver(
            forName: .AVPlayerItemDidPlayToEndTime,
            object: avPlayer.currentItem,
            queue: .main
        ) { _ in
            Task { @MainActor in
                try? await Task.sleep(for: .seconds(0.3))
                onDismiss()
            }
        }

        Task {
            try? await Task.sleep(for: .seconds(0.8))
            await MainActor.run {
                withAnimation(.easeIn(duration: 0.3)) {
                    isVideoReady = true
                }
                avPlayer.play()
            }
        }
    }

    private func cleanupPlayer() {
        player?.pause()
        player = nil
    }
}
#endif
