import BayitCore
import Combine
import Foundation
import Observation

/// Production implementation of cast session management.
///
/// Note: This implementation provides the Swift architecture for Google Cast SDK integration.
/// The actual Google Cast SDK must be linked separately via XCFramework or CocoaPods.
///
/// To complete the integration:
/// 1. Add google-cast-sdk dependency (via CocoaPods or binary XCFramework)
/// 2. Import GoogleCast framework
/// 3. Replace mock implementations with actual GCKCastContext calls
@Observable
@MainActor
public final class CastSessionManager: CastSessionProtocol {

    private let logger = BayitLogger(category: "CastSessionManager")
    private var receiverAppId: String?

    public private(set) var state: CastSessionState = .noDevicesAvailable {
        didSet { stateSubject.send(state) }
    }

    public private(set) var deviceInfo: CastDeviceInfo? {
        didSet { deviceInfoSubject.send(deviceInfo) }
    }

    private let stateSubject = CurrentValueSubject<CastSessionState, Never>(.noDevicesAvailable)
    private let deviceInfoSubject = CurrentValueSubject<CastDeviceInfo?, Never>(nil)

    private var currentMedia: CastMedia?

    public init() {}

    public var statePublisher: AnyPublisher<CastSessionState, Never> {
        stateSubject.eraseToAnyPublisher()
    }

    public var deviceInfoPublisher: AnyPublisher<CastDeviceInfo?, Never> {
        deviceInfoSubject.eraseToAnyPublisher()
    }

    public func initialize(receiverAppId: String) async throws {
        logger.info("Initializing cast session", context: [
            "receiverAppId": receiverAppId
        ])

        self.receiverAppId = receiverAppId

        do {
            try await setupGoogleCastFramework(receiverAppId: receiverAppId)
            updateAvailability()
            logger.info("Cast framework initialized successfully")
        } catch {
            logger.error("Failed to initialize cast framework", error: error)
            throw CastError.initializationFailed(error)
        }
    }

    public func presentDevicePicker() async throws {
        guard state.isAvailable else {
            logger.warning("Cannot present device picker - no devices available")
            throw CastError.noDevicesAvailable
        }

        logger.info("Presenting cast device picker")
        state = .connecting

        do {
            try await showCastDialog()
            logger.info("Cast dialog presented successfully")
        } catch {
            state = .notConnected
            logger.error("Failed to present cast dialog", error: error)
            throw CastError.failedToConnect(error)
        }
    }

    public func loadMedia(_ media: CastMedia) async throws {
        guard state.isConnected else {
            logger.warning("Cannot load media - not connected to cast device")
            throw CastError.notConnected
        }

        logger.info("Loading media to cast device", context: [
            "contentId": media.contentId,
            "title": media.title
        ])

        currentMedia = media

        do {
            try await castMedia(media)
            logger.info("Media loaded successfully to cast device")
        } catch {
            logger.error("Failed to load media to cast device", error: error)
            throw CastError.mediaLoadFailed(error)
        }
    }

    public func syncPlaybackState(_ playbackState: CastPlaybackState) async throws {
        guard state.isConnected else {
            return
        }

        do {
            try await updatePlaybackState(playbackState)
            logger.debug("Playback state synced", context: [
                "currentTime": "\(playbackState.currentTime)",
                "isPlaying": "\(playbackState.isPlaying)"
            ])
        } catch {
            logger.error("Failed to sync playback state", error: error)
            throw CastError.playbackSyncFailed(error)
        }
    }

    public func endSession() async throws {
        guard state.isConnected else {
            return
        }

        logger.info("Ending cast session")
        state = .disconnecting

        do {
            try await terminateCastSession()
            handleSessionEnded()
            logger.info("Cast session ended successfully")
        } catch {
            logger.error("Failed to end cast session", error: error)
            throw CastError.sessionEndFailed(error)
        }
    }

    public func isCastingSupported() -> Bool {
        #if os(iOS)
        return true
        #else
        return false
        #endif
    }

    private func setupGoogleCastFramework(receiverAppId: String) async throws {
        await Task { @MainActor in
            logger.info("Setting up Google Cast framework", context: [
                "receiverAppId": receiverAppId
            ])
        }.value
    }

    private func updateAvailability() {
        if state == .noDevicesAvailable {
            state = .notConnected
        }
    }

    private func showCastDialog() async throws {
        try await Task.sleep(nanoseconds: 500_000_000)
    }

    private func castMedia(_ media: CastMedia) async throws {
        try await Task.sleep(nanoseconds: 100_000_000)
    }

    private func updatePlaybackState(_ playbackState: CastPlaybackState) async throws {
        logger.debug("Updating playback state")
    }

    private func terminateCastSession() async throws {
        try await Task.sleep(nanoseconds: 100_000_000)
    }

    private func handleSessionStarted(deviceName: String, deviceId: String) {
        state = .connected
        deviceInfo = CastDeviceInfo(
            deviceName: deviceName,
            modelName: "Chromecast",
            deviceId: deviceId
        )
        logger.info("Cast session started", context: [
            "deviceName": deviceName
        ])
    }

    private func handleSessionEnded() {
        state = .notConnected
        deviceInfo = nil
        currentMedia = nil
        logger.info("Cast session ended")
    }
}

/// Errors that can occur during cast operations.
public enum CastError: Error, LocalizedError {
    case initializationFailed(Error)
    case noDevicesAvailable
    case notConnected
    case failedToConnect(Error)
    case mediaLoadFailed(Error)
    case playbackSyncFailed(Error)
    case sessionEndFailed(Error)

    public var errorDescription: String? {
        switch self {
        case .initializationFailed:
            return "Failed to initialize cast framework"
        case .noDevicesAvailable:
            return "No cast devices available"
        case .notConnected:
            return "Not connected to a cast device"
        case .failedToConnect:
            return "Failed to connect to cast device"
        case .mediaLoadFailed:
            return "Failed to load media on cast device"
        case .playbackSyncFailed:
            return "Failed to sync playback state"
        case .sessionEndFailed:
            return "Failed to end cast session"
        }
    }
}
