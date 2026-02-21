#if os(iOS)
    import AVKit
    import SwiftUI

    /// Fullscreen player for direct video trailer URLs (non-YouTube).
    struct DirectTrailerPlayerView: View {
        let url: String
        let onDismiss: () -> Void

        @State private var player: AVPlayer?

        var body: some View {
            ZStack(alignment: .topLeading) {
                Color.black.ignoresSafeArea()

                if let player {
                    AVPlayerViewControllerRepresentable(player: player)
                        .ignoresSafeArea()
                }

                Button(action: onDismiss) {
                    Image(systemName: "xmark.circle.fill")
                        .font(.system(size: 28))
                        .foregroundStyle(.white.opacity(0.8))
                        .padding()
                }
            }
            .onAppear {
                guard let videoURL = URL(string: url) else { return }
                let avPlayer = AVPlayer(url: videoURL)
                player = avPlayer
                avPlayer.play()
            }
            .onDisappear {
                player?.pause()
                player = nil
            }
        }
    }

    private struct AVPlayerViewControllerRepresentable: UIViewControllerRepresentable {
        let player: AVPlayer

        func makeUIViewController(context _: Context) -> AVPlayerViewController {
            let controller = AVPlayerViewController()
            controller.player = player
            controller.showsPlaybackControls = true
            controller.videoGravity = .resizeAspect
            return controller
        }

        func updateUIViewController(_ controller: AVPlayerViewController, context _: Context) {
            if controller.player !== player {
                controller.player = player
            }
        }
    }
#endif
