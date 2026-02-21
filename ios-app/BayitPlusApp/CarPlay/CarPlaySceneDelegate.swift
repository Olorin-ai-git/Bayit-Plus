import BayitCore
import BayitMedia
import CarPlay
import Foundation

/// CarPlay scene delegate that manages the CarPlay interface lifecycle.
///
/// Uses the host app's shared `RepositoryProvider`, `StreamResolver`, and `MediaPlayer`
/// exposed via `AppDelegate` static properties so playback state transfers seamlessly
/// between the phone and CarPlay displays without duplicating service instances.
final class CarPlaySceneDelegate: UIResponder, CPTemplateApplicationSceneDelegate {
    private var interfaceController: CPInterfaceController?
    private var contentProvider: CarPlayContentProvider?
    private var playbackController: CarPlayPlaybackController?
    private let logger = BayitLogger(category: "CarPlay")

    // MARK: - CPTemplateApplicationSceneDelegate

    func templateApplicationScene(
        _: CPTemplateApplicationScene,
        didConnect interfaceController: CPInterfaceController
    ) {
        self.interfaceController = interfaceController
        logger.info("CarPlay connected")

        guard let repos = AppDelegate.sharedRepositories,
              let mediaPlayer = AppDelegate.sharedMediaPlayer,
              let resolver = AppDelegate.sharedStreamResolver
        else {
            logger.error("Host app shared instances not available for CarPlay")
            return
        }

        let playback = CarPlayPlaybackController(
            mediaPlayer: mediaPlayer,
            streamResolver: resolver,
            interfaceController: interfaceController
        )
        playbackController = playback

        let provider = CarPlayContentProvider(
            repositories: repos,
            playbackController: playback,
            interfaceController: interfaceController
        )
        contentProvider = provider

        Task { @MainActor in
            await provider.buildRootTemplate()
        }
    }

    func templateApplicationScene(
        _: CPTemplateApplicationScene,
        didDisconnect _: CPInterfaceController
    ) {
        logger.info("CarPlay disconnected")
        interfaceController = nil
        contentProvider = nil
        playbackController = nil
    }
}
