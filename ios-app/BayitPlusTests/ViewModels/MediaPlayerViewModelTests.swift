import XCTest
import BayitMedia
@testable import BayitPlusApp

final class MediaPlayerViewModelTests: XCTestCase {

    private var viewModel: MediaPlayerViewModel!
    private var mockMediaRepository: MockMediaRepository!
    private var mockContentRepository: MockContentRepository!
    private var mockLiveTVRepository: MockLiveTVRepository!
    private var mockRadioRepository: MockRadioRepository!
    private var mockPodcastRepository: MockPodcastRepository!
    private var mockPlayer: MockMediaPlayer!

    override func setUp() {
        super.setUp()
        mockMediaRepository = MockMediaRepository()
        mockContentRepository = MockContentRepository()
        mockLiveTVRepository = MockLiveTVRepository()
        mockRadioRepository = MockRadioRepository()
        mockPodcastRepository = MockPodcastRepository()
        mockPlayer = MockMediaPlayer()

        viewModel = MediaPlayerViewModel(
            contentId: "test123",
            contentType: .movie,
            player: mockPlayer,
            repository: mockMediaRepository,
            contentRepository: mockContentRepository,
            liveTVRepository: mockLiveTVRepository,
            radioRepository: mockRadioRepository,
            podcastRepository: mockPodcastRepository
        )
    }

    override func tearDown() {
        viewModel = nil
        mockMediaRepository = nil
        mockContentRepository = nil
        mockLiveTVRepository = nil
        mockRadioRepository = nil
        mockPodcastRepository = nil
        mockPlayer = nil
        super.tearDown()
    }

    // MARK: - Initial State Tests

    func test_initialState_allPropertiesHaveDefaults() {
        XCTAssertTrue(viewModel.isLoading)
        XCTAssertNil(viewModel.errorMessage)
        XCTAssertNil(viewModel.title)
        XCTAssertNil(viewModel.subtitle)
        XCTAssertNil(viewModel.artworkURL)
        XCTAssertEqual(viewModel.initialPosition, 0)
        XCTAssertEqual(viewModel.availableQualities, [])
        XCTAssertNil(viewModel.currentQuality)
        XCTAssertEqual(viewModel.availableSubtitleLanguages, [])
        XCTAssertEqual(viewModel.contentId, "test123")
        XCTAssertEqual(viewModel.contentType, .movie)
    }

    // MARK: - Load VOD Content Tests

    @MainActor
    func test_load_vodMovie_success_populatesMetadata() async {
        let expectation = XCTestExpectation(description: "Load VOD movie succeeds")

        mockContentRepository.shouldSucceed = true
        mockMediaRepository.shouldSucceed = true

        await viewModel.load()

        XCTAssertEqual(viewModel.title, "Test Movie")
        XCTAssertEqual(viewModel.subtitle, "Drama")
        XCTAssertNotNil(viewModel.artworkURL)
        XCTAssertFalse(viewModel.isLoading)
        XCTAssertNil(viewModel.errorMessage)
        XCTAssertEqual(mockPlayer.loadCallCount, 1)

        expectation.fulfill()
        await fulfillment(of: [expectation], timeout: 5.0)
    }

    @MainActor
    func test_load_vodMovie_failure_setsError() async {
        let expectation = XCTestExpectation(description: "Load VOD movie fails")

        mockContentRepository.shouldSucceed = false

        await viewModel.load()

        XCTAssertFalse(viewModel.isLoading)
        XCTAssertNotNil(viewModel.errorMessage)
        XCTAssertEqual(viewModel.errorMessage, "Mock error")
        XCTAssertEqual(mockPlayer.loadCallCount, 0)

        expectation.fulfill()
        await fulfillment(of: [expectation], timeout: 5.0)
    }

    @MainActor
    func test_load_vodMovie_invalidStreamURL_setsError() async {
        let expectation = XCTestExpectation(description: "Invalid stream URL")

        mockContentRepository.shouldSucceed = true
        mockMediaRepository.shouldSucceed = false

        await viewModel.load()

        XCTAssertFalse(viewModel.isLoading)
        XCTAssertNotNil(viewModel.errorMessage)

        expectation.fulfill()
        await fulfillment(of: [expectation], timeout: 5.0)
    }

    @MainActor
    func test_load_vodMovie_populatesSubtitleLanguages() async {
        let expectation = XCTestExpectation(description: "Populates subtitle languages")

        mockContentRepository.shouldSucceed = true
        mockMediaRepository.shouldSucceed = true

        await viewModel.load()

        XCTAssertEqual(viewModel.availableSubtitleLanguages.count, 3)
        XCTAssertTrue(viewModel.availableSubtitleLanguages.contains("en"))
        XCTAssertTrue(viewModel.availableSubtitleLanguages.contains("he"))

        expectation.fulfill()
        await fulfillment(of: [expectation], timeout: 5.0)
    }

    // MARK: - Load Live TV Content Tests

