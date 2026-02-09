import XCTest
@testable import BayitPlusApp

final class HomeViewModelTests: XCTestCase {

    private var viewModel: HomeViewModel!
    private var mockContentRepository: MockContentRepository!
    private var mockLiveTVRepository: MockLiveTVRepository!
    private var mockLocationProvider: MockLocationProvider!

    override func setUp() {
        super.setUp()
        mockContentRepository = MockContentRepository()
        mockLiveTVRepository = MockLiveTVRepository()
        mockLocationProvider = MockLocationProvider()
        viewModel = HomeViewModel(
            repository: mockContentRepository,
            liveTVRepository: mockLiveTVRepository,
            locationProvider: mockLocationProvider
        )
    }

    override func tearDown() {
        viewModel = nil
        mockContentRepository = nil
        mockLiveTVRepository = nil
        mockLocationProvider = nil
        super.tearDown()
    }

    // MARK: - Initial State Tests

    func test_initialState_allPropertiesHaveDefaults() {
        XCTAssertNil(viewModel.hero)
        XCTAssertEqual(viewModel.spotlight, [])
        XCTAssertEqual(viewModel.categories, [])
        XCTAssertEqual(viewModel.liveChannels, [])
        XCTAssertEqual(viewModel.continueWatching, [])
        XCTAssertNil(viewModel.israelisInCity)
        XCTAssertNil(viewModel.israeliBusinesses)
        XCTAssertNil(viewModel.telAvivContent)
        XCTAssertNil(viewModel.jerusalemContent)
        XCTAssertEqual(viewModel.trendingContent, [])
        XCTAssertFalse(viewModel.isLoading)
        XCTAssertNil(viewModel.error)
    }

    // MARK: - Load Featured Tests

    @MainActor
    func test_loadFeatured_success_populatesData() async {
        let expectation = XCTestExpectation(description: "Load featured content")

        mockContentRepository.shouldSucceed = true

        await viewModel.loadFeatured()

        XCTAssertNotNil(viewModel.hero)
        XCTAssertEqual(viewModel.hero?.title, "Test Hero")
        XCTAssertEqual(viewModel.spotlight.count, 2)
        XCTAssertEqual(viewModel.categories.count, 3)
        XCTAssertFalse(viewModel.isLoading)
        XCTAssertNil(viewModel.error)

        expectation.fulfill()
        await fulfillment(of: [expectation], timeout: 5.0)
    }

    @MainActor
    func test_loadFeatured_failure_setsError() async {
        let expectation = XCTestExpectation(description: "Load featured content fails")

        mockContentRepository.shouldSucceed = false

        await viewModel.loadFeatured()

        XCTAssertNil(viewModel.hero)
        XCTAssertEqual(viewModel.spotlight, [])
        XCTAssertEqual(viewModel.categories, [])
        XCTAssertFalse(viewModel.isLoading)
        XCTAssertNotNil(viewModel.error)
        XCTAssertEqual(viewModel.error, "Mock error")

        expectation.fulfill()
        await fulfillment(of: [expectation], timeout: 5.0)
    }

    @MainActor
    func test_loadFeatured_stateTransition_loadingToLoaded() async {
        let expectation = XCTestExpectation(description: "State transitions correctly")

        mockContentRepository.shouldSucceed = true

        XCTAssertFalse(viewModel.isLoading)

        Task {
            await viewModel.loadFeatured()
            XCTAssertFalse(viewModel.isLoading)
            expectation.fulfill()
        }

        await fulfillment(of: [expectation], timeout: 5.0)
    }

    @MainActor
    func test_loadFeatured_preventsReentrantCalls() async {
        mockContentRepository.shouldSucceed = true

        let task1 = Task {
            await viewModel.loadFeatured()
        }

        let task2 = Task {
            await viewModel.loadFeatured()
        }

        await task1.value
        await task2.value

        XCTAssertEqual(mockContentRepository.fetchFeaturedCallCount, 1)
    }

    // MARK: - Refresh Tests

    @MainActor
    func test_refresh_success_updatesData() async {
        let expectation = XCTestExpectation(description: "Refresh content")

        mockContentRepository.shouldSucceed = true

        await viewModel.refresh()

        XCTAssertNotNil(viewModel.hero)
        XCTAssertFalse(viewModel.isLoading)
        XCTAssertNil(viewModel.error)

        expectation.fulfill()
        await fulfillment(of: [expectation], timeout: 5.0)
    }

    @MainActor
    func test_refresh_clearsExistingError() async {
        let expectation = XCTestExpectation(description: "Refresh clears error")

        mockContentRepository.shouldSucceed = false
        await viewModel.loadFeatured()
        XCTAssertNotNil(viewModel.error)

        mockContentRepository.shouldSucceed = true
        await viewModel.refresh()

        XCTAssertNil(viewModel.error)

        expectation.fulfill()
        await fulfillment(of: [expectation], timeout: 5.0)
    }

    // MARK: - Additional Sections Tests

    @MainActor
    func test_loadFeatured_loadsLiveChannels() async {
        let expectation = XCTestExpectation(description: "Loads live channels")

        mockContentRepository.shouldSucceed = true
        mockLiveTVRepository.shouldSucceed = true

        await viewModel.loadFeatured()

        try? await Task.sleep(for: .milliseconds(100))

        XCTAssertEqual(viewModel.liveChannels.count, 8)

        expectation.fulfill()
        await fulfillment(of: [expectation], timeout: 5.0)
    }

