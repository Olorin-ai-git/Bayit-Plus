import AVKit
import SwiftUI

/// UIViewControllerRepresentable wrapper for AVPlayerViewController.
///
/// Integrates the system video player with SwiftUI, providing native
/// PiP support, AirPlay, and system-level playback controls.
/// PiP is delegated to the AVPlayerViewController which owns the player layer,
/// ensuring the system PiP controller has a valid, on-screen layer to work with.
struct VideoPlayerView: UIViewControllerRepresentable {

    let player: AVPlayer
    var allowsPiP: Bool = true
    @Binding var isPiPActive: Bool
    var onRestoreUserInterface: ((@escaping (Bool) -> Void) -> Void)?

    func makeCoordinator() -> Coordinator {
        Coordinator(parent: self)
    }

    func makeUIViewController(context: Context) -> AVPlayerViewController {
        let controller = AVPlayerViewController()
        controller.player = player
        controller.showsPlaybackControls = false
        controller.allowsPictureInPicturePlayback = allowsPiP
        controller.canStartPictureInPictureAutomaticallyFromInline = allowsPiP
        controller.videoGravity = .resizeAspect
        controller.delegate = context.coordinator
        context.coordinator.playerViewController = controller
        return controller
    }

    func updateUIViewController(
        _ uiViewController: AVPlayerViewController,
        context: Context
    ) {
        if uiViewController.player !== player {
            uiViewController.player = player
        }
        uiViewController.allowsPictureInPicturePlayback = allowsPiP
        uiViewController.canStartPictureInPictureAutomaticallyFromInline = allowsPiP
        context.coordinator.parent = self
        context.coordinator.handlePiPToggle()
    }

    /// Toggle PiP from SwiftUI by flipping `isPiPActive`.
    /// The coordinator detects the change in `updateUIViewController` and acts.

    // MARK: - Coordinator

    final class Coordinator: NSObject, AVPlayerViewControllerDelegate {
        var parent: VideoPlayerView
        weak var playerViewController: AVPlayerViewController?
        private var lastPiPState: Bool = false

        init(parent: VideoPlayerView) {
            self.parent = parent
            self.lastPiPState = parent.isPiPActive
        }

        func handlePiPToggle() {
            let desired = parent.isPiPActive
            guard desired != lastPiPState else { return }
            lastPiPState = desired

            guard let pvc = playerViewController else { return }
            #if os(iOS)
            if desired {
                // Access the underlying PiP controller via the player view controller
                // AVPlayerViewController manages this internally when allowsPiP = true
                // We trigger PiP by starting it on the controller
                if let pipController = extractPiPController(from: pvc), !pipController.isPictureInPictureActive {
                    pipController.startPictureInPicture()
                }
            } else {
                if let pipController = extractPiPController(from: pvc), pipController.isPictureInPictureActive {
                    pipController.stopPictureInPicture()
                }
            }
            #endif
        }

        #if os(iOS)
        private func extractPiPController(from pvc: AVPlayerViewController) -> AVPictureInPictureController? {
            // AVPlayerViewController exposes its PiP controller when allowsPiP is true.
            // Use the contentOverlayView's layer as the player layer source.
            guard let playerLayer = pvc.view.layer.sublayers?.first(where: { $0 is AVPlayerLayer }) as? AVPlayerLayer else {
                // Fallback: create from the player directly
                if let player = pvc.player {
                    let layer = AVPlayerLayer(player: player)
                    return AVPictureInPictureController(playerLayer: layer)
                }
                return nil
            }
            return AVPictureInPictureController(playerLayer: playerLayer)
        }
        #endif

        func playerViewControllerWillStartPictureInPicture(
            _ playerViewController: AVPlayerViewController
        ) {
            parent.isPiPActive = true
            lastPiPState = true
        }

        func playerViewControllerDidStopPictureInPicture(
            _ playerViewController: AVPlayerViewController
        ) {
            parent.isPiPActive = false
            lastPiPState = false
        }

        func playerViewController(
            _ playerViewController: AVPlayerViewController,
            restoreUserInterfaceForPictureInPictureStopWithCompletionHandler completion: @escaping (Bool) -> Void
        ) {
            if let handler = parent.onRestoreUserInterface {
                handler(completion)
            } else {
                completion(true)
            }
        }
    }
}