    @MainActor
    func test_load_liveTV_success_populatesMetadata() async {
        let expectation = XCTestExpectation(description: "Load live TV succeeds")

        mockLiveTVRepository.shouldSucceed = true
        mockMediaRepository.shouldSucceed = true

        let liveTVViewModel = MediaPlayerViewModel(
            contentId: "ch123",
            contentType: .liveTV,
            player: mockPlayer,
            repository: mockMediaRepository,
            contentRepository: mockContentRepository,
            liveTVRepository: mockLiveTVRepository,
            radioRepository: mockRadioRepository,
            podcastRepository: mockPodcastRepository
        )

        await liveTVViewModel.load()

        XCTAssertEqual(liveTVViewModel.title, "Channel 12")
        XCTAssertEqual(liveTVViewModel.subtitle, "Current Show")
        XCTAssertNotNil(liveTVViewModel.artworkURL)
        XCTAssertFalse(liveTVViewModel.isLoading)
        XCTAssertNil(liveTVViewModel.errorMessage)
        XCTAssertEqual(mockPlayer.loadCallCount, 1)

        expectation.fulfill()
        await fulfillment(of: [expectation], timeout: 5.0)
    }

    @MainActor
    func test_load_liveTV_failure_setsError() async {
        let expectation = XCTestExpectation(description: "Load live TV fails")

        mockLiveTVRepository.shouldSucceed = false

        let liveTVViewModel = MediaPlayerViewModel(
            contentId: "ch123",
            contentType: .liveTV,
            player: mockPlayer,
            repository: mockMediaRepository,
            contentRepository: mockContentRepository,
            liveTVRepository: mockLiveTVRepository,
            radioRepository: mockRadioRepository,
            podcastRepository: mockPodcastRepository
        )

        await liveTVViewModel.load()

        XCTAssertFalse(liveTVViewModel.isLoading)
        XCTAssertNotNil(liveTVViewModel.errorMessage)
        XCTAssertEqual(mockPlayer.loadCallCount, 0)

        expectation.fulfill()
        await fulfillment(of: [expectation], timeout: 5.0)
    }

    @MainActor
    func test_load_liveTV_populatesQualities() async {
        let expectation = XCTestExpectation(description: "Populates quality variants")

        mockLiveTVRepository.shouldSucceed = true
        mockMediaRepository.shouldSucceed = true

        let liveTVViewModel = MediaPlayerViewModel(
            contentId: "ch123",
            contentType: .liveTV,
            player: mockPlayer,
            repository: mockMediaRepository,
            contentRepository: mockContentRepository,
            liveTVRepository: mockLiveTVRepository,
            radioRepository: mockRadioRepository,
            podcastRepository: mockPodcastRepository
        )

        await liveTVViewModel.load()

        XCTAssertEqual(liveTVViewModel.currentQuality, "1080p")
        XCTAssertGreaterThan(liveTVViewModel.availableQualities.count, 0)

        expectation.fulfill()
        await fulfillment(of: [expectation], timeout: 5.0)
    }

    // MARK: - State Transition Tests

    @MainActor
    func test_load_stateTransition_loadingToLoaded() async {
        let expectation = XCTestExpectation(description: "State transitions correctly")

        mockContentRepository.shouldSucceed = true
        mockMediaRepository.shouldSucceed = true

        XCTAssertTrue(viewModel.isLoading)

        Task {
            await viewModel.load()
            XCTAssertFalse(viewModel.isLoading)
            expectation.fulfill()
        }

        await fulfillment(of: [expectation], timeout: 5.0)
    }

    @MainActor
    func test_load_stateTransition_loadingToError() async {
        let expectation = XCTestExpectation(description: "State transitions to error")

        mockContentRepository.shouldSucceed = false

        XCTAssertTrue(viewModel.isLoading)

        Task {
            await viewModel.load()
            XCTAssertFalse(viewModel.isLoading)
            XCTAssertNotNil(viewModel.errorMessage)
            expectation.fulfill()
        }

        await fulfillment(of: [expectation], timeout: 5.0)
    }

    // MARK: - Player Integration Tests

    @MainActor
    func test_load_callsPlayerLoad() async {
        mockContentRepository.shouldSucceed = true
        mockMediaRepository.shouldSucceed = true

        await viewModel.load()

        XCTAssertEqual(mockPlayer.loadCallCount, 1)
        XCTAssertNotNil(mockPlayer.lastLoadedURL)
    }

    @MainActor
    func test_load_passesCorrectContentTypeToPlayer() async {
        mockContentRepository.shouldSucceed = true
        mockMediaRepository.shouldSucceed = true

        await viewModel.load()

        XCTAssertEqual(mockPlayer.lastContentType, .vod)
    }

    // MARK: - Content Type Tests

    func test_contentType_movieMapsCorrectly() {
        XCTAssertEqual(viewModel.contentType, .movie)
    }

    func test_contentType_seriesMapsCorrectly() {
        let seriesViewModel = MediaPlayerViewModel(
            contentId: "test123",
            contentType: .series,
            player: mockPlayer,
            repository: mockMediaRepository,
            contentRepository: mockContentRepository,
            liveTVRepository: mockLiveTVRepository,
            radioRepository: mockRadioRepository,
            podcastRepository: mockPodcastRepository
        )

        XCTAssertEqual(seriesViewModel.contentType, .series)
    }

