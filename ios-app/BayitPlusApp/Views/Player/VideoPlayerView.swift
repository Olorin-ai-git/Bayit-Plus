import AVKit
import SwiftUI

/// UIViewControllerRepresentable wrapper for AVPlayerViewController.
///
/// Integrates the system video player with SwiftUI, providing native
/// PiP support, AirPlay, and system-level playback controls.
struct VideoPlayerView: UIViewControllerRepresentable {

    let player: AVPlayer

    func makeUIViewController(context: Context) -> AVPlayerViewController {
        let controller = AVPlayerViewController()
        controller.player = player
        controller.showsPlaybackControls = false
        controller.allowsPictureInPicturePlayback = true
        controller.canStartPictureInPictureAutomaticallyFromInline = true
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
