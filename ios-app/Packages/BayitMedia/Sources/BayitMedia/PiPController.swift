import AVFoundation
import AVKit
import BayitCore
import Foundation

/// Manages Picture-in-Picture (PiP) playback.
///
/// Wraps AVPictureInPictureController for use with AVPlayerLayer,
/// providing a clean interface for toggling PiP from SwiftUI.
public final class PiPController: NSObject, @unchecked Sendable {

    /// Whether PiP is currently active.
    public private(set) var isActive: Bool = false

    /// Whether PiP is possible on this device.
    public var isPossible: Bool {
        pipController?.isPictureInPicturePossible ?? false
    }

    /// Whether PiP is supported on this device.
    public static var isSupported: Bool {
        AVPictureInPictureController.isPictureInPictureSupported()
    }

    /// Called when PiP is about to start.
    public var onWillStart: (() -> Void)?

    /// Called when PiP has started.
    public var onDidStart: (() -> Void)?

    /// Called when PiP is about to stop.
    public var onWillStop: (() -> Void)?

    /// Called when PiP has stopped.
    public var onDidStop: (() -> Void)?

    /// Called when the user taps the restore button in PiP.
    public var onRestoreUserInterface: ((@escaping (Bool) -> Void) -> Void)?

    private var pipController: AVPictureInPictureController?
    private let logger = BayitLogger(category: "PiP")

    public override init() {
        super.init()
    }

    /// Setup PiP with an AVPlayerLayer.
    ///
    /// Call this after the player layer is available (e.g., from AVPlayerViewController).
    public func setup(with playerLayer: AVPlayerLayer) {
        guard Self.isSupported else {
            logger.info("PiP not supported on this device")
            return
        }

        pipController = AVPictureInPictureController(playerLayer: playerLayer)
        pipController?.delegate = self
        logger.info("PiP controller initialized")
    }

    /// Toggle PiP on/off.
    public func toggle() {
        guard let pip = pipController else { return }

        if pip.isPictureInPictureActive {
            pip.stopPictureInPicture()
        } else {
            pip.startPictureInPicture()
        }
    }

    /// Start PiP if not already active.
    public func start() {
        guard let pip = pipController, !pip.isPictureInPictureActive else { return }
        pip.startPictureInPicture()
    }

    /// Stop PiP if active.
    public func stop() {
        guard let pip = pipController, pip.isPictureInPictureActive else { return }
        pip.stopPictureInPicture()
    }
}

// MARK: - AVPictureInPictureControllerDelegate

extension PiPController: AVPictureInPictureControllerDelegate {

    public func pictureInPictureControllerWillStartPictureInPicture(
        _ pictureInPictureController: AVPictureInPictureController
    ) {
        isActive = true
        onWillStart?()
        logger.info("PiP will start")
    }

    public func pictureInPictureControllerDidStartPictureInPicture(
        _ pictureInPictureController: AVPictureInPictureController
    ) {
        onDidStart?()
        logger.info("PiP started")
    }

    public func pictureInPictureControllerWillStopPictureInPicture(
        _ pictureInPictureController: AVPictureInPictureController
    ) {
        onWillStop?()
        logger.info("PiP will stop")
    }

    public func pictureInPictureControllerDidStopPictureInPicture(
        _ pictureInPictureController: AVPictureInPictureController
    ) {
        isActive = false
        onDidStop?()
        logger.info("PiP stopped")
    }

    public func pictureInPictureController(
        _ pictureInPictureController: AVPictureInPictureController,
        restoreUserInterfaceForPictureInPictureStopWithCompletionHandler completion: @escaping (Bool) -> Void
    ) {
        if let handler = onRestoreUserInterface {
            handler(completion)
        } else {
            completion(true)
        }
    }

    public func pictureInPictureController(
        _ pictureInPictureController: AVPictureInPictureController,
        failedToStartPictureInPictureWithError error: Error
    ) {
        isActive = false
        logger.error("PiP failed to start", error: error)
    }
}
