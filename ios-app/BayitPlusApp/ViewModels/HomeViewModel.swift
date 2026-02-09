import Foundation
import Observation

// Note: ContentModels, LiveTVModels, and LocationModels are imported implicitly
// via the repository protocols which use these types in their method signatures.

/// ViewModel for the Home screen - manages featured content, categories, and spotlight
@Observable
final class HomeViewModel {
    private(set) var hero: HeroContent?
    private(set) var spotlight: [SpotlightItem] = []
    private(set) var categories: [ContentCategory] = []
    private(set) var liveChannels: [LiveChannelItem] = []
    private(set) var continueWatching: [WatchHistoryItem] = []
    private(set) var israelisInCity: IsraelisInCityResponse?
    private(set) var israeliBusinesses: IsraeliBusinessesResponse?
    private(set) var telAvivContent: CityContentResponse?
    private(set) var jerusalemContent: CityContentResponse?
    private(set) var trendingContent: [CultureTrendingItem] = []
    private(set) var isLoading = false
    private(set) var error: String?

    private let repository: any ContentRepository
    private let liveTVRepository: any LiveTVRepository
    private let locationProvider: AppLocationProvider

    init(
        repository: any ContentRepository,
        liveTVRepository: any LiveTVRepository,
        locationProvider: AppLocationProvider
    ) {
        self.repository = repository
        self.liveTVRepository = liveTVRepository
        self.locationProvider = locationProvider
    }

    @MainActor
    func loadFeatured() async {
        guard !isLoading else { return }
        isLoading = true
        error = nil

        do {
            let response = try await repository.fetchFeatured()
            hero = response.hero
            spotlight = response.spotlight
            categories = response.categories
        } catch {
            self.error = error.localizedDescription
        }

        isLoading = false

        // Load additional sections in parallel (non-blocking)
        await loadAdditionalSections()
    }

    @MainActor
    func refresh() async {
        error = nil
        isLoading = true

        do {
            let response = try await repository.fetchFeatured()
            hero = response.hero
            spotlight = response.spotlight
            categories = response.categories
        } catch {
            self.error = error.localizedDescription
        }

        isLoading = false

        // Refresh additional sections
        await loadAdditionalSections()
    }

    /// Load additional sections in parallel (non-blocking)
    @MainActor
    private func loadAdditionalSections() async {
        async let liveTask = loadLiveChannels()
        async let continueTask = loadContinueWatching()
        async let telAvivTask = loadTelAvivContent()
        async let jerusalemTask = loadJerusalemContent()
        async let trendingTask = loadTrending()
        async let locationTask = loadLocationContent()

        await liveTask
        await continueTask
        await telAvivTask
        await jerusalemTask
        await trendingTask
        await locationTask
    }

    @MainActor
    private func loadLiveChannels() async {
        do {
            let response = try await liveTVRepository.fetchChannels(cultureId: nil, category: nil)
            liveChannels = Array(response.channels.prefix(8))  // First 8 channels
        } catch {
            // Non-blocking: silently fail and hide section
            liveChannels = []
        }
    }

    @MainActor
    private func loadContinueWatching() async {
        do {
            let response = try await repository.fetchContinueWatching()
            continueWatching = response.items
        } catch {
            // Non-blocking: silently fail (user may not be authenticated)
            continueWatching = []
        }
    }

    @MainActor
    private func loadTelAvivContent() async {
        do {
            telAvivContent = try await repository.fetchTelAvivContent()
        } catch {
            telAvivContent = nil
        }
    }

    @MainActor
    private func loadJerusalemContent() async {
        do {
            jerusalemContent = try await repository.fetchJerusalemContent()
        } catch {
            jerusalemContent = nil
        }
    }

    @MainActor
    private func loadTrending() async {
        do {
            trendingContent = try await repository.fetchTrending(cultureId: "israeli")
        } catch {
            trendingContent = []
        }
    }

    @MainActor
    private func loadLocationContent() async {
        guard let location = await locationProvider.currentLocation(),
              let city = location.city else {
            israelisInCity = nil
            israeliBusinesses = nil
            return
        }
        let state = location.state ?? ""

        async let israelisTask = loadIsraelisInCity(city: city, state: state)
        async let businessesTask = loadIsraeliBusinesses(city: city, state: state)

        await israelisTask
        await businessesTask
    }

    @MainActor
    private func loadIsraelisInCity(city: String, state: String) async {
        do {
            israelisInCity = try await repository.fetchIsraelisInCity(city: city, state: state)
        } catch {
            israelisInCity = nil
        }
    }

    @MainActor
    private func loadIsraeliBusinesses(city: String, state: String) async {
        do {
            israeliBusinesses = try await repository.fetchIsraeliBusinesses(city: city, state: state)
        } catch {
            israeliBusinesses = nil
        }
    }
}
