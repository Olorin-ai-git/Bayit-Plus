#if os(tvOS)
    import AVFoundation
    import BayitDesignSystem
    import SwiftUI

    /// Fullscreen player for direct video trailer URLs (non-YouTube).
    struct TVDirectTrailerPlayerView: View {
        let url: String
        let onDismiss: () -> Void

        @State private var player: AVPlayer?

        var body: some View {
            ZStack {
                Color.black.ignoresSafeArea()

                if let player {
                    TVVideoPlayerRepresentable(player: player)
                        .ignoresSafeArea()
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
            .onExitCommand(perform: onDismiss)
            .onPlayPauseCommand {
                guard let player else { return }
                if player.timeControlStatus == .playing {
                    player.pause()
                } else {
                    player.play()
                }
            }
        }
    }
#endif