    func test_contentType_liveTVMapsCorrectly() {
        let liveViewModel = MediaPlayerViewModel(
            contentId: "test123",
            contentType: .liveTV,
            player: mockPlayer,
            repository: mockMediaRepository,
            contentRepository: mockContentRepository,
            liveTVRepository: mockLiveTVRepository,
            radioRepository: mockRadioRepository,
            podcastRepository: mockPodcastRepository
        )

        XCTAssertEqual(liveViewModel.contentType, .liveTV)
    }
}

// MARK: - Mock Implementations

private final class MockMediaRepository: MediaRepository {
    var shouldSucceed = true

    func fetchLiveStream(channelId: String) async throws -> LiveStreamResponse {
        if shouldSucceed {
            return LiveStreamResponse(
                url: "https://example.com/live.m3u8",
                quality: "1080p",
                availableQualities: [
                    QualityVariant(quality: "1080p", url: "https://example.com/live_1080.m3u8"),
                    QualityVariant(quality: "720p", url: "https://example.com/live_720.m3u8")
                ]
            )
        } else {
            throw NSError(domain: "test", code: 1, userInfo: [NSLocalizedDescriptionKey: "Mock error"])
        }
    }
}

private final class MockContentRepository: ContentRepository {
    var shouldSucceed = true

    func fetchContentDetail(id: String) async throws -> ContentDetail {
        if shouldSucceed {
            return ContentDetail(
                id: id,
                title: "Test Movie",
                description: "Test description",
                category: "Drama",
                year: 2024,
                rating: 4.5,
                duration: 7200,
                thumbnail: "https://example.com/thumb.jpg",
                backdrop: "https://example.com/backdrop.jpg",
                streamUrl: "https://example.com/stream.m3u8",
                availableSubtitleLanguages: ["en", "he", "es"],
                contentType: .movie
            )
        } else {
            throw NSError(domain: "test", code: 1, userInfo: [NSLocalizedDescriptionKey: "Mock error"])
        }
    }

    func fetchFeatured() async throws -> FeaturedResponse { fatalError() }
    func fetchAllContent(page: Int, limit: Int) async throws -> ContentListResponse { fatalError() }
    func searchContent(query: String, type: String?, page: Int, limit: Int) async throws -> SearchResponse { fatalError() }
    func fetchContinueWatching() async throws -> WatchHistoryResponse { fatalError() }
    func fetchTelAvivContent() async throws -> CityContentResponse { fatalError() }
    func fetchJerusalemContent() async throws -> CityContentResponse { fatalError() }
    func fetchTrending(cultureId: String) async throws -> [CultureTrendingItem] { fatalError() }
    func fetchIsraelisInCity(city: String, state: String) async throws -> IsraelisInCityResponse { fatalError() }
    func fetchIsraeliBusinesses(city: String, state: String) async throws -> IsraeliBusinessesResponse { fatalError() }
}

private final class MockLiveTVRepository: LiveTVRepository {
    var shouldSucceed = true

    func fetchChannelDetail(id: String) async throws -> LiveChannelDetail {
        if shouldSucceed {
            return LiveChannelDetail(
                id: id,
                name: "Channel 12",
                logo: "https://example.com/logo.jpg",
                thumbnail: "https://example.com/thumb.jpg",
                streamUrl: "https://example.com/live.m3u8",
                currentShow: "Current Show",
                category: "News",
                description: "Test channel"
            )
        } else {
            throw NSError(domain: "test", code: 1, userInfo: [NSLocalizedDescriptionKey: "Mock error"])
        }
    }

    func fetchChannels(cultureId: String?, category: String?) async throws -> LiveChannelsResponse { fatalError() }
    func fetchEPG(channelId: String, date: String?) async throws -> EPGResponse { fatalError() }
}

private final class MockRadioRepository: RadioRepository {
    func fetchStations(cultureId: String?, category: String?) async throws -> RadioStationsResponse { fatalError() }
    func fetchStationDetail(id: String) async throws -> RadioStationDetail { fatalError() }
}

private final class MockPodcastRepository: PodcastRepository {
    func fetchPodcasts(category: String?, page: Int, limit: Int) async throws -> PodcastsResponse { fatalError() }
    func fetchPodcastDetail(id: String) async throws -> PodcastDetail { fatalError() }
    func fetchEpisodes(showId: String, page: Int, limit: Int) async throws -> PodcastEpisodesResponse { fatalError() }
    func fetchCategories() async throws -> PodcastCategoriesResponse { fatalError() }
}

private final class MockMediaPlayer: MediaPlayer {
    var loadCallCount = 0
    var lastLoadedURL: URL?
    var lastContentType: MediaContentType?

    func load(url: URL, contentType: MediaContentType) {
        loadCallCount += 1
        lastLoadedURL = url
        lastContentType = contentType
    }

    func play() {}
    func pause() {}
    func seek(to position: TimeInterval) {}
    func setRate(_ rate: Float) {}
}
