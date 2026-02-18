import BayitNetworking
#if !os(tvOS)
import BayitWidgetShared
#endif
import Foundation
import Observation

// Note: ContentModels, LiveTVModels, and LocationModels are imported implicitly
// via the repository protocols which use these types in their method signatures.

/// ViewModel for the Home screen - manages featured content, categories, and spotlight
@MainActor
@Observable
final class HomeViewModel {
    private(set) var hero: HeroContent?
    private(set) var spotlight: [SpotlightItem] = []
    private(set) var categories: [ContentCategory] = []
    private(set) var liveChannels: [LiveChannelItem] = []
    private(set) var continueWatching: [WatchHistoryItem] = []
    private(set) var featuredCollections: [CollectionDetail] = []
    private(set) var israelisInCity: IsraelisInCityResponse?
    private(set) var israeliBusinesses: IsraeliBusinessesResponse?
    private(set) var telAvivContent: CityContentResponse?
    private(set) var jerusalemContent: CityContentResponse?
    private(set) var cultureCities: [CultureCityWithContent] = []
    private(set) var trendingContent: [CultureTrendingItem] = []
    private(set) var youngstersTrending: [SectionContentItem] = []
    private(set) var radioStations: [RadioStationItem] = []
    private(set) var isLoading = false
    private(set) var error: String?

    private let repository: any ContentRepository
    private let liveTVRepository: any LiveTVRepository
    private let radioRepository: any RadioRepository
    private let locationProvider: any LocationProvider
    private let featureFlags: FeatureFlags
    private let categoryRepository: (any CategoryRepository)?
    #if !os(tvOS)
    private let widgetSync: WidgetDataSyncService?
    #endif