    @MainActor
    func test_loadFeatured_loadsContinueWatching() async {
        let expectation = XCTestExpectation(description: "Loads continue watching")

        mockContentRepository.shouldSucceed = true

        await viewModel.loadFeatured()

        try? await Task.sleep(for: .milliseconds(100))

        XCTAssertGreaterThan(viewModel.continueWatching.count, 0)

        expectation.fulfill()
        await fulfillment(of: [expectation], timeout: 5.0)
    }

    @MainActor
    func test_loadFeatured_loadsTrendingContent() async {
        let expectation = XCTestExpectation(description: "Loads trending content")

        mockContentRepository.shouldSucceed = true

        await viewModel.loadFeatured()

        try? await Task.sleep(for: .milliseconds(100))

        XCTAssertEqual(viewModel.trendingContent.isEmpty, true)

        expectation.fulfill()
        await fulfillment(of: [expectation], timeout: 5.0)
    }
}

// MARK: - Mock Implementations

private final class MockContentRepository: ContentRepository {
    var shouldSucceed = true
    var fetchFeaturedCallCount = 0

    func fetchFeatured() async throws -> FeaturedResponse {
        fetchFeaturedCallCount += 1

        if shouldSucceed {
            return FeaturedResponse(
                hero: HeroContent(
                    contentId: "hero1",
                    title: "Test Hero",
                    subtitle: "Test Subtitle",
                    imageUrl: "https://example.com/hero.jpg",
                    ctaText: "Watch Now",
                    contentType: .movie
                ),
                spotlight: [
                    SpotlightItem(contentId: "spot1", title: "Spotlight 1", imageUrl: "https://example.com/s1.jpg", contentType: .movie),
                    SpotlightItem(contentId: "spot2", title: "Spotlight 2", imageUrl: "https://example.com/s2.jpg", contentType: .series)
                ],
                categories: [
                    ContentCategory(id: "cat1", name: "Category 1", items: []),
                    ContentCategory(id: "cat2", name: "Category 2", items: []),
                    ContentCategory(id: "cat3", name: "Category 3", items: [])
                ]
            )
        } else {
            throw NSError(domain: "test", code: 1, userInfo: [NSLocalizedDescriptionKey: "Mock error"])
        }
    }

    func fetchContinueWatching() async throws -> WatchHistoryResponse {
        if shouldSucceed {
            return WatchHistoryResponse(items: [
                WatchHistoryItem(
                    contentId: "c1",
                    title: "Continued 1",
                    progress: 0.5,
                    thumbnail: "https://example.com/c1.jpg",
                    contentType: .movie,
                    duration: 7200
                )
            ])
        } else {
            throw NSError(domain: "test", code: 1, userInfo: [NSLocalizedDescriptionKey: "Mock error"])
        }
    }

    func fetchTelAvivContent() async throws -> CityContentResponse {
        if shouldSucceed {
            return CityContentResponse(city: "Tel Aviv", items: [])
        } else {
            throw NSError(domain: "test", code: 1, userInfo: [NSLocalizedDescriptionKey: "Mock error"])
        }
    }

    func fetchJerusalemContent() async throws -> CityContentResponse {
        if shouldSucceed {
            return CityContentResponse(city: "Jerusalem", items: [])
        } else {
            throw NSError(domain: "test", code: 1, userInfo: [NSLocalizedDescriptionKey: "Mock error"])
        }
    }

    func fetchTrending(cultureId: String) async throws -> [CultureTrendingItem] {
        if shouldSucceed {
            return []
        } else {
            throw NSError(domain: "test", code: 1, userInfo: [NSLocalizedDescriptionKey: "Mock error"])
        }
    }

    func fetchIsraelisInCity(city: String, state: String) async throws -> IsraelisInCityResponse {
        if shouldSucceed {
            return IsraelisInCityResponse(city: city, count: 100, profiles: [])
        } else {
            throw NSError(domain: "test", code: 1, userInfo: [NSLocalizedDescriptionKey: "Mock error"])
        }
    }

    func fetchIsraeliBusinesses(city: String, state: String) async throws -> IsraeliBusinessesResponse {
        if shouldSucceed {
            return IsraeliBusinessesResponse(city: city, businesses: [])
        } else {
            throw NSError(domain: "test", code: 1, userInfo: [NSLocalizedDescriptionKey: "Mock error"])
        }
    }

    func fetchAllContent(page: Int, limit: Int) async throws -> ContentListResponse { fatalError() }
    func fetchContentDetail(id: String) async throws -> ContentDetail { fatalError() }
    func searchContent(query: String, type: String?, page: Int, limit: Int) async throws -> SearchResponse { fatalError() }
}

private final class MockLiveTVRepository: LiveTVRepository {
    var shouldSucceed = true

    func fetchChannels(cultureId: String?, category: String?) async throws -> LiveChannelsResponse {
        if shouldSucceed {
            let channels = (1...10).map { i in
                LiveChannelItem(
                    id: "ch\(i)",
                    name: "Channel \(i)",
                    logo: "https://example.com/ch\(i).jpg",
                    streamUrl: "https://example.com/stream\(i).m3u8",
                    currentShow: "Show \(i)",
                    category: "News",
                    cultureId: "israeli"
                )
            }
            return LiveChannelsResponse(channels: channels)
        } else {
            throw NSError(domain: "test", code: 1, userInfo: [NSLocalizedDescriptionKey: "Mock error"])
        }
    }

    func fetchChannelDetail(id: String) async throws -> LiveChannelDetail { fatalError() }
    func fetchEPG(channelId: String, date: String?) async throws -> EPGResponse { fatalError() }
}

private final class MockLocationProvider: AppLocationProvider {
    var mockLocation: UserLocation?

    func currentLocation() async -> UserLocation? {
        return mockLocation
    }
}
