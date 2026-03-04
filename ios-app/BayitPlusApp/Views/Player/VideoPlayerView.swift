import AVKit
import SwiftUI

/// UIViewControllerRepresentable wrapper for AVPlayerViewController.
///
/// Integrates the system video player with SwiftUI, providing native
/// PiP support, AirPlay, and system-level playback controls.
/// Uses AVPictureInPictureController with the AVPlayerViewController
/// content source so PiP works even with showsPlaybackControls = false.
struct VideoPlayerView: UIViewControllerRepresentable {
    let player: AVPlayer
    var allowsPiP: Bool = true
    var videoGravity: AVLayerVideoGravity = .resizeAspect
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
        controller.videoGravity = videoGravity
        controller.delegate = context.coordinator
        context.coordinator.playerViewController = controller
        context.coordinator.setupPiPController(from: controller)
        return controller
    }

    func updateUIViewController(
        _ uiViewController: AVPlayerViewController,
        context: Context
    ) {
        if uiViewController.player !== player {
            uiViewController.player = player
        }
        uiViewController.videoGravity = videoGravity
        uiViewController.allowsPictureInPicturePlayback = allowsPiP
        uiViewController.canStartPictureInPictureAutomaticallyFromInline = allowsPiP
        context.coordinator.parent = self
        context.coordinator.handlePiPToggle()
    }

    // MARK: - Coordinator

    final class Coordinator: NSObject, AVPlayerViewControllerDelegate,
        AVPictureInPictureControllerDelegate
    {
        var parent: VideoPlayerView
        weak var playerViewController: AVPlayerViewController?
        private var lastPiPState: Bool = false
        #if os(iOS)
            private var pipController: AVPictureInPictureController?
        #endif

        init(parent: VideoPlayerView) {
            self.parent = parent
            lastPiPState = parent.isPiPActive
        }

        #if os(iOS)
            func setupPiPController(from pvc: AVPlayerViewController) {
                guard AVPictureInPictureController.isPictureInPictureSupported() else {
                    return
                }
                let contentSource = AVPictureInPictureController.ContentSource(
                    playerLayer: AVPlayerLayer(player: pvc.player)
                )
                let pip = AVPictureInPictureController(contentSource: contentSource)
                pip.delegate = self
                pipController = pip
            }
        #else
            func setupPiPController(from _: AVPlayerViewController) {}
        #endif

        func handlePiPToggle() {
            let desired = parent.isPiPActive
            guard desired != lastPiPState else { return }
            lastPiPState = desired

            #if os(iOS)
                guard let pip = pipController else { return }
                if desired, !pip.isPictureInPictureActive {
                    pip.startPictureInPicture()
                } else if !desired, pip.isPictureInPictureActive {
                    pip.stopPictureInPicture()
                }
            #endif
        }

        // MARK: - AVPlayerViewControllerDelegate

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

        // MARK: - AVPictureInPictureControllerDelegate

        #if os(iOS)
            func pictureInPictureControllerWillStartPictureInPicture(
                _: AVPictureInPictureController
            ) {
                parent.isPiPActive = true
                lastPiPState = true
            }

            func pictureInPictureControllerDidStopPictureInPicture(
                _: AVPictureInPictureController
            ) {
                parent.isPiPActive = false
                lastPiPState = false
            }

            func pictureInPictureController(
                _: AVPictureInPictureController,
                restoreUserInterfaceForPictureInPictureStopWithCompletionHandler completion: @escaping (Bool) -> Void
            ) {
                if let handler = parent.onRestoreUserInterface {
                    handler(completion)
                } else {
                    completion(true)
                }
            }
        #endif
    }
}
