import Combine
import Foundation

/// Protocol defining cast session management capabilities.
@MainActor
public protocol CastSessionProtocol: AnyObject {
    /// Current state of the cast session.
    var state: CastSessionState { get }

    /// Information about the connected device (nil if not connected).
    var deviceInfo: CastDeviceInfo? { get }

    /// Publisher for cast session state changes.
    var statePublisher: AnyPublisher<CastSessionState, Never> { get }

    /// Publisher for device info changes.
    var deviceInfoPublisher: AnyPublisher<CastDeviceInfo?, Never> { get }

    /// Initialize the cast framework with receiver app ID.
    func initialize(receiverAppId: String) async throws

    /// Present the device picker UI to select a cast device.
    func presentDevicePicker() async throws

    /// Load media onto the cast device.
    func loadMedia(_ media: CastMedia) async throws

    /// Update playback state on the cast device.
    func syncPlaybackState(_ state: CastPlaybackState) async throws

    /// End the current cast session.
    func endSession() async throws

    /// Check if casting is supported on this device.
    func isCastingSupported() -> Bool
}
