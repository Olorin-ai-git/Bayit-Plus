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

    // Toggle PiP from SwiftUI by flipping `isPiPActive`.
    // The coordinator detects the change in `updateUIViewController` and acts.

    // MARK: - Coordinator

    final class Coordinator: NSObject, AVPlayerViewControllerDelegate {
        var parent: VideoPlayerView
        weak var playerViewController: AVPlayerViewController?
        private var lastPiPState: Bool = false
        #if os(iOS)
            private var cachedPiPController: AVPictureInPictureController?
        #endif

        init(parent: VideoPlayerView) {
            self.parent = parent
            lastPiPState = parent.isPiPActive
        }

        func handlePiPToggle() {
            let desired = parent.isPiPActive
            guard desired != lastPiPState else { return }
            lastPiPState = desired

            guard let pvc = playerViewController else { return }
            #if os(iOS)
                if let pipController = getOrCreatePiPController(from: pvc) {
                    if desired, !pipController.isPictureInPictureActive {
                        pipController.startPictureInPicture()
                    } else if !desired, pipController.isPictureInPictureActive {
                        pipController.stopPictureInPicture()
                    }
                }
            #endif
        }

        #if os(iOS)
            private func getOrCreatePiPController(from pvc: AVPlayerViewController) -> AVPictureInPictureController? {
                if let existing = cachedPiPController {
                    return existing
                }
                let controller: AVPictureInPictureController?
                if let playerLayer = pvc.view.layer.sublayers?.first(where: { $0 is AVPlayerLayer }) as? AVPlayerLayer {
                    controller = AVPictureInPictureController(playerLayer: playerLayer)
                } else if let player = pvc.player {
                    let layer = AVPlayerLayer(player: player)
                    controller = AVPictureInPictureController(playerLayer: layer)
                } else {
                    controller = nil
                }
                cachedPiPController = controller
                return controller
            }
        #endif

        func playerViewControllerWillStartPictureInPicture(
            _: AVPlayerViewController
        ) {
            parent.isPiPActive = true
            lastPiPState = true
        }

        func playerViewControllerDidStopPictureInPicture(
            _: AVPlayerViewController
        ) {
            parent.isPiPActive = false
            lastPiPState = false
        }

        func playerViewController(
            _: AVPlayerViewController,
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
