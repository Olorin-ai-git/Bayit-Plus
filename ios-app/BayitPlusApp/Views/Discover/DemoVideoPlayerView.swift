import AVKit
import BayitDesignSystem
import SwiftUI

/// Full-screen player for Discover feature demo videos.
struct DemoVideoPlayerView: View {
    let url: URL
    let onDismiss: () -> Void
    @State private var player: AVPlayer?

    var body: some View {
        ZStack(alignment: .topTrailing) {
            if let player {
                VideoPlayer(player: player)
                    .ignoresSafeArea()
            } else {
                DesignTokens.Background.primary.ignoresSafeArea()
                ProgressView()
                    .tint(DesignTokens.Primary.default)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            }

            closeButton
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
    }

    private var closeButton: some View {
        Button(action: onDismiss) {
            Image(systemName: "xmark.circle.fill")
                .font(.title)
                .symbolRenderingMode(.palette)
                .foregroundStyle(
                    DesignTokens.Text.primary,
                    DesignTokens.Glass.bgMedium
                )
        }
        .padding(DesignTokens.Spacing.lg)
        .accessibilityIdentifier("discover_demo_close")
        .accessibilityLabel("Close")
    }
}
