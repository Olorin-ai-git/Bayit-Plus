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
    var hero: HeroContent?
    var spotlight: [SpotlightItem] = []
    var categories: [ContentCategory] = []
    var liveChannels: [LiveChannelItem] = []
    var continueWatching: [WatchHistoryItem] = []
    var featuredCollections: [CollectionDetail] = []
    var israelisInCity: IsraelisInCityResponse?
    var israeliBusinesses: IsraeliBusinessesResponse?
    var telAvivContent: CityContentResponse?
    var jerusalemContent: CityContentResponse?
    var cultureCities: [CultureCityWithContent] = []
    var trendingContent: [CultureTrendingItem] = []
    var youngstersTrending: [SectionContentItem] = []
    var radioStations: [RadioStationItem] = []
    var isLoading = false
    var error: String?

    let contentRepo: any ContentRepository
    let mediaRepo: any MediaRepository
    let liveTVRepo: any LiveTVRepository
    let radioRepo: any RadioRepository
    let locationService: any LocationProvider
    let flags: FeatureFlags
    let categoryRepo: (any CategoryRepository)?
    let contentRowLimit: Int
    let defaultCultureId: String
    let hiddenChannelKeywords: [String]
    var contentLanguage: String = "he"
    #if !os(tvOS)
        let widgetSyncService: WidgetDataSyncService?
    #endif

    #if os(tvOS)
        init(
            repository: any ContentRepository,
            mediaRepository: any MediaRepository,
            liveTVRepository: any LiveTVRepository,
            radioRepository: any RadioRepository,
            locationProvider: any LocationProvider,
            featureFlags: FeatureFlags,
            categoryRepository: (any CategoryRepository)? = nil,
            contentRowLimit: Int,
            defaultCultureId: String,
            hiddenChannelKeywords: [String]
        ) {
            contentRepo = repository
            mediaRepo = mediaRepository
            liveTVRepo = liveTVRepository
            radioRepo = radioRepository
            locationService = locationProvider
            flags = featureFlags
            categoryRepo = categoryRepository
            self.contentRowLimit = contentRowLimit
            self.defaultCultureId = defaultCultureId
            self.hiddenChannelKeywords = hiddenChannelKeywords
        }
    #else
        init(
            repository: any ContentRepository,
            mediaRepository: any MediaRepository,
            liveTVRepository: any LiveTVRepository,
            radioRepository: any RadioRepository,
            locationProvider: any LocationProvider,
            featureFlags: FeatureFlags,
            categoryRepository: (any CategoryRepository)? = nil,
            widgetSync: WidgetDataSyncService? = nil,
            contentRowLimit: Int,
            defaultCultureId: String,
            hiddenChannelKeywords: [String]
        ) {
            contentRepo = repository
            mediaRepo = mediaRepository
            liveTVRepo = liveTVRepository
            radioRepo = radioRepository
            locationService = locationProvider
            flags = featureFlags
            categoryRepo = categoryRepository
            widgetSyncService = widgetSync
            self.contentRowLimit = contentRowLimit
            self.defaultCultureId = defaultCultureId
            self.hiddenChannelKeywords = hiddenChannelKeywords
        }
    #endif

    @MainActor
    func loadFeatured() async {
        guard !isLoading else { return }
        isLoading = true
        error = nil

        // Launch additional sections in background - don't block on them
        let sectionsTask = Task { await loadAdditionalSections() }

        do {
            let response = try await contentRepo.fetchFeatured()
            hero = response.hero
            spotlight = response.spotlight
            categories = response.categories
        } catch {
            if !error.isCancellation {
                if let message = error.userFriendlyMessage {
                    self.error = message
                }
            }
        }

        // Featured content is ready - stop blocking the UI
        isLoading = false

        // Let additional sections finish in the background (they update their
        // own published properties individually, so rows appear progressively)
        await sectionsTask.value
    }

    @MainActor
    func refresh() async {
        error = nil
        isLoading = true

        let sectionsTask = Task { await loadAdditionalSections() }

        do {
            let response = try await contentRepo.fetchFeatured()
            hero = response.hero
            spotlight = response.spotlight
            categories = response.categories
        } catch {
            if !error.isCancellation {
                if let message = error.userFriendlyMessage {
                    self.error = message
                }
            }
        }

        isLoading = false
        await sectionsTask.value
    }

    /// Refresh only the continue watching section (called when player is dismissed)
    @MainActor
    func refreshContinueWatching() async {
        await loadContinueWatching()
    }

    /// Load additional sections in parallel (non-blocking)
    @MainActor
    private func loadAdditionalSections() async {
        let lang = contentLanguage
        async let liveTask: Void = loadLiveChannels()
        async let radioTask: Void = loadRadioStations()
        async let continueTask: Void = loadContinueWatching()
        async let collectionsTask: Void = loadFeaturedCollections()
        async let telAvivTask: Void = loadTelAvivContent(lang: lang)
        async let jerusalemTask: Void = loadJerusalemContent(lang: lang)
        async let citiesTask: Void = loadCultureCities()
        async let trendingTask: Void = loadTrending(lang: lang)
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
}
