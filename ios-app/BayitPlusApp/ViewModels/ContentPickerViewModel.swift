import BayitCore
import Foundation
import Observation

/// ViewModel for the content picker - loads content from all 4 browsable repositories
/// and provides client-side search filtering by tab and query.
@MainActor
@Observable
final class ContentPickerViewModel {

    private(set) var channelItems: [ContentPickerItem] = []
    private(set) var podcastItems: [ContentPickerItem] = []
    private(set) var radioItems: [ContentPickerItem] = []
    private(set) var audiobookItems: [ContentPickerItem] = []
    private(set) var isLoading = false
    private(set) var error: String?

    var selectedTab: ContentPickerTab = .channels
    var searchQuery = ""

    /// Items filtered by the current tab and search query.
    var filteredItems: [ContentPickerItem] {
        let source: [ContentPickerItem]
        switch selectedTab {
        case .channels: source = channelItems
        case .podcasts: source = podcastItems
        case .radio: source = radioItems
        case .audiobooks: source = audiobookItems
        }

        let trimmed = searchQuery.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return source }

        let lowered = trimmed.lowercased()
        return source.filter { item in
            item.title.lowercased().contains(lowered)
                || (item.subtitle?.lowercased().contains(lowered) ?? false)
        }
    }

    private let liveTVRepo: any LiveTVRepository
    private let podcastRepo: any PodcastRepository
    private let radioRepo: any RadioRepository
    private let audiobookRepo: any AudiobookRepository
    private let logger = BayitLogger(category: "ContentPicker")

    init(
        liveTV: any LiveTVRepository,
        podcasts: any PodcastRepository,
        radio: any RadioRepository,
        audiobook: any AudiobookRepository
    ) {
        self.liveTVRepo = liveTV
        self.podcastRepo = podcasts
        self.radioRepo = radio
        self.audiobookRepo = audiobook
    }

    /// Load all content concurrently from the 4 repositories.
    func loadAll() async {
        guard !isLoading else { return }
        isLoading = true
        error = nil

        await withTaskGroup(of: Void.self) { group in
            group.addTask { await self.loadChannels() }
            group.addTask { await self.loadPodcasts() }
            group.addTask { await self.loadRadio() }
            group.addTask { await self.loadAudiobooks() }
        }

        isLoading = false
    }

    // MARK: - Private Loaders

    private func loadChannels() async {
        do {
            let response = try await liveTVRepo.fetchChannels(cultureId: nil, category: nil)
            channelItems = response.channels.map { ContentPickerItem(channel: $0) }
        } catch {
            logger.error("Failed to load channels", error: error)
            if self.error == nil { self.error = error.localizedDescription }
        }
    }

    private func loadPodcasts() async {
        do {
            let response = try await podcastRepo.fetchPodcasts(category: nil, page: 1, limit: 100)
            podcastItems = response.shows.map { ContentPickerItem(podcast: $0) }
        } catch {
            logger.error("Failed to load podcasts", error: error)
            if self.error == nil { self.error = error.localizedDescription }
        }
    }

    private func loadRadio() async {
        do {
            let response = try await radioRepo.fetchStations(cultureId: nil, genre: nil)
            radioItems = response.stations.map { ContentPickerItem(station: $0) }
        } catch {
            logger.error("Failed to load radio stations", error: error)
            if self.error == nil { self.error = error.localizedDescription }
        }
    }

    private func loadAudiobooks() async {
        do {
            let response = try await audiobookRepo.fetchAll(page: 1, limit: 100, genre: nil, author: nil)
            audiobookItems = (response.items ?? []).map { ContentPickerItem(audiobook: $0) }
        } catch {
            logger.error("Failed to load audiobooks", error: error)
            if self.error == nil { self.error = error.localizedDescription }
        }
    }
}
