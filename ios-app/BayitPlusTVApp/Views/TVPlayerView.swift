import AVKit
import BayitMedia
import SwiftUI

/// tvOS full-screen video player.
/// Uses AVPlayerViewController for native tvOS playback controls
/// including Siri Remote: swipe to seek, play/pause, Menu to exit.
struct TVPlayerView: View {
    @Environment(MediaPlayer.self) private var mediaPlayer

    let contentId: String
    let contentType: MediaContentType

    var body: some View {
        TVVideoPlayerRepresentable(player: mediaPlayer.avPlayer)
            .ignoresSafeArea()
            .onAppear {
                startPlayback()
            }
            .onDisappear {
                mediaPlayer.pause()
            }
    }

    private func startPlayback() {
        guard let url = URL(string: contentId) else { return }
        mediaPlayer.load(url: url, contentType: contentType)
        mediaPlayer.play()
    }
}

// MARK: - AVPlayerViewController Wrapper for tvOS

/// UIViewControllerRepresentable wrapping AVPlayerViewController for tvOS.
/// Enables native tvOS transport bar, Siri Remote gestures, and info panel.
struct TVVideoPlayerRepresentable: UIViewControllerRepresentable {
    let player: AVPlayer

    func makeUIViewController(context: Context) -> AVPlayerViewController {
        let controller = AVPlayerViewController()
        controller.player = player
        controller.showsPlaybackControls = true
        controller.allowsPictureInPicturePlayback = true
        controller.videoGravity = .resizeAspect
        return controller
    }

    func updateUIViewController(
        _ uiViewController: AVPlayerViewController,
        context: Context
    ) {
        if uiViewController.player !== player {
            uiViewController.player = player
        }
    }
}
