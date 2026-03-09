import AVFoundation
import SwiftUI

/// Lightweight looping video player for onboarding demo previews.
/// Auto-plays a local MP4 asset in a continuous loop with no controls.
struct InlineVideoPlayer: View {
    let assetName: String
    @State private var player: AVQueuePlayer?
    @State private var looper: AVPlayerLooper?

    var body: some View {
        VideoPlayerView(player: player)
            .onAppear { setupPlayer() }
            .onDisappear { teardownPlayer() }
    }

    private func setupPlayer() {
        guard let url = Bundle.main.url(
            forResource: assetName,
            withExtension: nil,
            subdirectory: "OnboardingDemos"
        ) else { return }

        let item = AVPlayerItem(url: url)
        let queuePlayer = AVQueuePlayer(playerItem: item)
        queuePlayer.isMuted = false
        let playerLooper = AVPlayerLooper(
            player: queuePlayer,
            templateItem: item
        )
        player = queuePlayer
        looper = playerLooper
        queuePlayer.play()
    }

    private func teardownPlayer() {
        player?.pause()
        player = nil
        looper = nil
    }
}

// MARK: - UIKit Bridge

private struct VideoPlayerView: UIViewRepresentable {
    let player: AVQueuePlayer?

    func makeUIView(context _: Context) -> PlayerUIView {
        PlayerUIView()
    }

    func updateUIView(_ uiView: PlayerUIView, context _: Context) {
        uiView.playerLayer.player = player
    }
}

private final class PlayerUIView: UIView {
    let playerLayer = AVPlayerLayer()

    override init(frame: CGRect) {
        super.init(frame: frame)
        playerLayer.videoGravity = .resizeAspectFill
        layer.addSublayer(playerLayer)
    }

    @available(*, unavailable)
    required init?(coder _: NSCoder) {
        fatalError()
    }

    override func layoutSubviews() {
        super.layoutSubviews()
        playerLayer.frame = bounds
    }
}
