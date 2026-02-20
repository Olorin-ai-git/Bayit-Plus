import BayitCore
import CarPlay
import Foundation

/// Builds the CarPlay tab bar with content lists for Radio, Podcasts, Audiobooks, and Live TV.
///
/// Fetches content from existing repositories and presents it as `CPListTemplate` tabs.
/// Each item tap triggers playback via `CarPlayPlaybackController`.
@MainActor
final class CarPlayContentProvider {

    private let repositories: RepositoryProvider
    private let playbackController: CarPlayPlaybackController
    private weak var interfaceController: CPInterfaceController?
    private let imageLoader = CarPlayImageLoader.shared
    private let logger = BayitLogger(category: "CarPlayContent")

    private let contentPageSize = 12

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

    private func buildRadioTab() async -> CPListTemplate {
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

    // MARK: - Podcasts Tab

    private func buildPodcastTab() async -> CPListTemplate {
        var items: [CPListItem] = []

        do {
            let response = try await repositories.podcasts.fetchPodcasts(
                category: nil,
                page: 1,
                limit: contentPageSize
            )
            items = response.shows.map { show in
                let item = CPListItem(
                    text: show.title ?? show.id,
                    detailText: show.author
                )
                item.accessoryType = .disclosureIndicator
                item.handler = { [weak self] _, completion in
                    Task { @MainActor [weak self] in
                        await self?.pushPodcastEpisodes(
                            showId: show.id,
                            showTitle: show.title,
                            showCover: show.cover
                        )
                        completion()
                    }
                }
                self.loadArtwork(urlString: show.cover, for: item)
                return item
            }
        } catch {
            logger.error("Failed to load podcasts", error: error)
        }

        let section = CPListSection(items: items)
        let template = CPListTemplate(title: "Podcasts", sections: [section])
        template.tabSystemItem = .mostRecent
        return template
    }

    private func pushPodcastEpisodes(showId: String, showTitle: String?, showCover: String?) async {
        var items: [CPListItem] = []

        do {
            let response = try await repositories.podcasts.fetchEpisodes(
                showId: showId,
                page: 1,
                limit: contentPageSize
            )
            items = response.episodes.map { episode in
                let item = CPListItem(
                    text: episode.title ?? episode.id,
                    detailText: episode.duration
                )
                item.handler = { [weak self] _, completion in
                    Task { @MainActor [weak self] in
                        self?.playEpisode(episode, showTitle: showTitle, showCover: showCover)
                        completion()
                    }
                }
                self.loadArtwork(urlString: episode.thumbnail, for: item)
                return item
            }
        } catch {
            logger.error("Failed to load podcast episodes", error: error, context: ["showId": showId])
        }

        let section = CPListSection(items: items)
        let template = CPListTemplate(title: showTitle ?? "Episodes", sections: [section])
        interfaceController?.pushTemplate(template, animated: true, completion: nil)
    }

    private func playEpisode(_ episode: PodcastEpisodeItem, showTitle: String?, showCover: String?) {
        if let urlStr = episode.audioUrl, let url = URL(string: urlStr) {
            let coverURL: URL? = showCover.flatMap { URL(string: $0) }
            playbackController.playDirectURL(
                url: url,
                title: episode.title ?? "Episode",
                subtitle: showTitle,
                artworkURL: coverURL,
                contentId: episode.id,
                contentType: .podcast
            )
        } else {
            Task {
                await playbackController.play(contentId: episode.id, contentType: .podcast)
            }
        }
    }

    // MARK: - Audiobooks Tab

    private func buildAudiobookTab() async -> CPListTemplate {
        var items: [CPListItem] = []

        do {
            let response = try await repositories.audiobook.fetchAll(
                page: 1,
                limit: contentPageSize,
                genre: nil,
                author: nil
            )
            items = (response.items ?? []).map { book in
                let item = CPListItem(
                    text: book.title ?? book.id,
                    detailText: book.author
                )
                item.handler = { [weak self] _, completion in
                    Task { @MainActor [weak self] in
                        await self?.playbackController.play(
                            contentId: book.id,
                            contentType: .audiobook
                        )
                        completion()
                    }
                }
                self.loadArtwork(urlString: book.thumbnail, for: item)
                return item
            }
        } catch {
            logger.error("Failed to load audiobooks", error: error)
        }

        let section = CPListSection(items: items)
        let template = CPListTemplate(title: "Audiobooks", sections: [section])
        template.tabSystemItem = .downloads
        return template
    }

    // MARK: - Live TV Tab

    private func buildLiveTVTab() async -> CPListTemplate {
        var items: [CPListItem] = []

        do {
            let response = try await repositories.liveTV.fetchChannels(
                cultureId: nil,
                category: nil
            )
            items = response.channels.map { channel in
                let item = CPListItem(
                    text: channel.name ?? channel.id,
                    detailText: channel.currentShow
                )
                item.handler = { [weak self] _, completion in
                    Task { @MainActor [weak self] in
                        await self?.playbackController.play(
                            contentId: channel.id,
                            contentType: .liveTV
                        )
                        completion()
                    }
                }
                self.loadArtwork(urlString: channel.logo ?? channel.thumbnail, for: item)
                return item
            }
        } catch {
            logger.error("Failed to load live TV channels", error: error)
        }

        let section = CPListSection(items: items)
        let template = CPListTemplate(title: "Live TV", sections: [section])
        template.tabSystemItem = .topRated
        return template
    }

    // MARK: - Image Loading

    private func loadArtwork(urlString: String?, for item: CPListItem) {
        guard let urlString, let url = URL(string: urlString) else { return }

        Task { [weak item] in
            guard let image = await imageLoader.loadImage(from: url) else { return }
            item?.setImage(image)
        }
    }
}
