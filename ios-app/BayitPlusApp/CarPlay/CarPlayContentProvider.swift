import BayitCore
import CarPlay
import Foundation

/// Builds the CarPlay tab bar with content lists for Radio, Podcasts, Audiobooks, and Live TV.
///
/// Fetches content from existing repositories and presents it as `CPListTemplate` tabs.
/// Each item tap triggers playback via `CarPlayPlaybackController`.
@MainActor
final class CarPlayContentProvider {
    let repositories: RepositoryProvider
    let playbackController: CarPlayPlaybackController
    weak var interfaceController: CPInterfaceController?
    let imageLoader = CarPlayImageLoader.shared
    let logger = BayitLogger(category: "CarPlayContent")

    let contentPageSize = 12

    init(
        repositories: RepositoryProvider,
        playbackController: CarPlayPlaybackController,
        interfaceController: CPInterfaceController
    ) {
        self.repositories = repositories
        self.playbackController = playbackController
        self.interfaceController = interfaceController
    }

    /// Build and set the root tab bar template with all content tabs.
    func buildRootTemplate() async {
        let radioTab = await buildRadioTab()
        let podcastTab = await buildPodcastTab()
        let audiobookTab = await buildAudiobookTab()
        let liveTVTab = await buildLiveTVTab()

        let tabBar = CPTabBarTemplate(templates: [radioTab, podcastTab, audiobookTab, liveTVTab])
        interfaceController?.setRootTemplate(tabBar, animated: true, completion: nil)
        logger.info("Root template set with 4 tabs")
    }

    // MARK: - Radio Tab

    func buildRadioTab() async -> CPListTemplate {
        var items: [CPListItem] = []

        do {
            let response = try await repositories.radio.fetchStations(cultureId: nil, genre: nil)
            items = response.stations.map { station in
                let item = CPListItem(
                    text: station.name ?? station.id,
                    detailText: station.genre ?? station.currentShow
                )
                item.handler = { [weak self] _, completion in
                    Task { @MainActor [weak self] in
                        await self?.playbackController.play(
                            contentId: station.id,
                            contentType: .radio
                        )
                        completion()
                    }
                }
                self.loadArtwork(urlString: station.logo, for: item)
                return item
            }
        } catch {
            logger.error("Failed to load radio stations", error: error)
        }

        let section = CPListSection(items: items)
        let template = CPListTemplate(title: "Radio", sections: [section])
        template.tabSystemItem = .featured
        return template
    }
}
