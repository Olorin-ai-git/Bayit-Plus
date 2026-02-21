import BayitCore
import Combine
import Foundation
import Observation
#if os(iOS)
    import GoogleCast
#endif

/// Google Cast session coordinator for Bayit+ media streaming.
///
/// Call `initialize(receiverAppId:)` once at app launch (idempotent).
/// All GCK framework calls are confined to `CastSessionManager+GCK.swift`.
@Observable
@MainActor
public final class CastSessionManager: CastSessionProtocol {
    private let logger = BayitLogger(category: "CastSessionManager")

    public private(set) var state: CastSessionState = .noDevicesAvailable {
        didSet { stateSubject.send(state) }
    }

    public private(set) var deviceInfo: CastDeviceInfo? {
        didSet { deviceInfoSubject.send(deviceInfo) }
    }

    private let stateSubject = CurrentValueSubject<CastSessionState, Never>(.noDevicesAvailable)
    private let deviceInfoSubject = CurrentValueSubject<CastDeviceInfo?, Never>(nil)

    private var isInitialized = false
    private var currentMedia: CastMedia?

    /// Updated by the player whenever new content starts. Used by MediaPlayerCastBridge
    /// to populate GCKMediaInformation with accurate metadata.
    public private(set) var contentId: String?
    public private(set) var contentTitle: String?

    public func updateContent(id: String, title: String) {
        contentId = id
        contentTitle = title
    }

    #if os(iOS)
        var sessionDelegate: CastSessionDelegate?
        var discoveryDelegate: CastDiscoveryDelegate?
    #endif

    public init() {}

    public var statePublisher: AnyPublisher<CastSessionState, Never> {
        stateSubject.eraseToAnyPublisher()
    }

    public var deviceInfoPublisher: AnyPublisher<CastDeviceInfo?, Never> {
        deviceInfoSubject.eraseToAnyPublisher()
    }

    public func initialize(receiverAppId: String) async throws {
        guard !isInitialized else {
            logger.info("Cast framework already initialized")
            return
        }
        logger.info("Initializing cast session", context: ["appId": String(receiverAppId.prefix(8))])
        do {
            try await setupCastFramework(receiverAppId: receiverAppId)
            isInitialized = true
            logger.info("Cast framework initialized successfully")
        } catch {
            logger.error("Failed to initialize cast framework", error: error)
            throw CastError.initializationFailed(error)
        }
    }

    public func presentDevicePicker() async throws {
        guard state.isAvailable else {
            logger.warning("Cannot present device picker — no devices available")
            throw CastError.noDevicesAvailable
        }
        logger.info("Presenting cast device picker")
        state = .connecting
        do {
            try await showDevicePicker()
        } catch {
            state = .notConnected
            logger.error("Failed to present device picker", error: error)
            throw CastError.failedToConnect(error)
        }
    }

    public func loadMedia(_ media: CastMedia) async throws {
        guard state.isConnected else {
            logger.warning("Cannot load media — not connected to cast device")
            throw CastError.notConnected
        }
        logger.info("Loading media to cast device", context: ["contentId": media.contentId])
        currentMedia = media
        do {
            try await sendMediaLoad(media)
            logger.info("Media loaded to cast device")
        } catch {
            logger.error("Failed to load media to cast device", error: error)
            throw CastError.mediaLoadFailed(error)
        }
    }

    public func syncPlaybackState(_ playbackState: CastPlaybackState) async throws {
        guard state.isConnected else { return }
        do {
            try await sendPlaybackSync(playbackState)
        } catch {
            logger.error("Failed to sync playback state", error: error)
            throw CastError.playbackSyncFailed(error)
        }
    }

    public func endSession() async throws {
        guard state.isConnected else { return }
        logger.info("Ending cast session")
        state = .disconnecting
        do {
            try await terminateCastSession()
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

    // MARK: - Internal callbacks (invoked by CastSessionDelegate / CastDiscoveryDelegate)

    func handleSessionStarted(deviceName: String, modelName: String, deviceId: String) {
        state = .connected
        deviceInfo = CastDeviceInfo(deviceName: deviceName, modelName: modelName, deviceId: deviceId)
        logger.info("Cast session started", context: ["device": deviceName])
    }

    func handleSessionEnded() {
        state = .notConnected
        deviceInfo = nil
        currentMedia = nil
        logger.info("Cast session ended")
    }

    func handleSessionFailed(error: Error) {
        state = .notConnected
        logger.error("Cast session failed", error: error)
    }

    func handleDeviceListChanged(hasDevices: Bool) {
        switch (hasDevices, state) {
        case (true, .noDevicesAvailable):
            state = .notConnected
        case (false, .notConnected):
            state = .noDevicesAvailable
        default:
            break
        }
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
        case .initializationFailed: return "Failed to initialize cast framework"
        case .noDevicesAvailable: return "No cast devices available"
        case .notConnected: return "Not connected to a cast device"
        case .failedToConnect: return "Failed to connect to cast device"
        case .mediaLoadFailed: return "Failed to load media on cast device"
        case .playbackSyncFailed: return "Failed to sync playback state"
        case .sessionEndFailed: return "Failed to end cast session"
        }
    }
}
