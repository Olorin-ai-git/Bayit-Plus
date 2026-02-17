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

    @State private var player: AVPlayer?
    @State private var isVideoReady = false
    @State private var didFinish = false

    var body: some View {
        VStack {
            Spacer()
            HStack {
                Spacer()
                avatarVideoContent
                    .padding(.trailing, TVDesignTokens.Spacing.xxl)
                    .padding(.bottom, 120)
            }
        }
        .allowsHitTesting(false)
        .onAppear { setupPlayer() }
        .onDisappear { cleanupPlayer() }
    }

    // MARK: - Video Content

    @ViewBuilder
    private var avatarVideoContent: some View {
        ZStack {
            if isVideoReady, let avPlayer = player {
                VideoPlayer(player: avPlayer)
                    .frame(width: 280, height: 280)
                    .clipShape(Circle())
                    .overlay(
                        Circle()
                            .stroke(.white.opacity(0.3), lineWidth: 3)
                    )
                    .shadow(
                        color: DesignTokens.Primary.default.opacity(0.4),
                        radius: 20, x: 0, y: 8
                    )
                    .transition(
                        .scale(scale: 0.5)
                            .combined(with: .opacity)
                    )
            } else {
                avatarLoadingState
            }
        }
        .animation(.spring(duration: 0.5), value: isVideoReady)
        .animation(.spring(duration: 0.5), value: didFinish)
    }

    private var avatarLoadingState: some View {
        ZStack {
            AsyncImage(url: URL(string: avatarImageUrl)) { phase in
                switch phase {
                case .success(let image):
                    image.resizable().scaledToFill()
                default:
                    ProgressView()
                        .tint(DesignTokens.Primary.default)
                }
            }
            .frame(width: 280, height: 280)
            .clipShape(Circle())
            .overlay(
                Circle()
                    .stroke(.white.opacity(0.2), lineWidth: 3)
            )
            .shadow(
                color: .black.opacity(0.5),
                radius: 12, x: 0, y: 6
            )

            ProgressView()
                .tint(.white)
                .scaleEffect(1.5)
        }
    }

    // MARK: - Player Lifecycle

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
            withAnimation { didFinish = true }
            Task {
                try? await Task.sleep(for: .seconds(0.5))
                onDismiss()
            }
        }

        avPlayer.addObserver(
            PlayerReadyObserver { ready in
                if ready {
                    withAnimation { isVideoReady = true }
                    avPlayer.play()
                }
            },
            forKeyPath: "currentItem.status",
            options: [.new],
            context: nil
        )

        // Fallback: start playing after a short delay even if
        // observer doesn't fire (some simulator edge cases)
        Task {
            try? await Task.sleep(for: .seconds(1.0))
            if !isVideoReady {
                withAnimation { isVideoReady = true }
                avPlayer.play()
            }
        }
    }

    private func cleanupPlayer() {
        player?.pause()
        player = nil
    }
}

/// KVO observer for AVPlayer item status
private final class PlayerReadyObserver: NSObject {
    private let onReady: (Bool) -> Void

    init(onReady: @escaping (Bool) -> Void) {
        self.onReady = onReady
    }

    override func observeValue(
        forKeyPath keyPath: String?,
        of object: Any?,
        change: [NSKeyValueChangeKey: Any]?,
        context: UnsafeMutableRawPointer?
    ) {
        if keyPath == "currentItem.status",
           let statusValue = change?[.newKey] as? Int,
           statusValue == AVPlayerItem.Status.readyToPlay.rawValue {
            DispatchQueue.main.async { self.onReady(true) }
        }
    }
}
#endif
