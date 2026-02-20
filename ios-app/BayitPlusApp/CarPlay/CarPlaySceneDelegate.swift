import BayitCore
import BayitMedia
import BayitNetworking
import BayitWidgetShared
import CarPlay
import Foundation

/// CarPlay scene delegate that manages the CarPlay interface lifecycle.
///
/// Creates a separate `RepositoryProvider` and `StreamResolver` for the CarPlay scene,
/// sharing the auth token via the shared Keychain. The `MediaPlayer` is a shared singleton
/// so playback state transfers seamlessly between the phone and CarPlay displays.
final class CarPlaySceneDelegate: UIResponder, CPTemplateApplicationSceneDelegate {

    private var interfaceController: CPInterfaceController?
    private var contentProvider: CarPlayContentProvider?
    private var playbackController: CarPlayPlaybackController?
    private let logger = BayitLogger(category: "CarPlay")

    // MARK: - CPTemplateApplicationSceneDelegate

    func templateApplicationScene(
        _ templateApplicationScene: CPTemplateApplicationScene,
        didConnect interfaceController: CPInterfaceController
    ) {
        self.interfaceController = interfaceController
        logger.info("CarPlay connected")

        let appConfig = AppConfiguration()
        let apiLogger = AppAPILogger()
        let networkConfig = AppNetworkConfiguration(appConfig: appConfig)

        let tokenProvider = CarPlayAuthTokenProvider()
        let locationProvider = CarPlayLocationProvider()

        let client = APIClient(
            configuration: networkConfig,
            authTokenProvider: tokenProvider,
            locationProvider: locationProvider,
            logger: apiLogger
        )

        let wsManager = WebSocketManager(configuration: networkConfig, logger: apiLogger)

        let repos = RepositoryProvider(
            client: client,
            webSocketManager: wsManager,
            authTokenProvider: tokenProvider,
            configuration: appConfig
        )

        let resolver = StreamResolver(
            mediaRepository: repos.media,
            contentRepository: repos.content,
            liveTVRepository: repos.liveTV,
            radioRepository: repos.radio,
            podcastRepository: repos.podcasts,
            audiobookRepository: repos.audiobook
        )

        let mediaPlayer = MediaPlayer()
        let playback = CarPlayPlaybackController(
            mediaPlayer: mediaPlayer,
            streamResolver: resolver,
            interfaceController: interfaceController
        )
        self.playbackController = playback

        let provider = CarPlayContentProvider(
            repositories: repos,
            playbackController: playback,
            interfaceController: interfaceController
        )
        self.contentProvider = provider

        Task { @MainActor in
            await provider.buildRootTemplate()
        }
    }

    func templateApplicationScene(
        _ templateApplicationScene: CPTemplateApplicationScene,
        didDisconnect interfaceController: CPInterfaceController
    ) {
        logger.info("CarPlay disconnected")
        self.interfaceController = nil
        self.contentProvider = nil
        self.playbackController = nil
    }
}

// MARK: - CarPlay Auth Token Provider

/// Reads the auth token from the shared Keychain for CarPlay API calls.
private struct CarPlayAuthTokenProvider: AuthTokenProvider {

    private let keychainHelper = SharedKeychainHelper()

    func currentToken() async throws -> String? {
        keychainHelper.readAuthToken()
    }
}

// MARK: - CarPlay Location Provider

/// Minimal location provider for CarPlay (location not critical for audio content).
private struct CarPlayLocationProvider: LocationProvider {

    func currentLocation() async -> UserLocation? {
        nil
    }
}
