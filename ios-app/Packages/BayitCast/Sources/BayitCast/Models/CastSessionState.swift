import Foundation

/// State of the cast session.
public enum CastSessionState: String, Sendable, Equatable {
    /// No devices available for casting.
    case noDevicesAvailable = "no_devices_available"

    /// Cast devices are available but not connected.
    case notConnected = "not_connected"

    /// Attempting to establish a cast session.
    case connecting = "connecting"

    /// Cast session established and active.
    case connected = "connected"

    /// Cast session is being terminated.
    case disconnecting = "disconnecting"

    public var isAvailable: Bool {
        self != .noDevicesAvailable
    }

    public var isConnecting: Bool {
        self == .connecting
    }

    public var isConnected: Bool {
        self == .connected
    }
}

/// Playback state to sync with cast device.
public struct CastPlaybackState: Sendable, Equatable {
    public let currentTime: TimeInterval
    public let isPlaying: Bool
    public let volume: Float

    public init(
        currentTime: TimeInterval,
        isPlaying: Bool,
        volume: Float = 1.0
    ) {
        self.currentTime = currentTime
        self.isPlaying = isPlaying
        self.volume = volume
    }
}

/// Information about the connected cast device.
public struct CastDeviceInfo: Sendable, Equatable {
    public let deviceName: String
    public let modelName: String?
    public let deviceId: String

    public init(
        deviceName: String,
        modelName: String? = nil,
        deviceId: String
    ) {
        self.deviceName = deviceName
        self.modelName = modelName
        self.deviceId = deviceId
    }
}
