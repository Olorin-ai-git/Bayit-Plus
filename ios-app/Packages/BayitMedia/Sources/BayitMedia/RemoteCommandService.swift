import BayitCore
import Foundation
import MediaPlayer

/// Handles MPRemoteCommandCenter for lock screen and headphone media controls.
///
/// Ported from AudioSessionManager.setupRemoteCommandCenter(), converting callbacks
/// to a delegate pattern for clean SwiftUI integration.
public final class RemoteCommandService: @unchecked Sendable {

    /// Delegate for handling remote media commands.
    public weak var delegate: RemoteCommandDelegate?

    private let logger = BayitLogger(category: "RemoteCommand")
    private var registeredTargets: [Any] = []

    public init() {}

    /// Register handlers for remote media control commands.
    ///
    /// Call this after a media item is loaded. Commands include play, pause,
    /// skip forward/backward, seek, and next/previous track.
    public func register() {
        unregister()

        let commandCenter = MPRemoteCommandCenter.shared()

        let playTarget = commandCenter.playCommand.addTarget { [weak self] _ in
            self?.delegate?.remoteCommandPlay()
            return .success
        }
        registeredTargets.append(playTarget)

        let pauseTarget = commandCenter.pauseCommand.addTarget { [weak self] _ in
            self?.delegate?.remoteCommandPause()
            return .success
        }
        registeredTargets.append(pauseTarget)

        let toggleTarget = commandCenter.togglePlayPauseCommand.addTarget { [weak self] _ in
            self?.delegate?.remoteCommandTogglePlayPause()
            return .success
        }
        registeredTargets.append(toggleTarget)

        let skipForwardTarget = commandCenter.skipForwardCommand.addTarget { [weak self] event in
            guard let event = event as? MPSkipIntervalCommandEvent else { return .commandFailed }
            self?.delegate?.remoteCommandSkipForward(interval: event.interval)
            return .success
        }
        commandCenter.skipForwardCommand.preferredIntervals = [10]
        registeredTargets.append(skipForwardTarget)

        let skipBackTarget = commandCenter.skipBackwardCommand.addTarget { [weak self] event in
            guard let event = event as? MPSkipIntervalCommandEvent else { return .commandFailed }
            self?.delegate?.remoteCommandSkipBackward(interval: event.interval)
            return .success
        }
        commandCenter.skipBackwardCommand.preferredIntervals = [10]
        registeredTargets.append(skipBackTarget)

        let seekTarget = commandCenter.changePlaybackPositionCommand.addTarget { [weak self] event in
            guard let event = event as? MPChangePlaybackPositionCommandEvent else {
                return .commandFailed
            }
            self?.delegate?.remoteCommandSeek(to: event.positionTime)
            return .success
        }
        registeredTargets.append(seekTarget)

        logger.info("Remote commands registered")
    }

    /// Unregister all remote command handlers.
    public func unregister() {
        let commandCenter = MPRemoteCommandCenter.shared()
        commandCenter.playCommand.removeTarget(nil)
        commandCenter.pauseCommand.removeTarget(nil)
        commandCenter.togglePlayPauseCommand.removeTarget(nil)
        commandCenter.skipForwardCommand.removeTarget(nil)
        commandCenter.skipBackwardCommand.removeTarget(nil)
        commandCenter.changePlaybackPositionCommand.removeTarget(nil)
        registeredTargets.removeAll()
    }

    /// Enable or disable seek-related commands based on content type.
    public func configureForContentType(_ contentType: MediaContentType) {
        let commandCenter = MPRemoteCommandCenter.shared()
        let seekable = contentType.isSeekable
        commandCenter.skipForwardCommand.isEnabled = seekable
        commandCenter.skipBackwardCommand.isEnabled = seekable
        commandCenter.changePlaybackPositionCommand.isEnabled = seekable
    }
}

/// Protocol for handling remote media control commands.
@MainActor
public protocol RemoteCommandDelegate: AnyObject {
    func remoteCommandPlay()
    func remoteCommandPause()
    func remoteCommandTogglePlayPause()
    func remoteCommandSkipForward(interval: TimeInterval)
    func remoteCommandSkipBackward(interval: TimeInterval)
    func remoteCommandSeek(to time: TimeInterval)
}
