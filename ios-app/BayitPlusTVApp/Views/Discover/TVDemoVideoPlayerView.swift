#if os(tvOS)
    import AVKit
    import BayitDesignSystem
    import SwiftUI

    struct TVDemoVideoPlayerView: View {
        let url: URL
        let onDismiss: () -> Void
        @State private var player: AVPlayer?

        var body: some View {
            ZStack {
                if let player {
                    VideoPlayer(player: player)
                        .ignoresSafeArea()
                } else {
                    DesignTokens.Background.primary.ignoresSafeArea()
                    ProgressView()
                        .tint(DesignTokens.Primary.default)
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                }
            }
            .onAppear {
                let avPlayer = AVPlayer(url: url)
                player = avPlayer
                avPlayer.play()
            }
            .onDisappear {
                player?.pause()
                player = nil
            }
            .onExitCommand(perform: onDismiss)
        }
    }
#endif