    #if os(tvOS)
    init(
        repository: any ContentRepository,
        liveTVRepository: any LiveTVRepository,
        radioRepository: any RadioRepository,
        locationProvider: any LocationProvider,
        featureFlags: FeatureFlags,
        categoryRepository: (any CategoryRepository)? = nil
    ) {
        self.repository = repository
        self.liveTVRepository = liveTVRepository
        self.radioRepository = radioRepository
        self.locationProvider = locationProvider
        self.featureFlags = featureFlags
        self.categoryRepository = categoryRepository
    }
    #else
    init(
        repository: any ContentRepository,
        liveTVRepository: any LiveTVRepository,
        radioRepository: any RadioRepository,
        locationProvider: any LocationProvider,
        featureFlags: FeatureFlags,
        categoryRepository: (any CategoryRepository)? = nil,
        widgetSync: WidgetDataSyncService? = nil
    ) {
        self.repository = repository
        self.liveTVRepository = liveTVRepository
        self.radioRepository = radioRepository
        self.locationProvider = locationProvider
        self.featureFlags = featureFlags
        self.categoryRepository = categoryRepository
        self.widgetSync = widgetSync
    }
    #endif

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
            // Don't show cancellation errors to users - they're expected when views are dismissed
            if !isCancellationError(error) {
                if let message = error.userFriendlyMessage {
                    self.error = message
                }
            }
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
            // Don't show cancellation errors to users - they're expected when views are dismissed
            if !isCancellationError(error) {
                if let message = error.userFriendlyMessage {
                    self.error = message
                }
            }
        }

        isLoading = false

        // Refresh additional sections
        await loadAdditionalSections()
    }

    /// Load additional sections in parallel (non-blocking)
    @MainActor
    private func loadAdditionalSections() async {
        async let liveTask: Void = loadLiveChannels()
        async let radioTask: Void = loadRadioStations()
        async let continueTask: Void = loadContinueWatching()
        async let collectionsTask: Void = loadFeaturedCollections()
        async let telAvivTask: Void = loadTelAvivContent()
        async let jerusalemTask: Void = loadJerusalemContent()
        async let citiesTask: Void = loadCultureCities()
        async let trendingTask: Void = loadTrending()
        async let locationTask: Void = loadLocationContent()
        async let youngstersTask: Void = loadYoungstersTrending()

        await liveTask
        await radioTask
        await continueTask
        await collectionsTask
        await telAvivTask
        await jerusalemTask
        await citiesTask
        await trendingTask
        await locationTask
        await youngstersTask
    }

    // Hidden channels (King 5, CNN, ABC) are legacy features - controlled by feature flag
    private static let hiddenChannelKeywords = ["king 5", "king5", "cnn", "abc"]

    @MainActor
    private func loadLiveChannels() async {
        do {
            let response = try await liveTVRepository.fetchChannels(cultureId: nil, category: nil)
            let filtered: [LiveChannelItem]
            if featureFlags.isLegacyFeaturesEnabled {
                filtered = response.channels
            } else {
                filtered = response.channels.filter { channel in
                    guard let name = channel.name?.lowercased() else { return true }
                    return !Self.hiddenChannelKeywords.contains(where: { name.contains($0) })
                }
            }
            liveChannels = Array(filtered.prefix(8))  // First 8 channels
        } catch {
            // Non-blocking: silently fail and hide section
            liveChannels = []
        }
    }

    @MainActor
    private func loadRadioStations() async {
        do {
            let response = try await radioRepository.fetchStations(cultureId: nil, genre: nil)
            radioStations = Array(response.stations.prefix(8))
        } catch {
            radioStations = []
        }
    }

    @MainActor
    private func loadFeaturedCollections() async {
        do {
            featuredCollections = try await repository.fetchCollectionRecommendations()
        } catch {
            featuredCollections = []
        }
    }

    /// Refresh only the continue watching section (called when player is dismissed)
    @MainActor
    func refreshContinueWatching() async {
        await loadContinueWatching()
    }

    @MainActor
    private func loadContinueWatching() async {
        do {
            let response = try await repository.fetchContinueWatching()
            continueWatching = response.items
            #if !os(tvOS)
            if let sync = widgetSync, !response.items.isEmpty {
                let sharedItems = response.items.map { item in
                    SharedContinueWatchingItem(
                        id: item.id,
                        contentID: item.id,
                        title: item.title ?? "",
                        thumbnailURL: item.thumbnail.flatMap { URL(string: $0) },
                        progress: item.progress ?? 0,
                        durationSeconds: Int(item.duration ?? 0),
                        contentType: {
                            switch item.type?.lowercased() {
                            case "live_tv", "live", "channel": return SharedContentType.liveTV
                            case "radio": return SharedContentType.radio
                            case "podcast": return SharedContentType.podcast
                            case "audiobook": return SharedContentType.audiobook
                            default: return SharedContentType.vod
                            }
                        }()
                    )
                }
                await sync.syncContinueWatching(sharedItems)
            }
            #endif
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

        async let israelisTask: Void = loadIsraelisInCity(city: city, state: state)
        async let businessesTask: Void = loadIsraeliBusinesses(city: city, state: state)

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

    @MainActor
    private func loadYoungstersTrending() async {
        guard let catRepo = categoryRepository else { return }
        do {
            let response = try await catRepo.fetchYoungstersTrending()
            youngstersTrending = response.items
        } catch {
            youngstersTrending = []
        }
    }

    @MainActor
    private func loadCultureCities() async {
        guard let catRepo = categoryRepository else { return }
        do {
            let cities = try await catRepo.fetchCultureCities(cultureId: "israeli", featuredOnly: true)

            var citiesWithContent: [CultureCityWithContent] = []
            for city in cities where city.cityId != "jerusalem" && city.cityId != "tel-aviv" {
                if let content = try? await catRepo.fetchCityContent(
                    cultureId: "israeli",
                    cityId: city.cityId,
                    limit: 10
                ), !content.items.isEmpty {
                    citiesWithContent.append(CultureCityWithContent(city: city, content: content))
                }
            }
            cultureCities = citiesWithContent
        } catch {
            cultureCities = []
        }
    }

    // MARK: - Helper Methods

    /// Check if an error is a cancellation error (user navigated away, task was cancelled, etc.)
    /// These errors are expected and shouldn't be shown to users.
    private func isCancellationError(_ error: Error) -> Bool {
        // Check for CancellationError
        if error is CancellationError {
            return true
        }

        // Check for URLError.cancelled
        if let urlError = error as? URLError, urlError.code == .cancelled {
            return true
        }

        // Check for NSError with cancelled domain
        let nsError = error as NSError
        if nsError.domain == NSURLErrorDomain && nsError.code == NSURLErrorCancelled {
            return true
        }

        return false
    }
}

// MARK: - Supporting Types

/// Culture city with its featured content for dynamic city rows.
struct CultureCityWithContent: Sendable, Identifiable {
    let city: CultureCity
    let content: CultureContentResponse

    var id: String { city.id }
}
