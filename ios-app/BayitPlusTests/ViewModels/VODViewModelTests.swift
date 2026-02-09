import XCTest
@testable import BayitPlusApp

final class VODViewModelTests: XCTestCase {

    private var viewModel: VODViewModel!
    private var mockRepository: MockContentRepository!

    override func setUp() {
        super.setUp()
        mockRepository = MockContentRepository()
        viewModel = VODViewModel(repository: mockRepository)
    }

    override func tearDown() {
        viewModel = nil
        mockRepository = nil
        super.tearDown()
    }

    // MARK: - Initial State Tests

    func test_initialState_allPropertiesHaveDefaults() {
        XCTAssertEqual(viewModel.items, [])
        XCTAssertFalse(viewModel.isLoading)
        XCTAssertFalse(viewModel.isLoadingMore)
        XCTAssertNil(viewModel.error)
        XCTAssertEqual(viewModel.currentPage, 1)
        XCTAssertTrue(viewModel.hasMore)
        XCTAssertNil(viewModel.selectedType)
    }

    // MARK: - Load Content Tests

    @MainActor
    func test_loadContent_success_populatesItems() async {
        let expectation = XCTestExpectation(description: "Load content succeeds")

        mockRepository.shouldSucceed = true

        await viewModel.loadContent()

        XCTAssertEqual(viewModel.items.count, 20)
        XCTAssertFalse(viewModel.isLoading)
        XCTAssertNil(viewModel.error)
        XCTAssertEqual(viewModel.currentPage, 1)
        XCTAssertTrue(viewModel.hasMore)

        expectation.fulfill()
        await fulfillment(of: [expectation], timeout: 5.0)
    }

    @MainActor
    func test_loadContent_failure_setsError() async {
        let expectation = XCTestExpectation(description: "Load content fails")

        mockRepository.shouldSucceed = false

        await viewModel.loadContent()

        XCTAssertEqual(viewModel.items, [])
        XCTAssertFalse(viewModel.isLoading)
        XCTAssertNotNil(viewModel.error)
        XCTAssertEqual(viewModel.error, "Mock error")

        expectation.fulfill()
        await fulfillment(of: [expectation], timeout: 5.0)
    }

    @MainActor
    func test_loadContent_stateTransition_loadingToLoaded() async {
        let expectation = XCTestExpectation(description: "State transitions correctly")

        mockRepository.shouldSucceed = true

        XCTAssertFalse(viewModel.isLoading)

        Task {
            await viewModel.loadContent()
            XCTAssertFalse(viewModel.isLoading)
            expectation.fulfill()
        }

        await fulfillment(of: [expectation], timeout: 5.0)
    }

    @MainActor
    func test_loadContent_preventsReentrantCalls() async {
        mockRepository.shouldSucceed = true

        let task1 = Task {
            await viewModel.loadContent()
        }

        let task2 = Task {
            await viewModel.loadContent()
        }

        await task1.value
        await task2.value

        XCTAssertEqual(mockRepository.fetchAllContentCallCount, 1)
    }

    @MainActor
    func test_loadContent_resetsToPageOne() async {
        let expectation = XCTestExpectation(description: "Resets to page one")

        mockRepository.shouldSucceed = true

        await viewModel.loadMore()
        XCTAssertEqual(viewModel.currentPage, 2)

        await viewModel.loadContent()
        XCTAssertEqual(viewModel.currentPage, 1)

        expectation.fulfill()
        await fulfillment(of: [expectation], timeout: 5.0)
    }

    // MARK: - Load More Tests

    @MainActor
    func test_loadMore_success_appendsItems() async {
        let expectation = XCTestExpectation(description: "Load more succeeds")

        mockRepository.shouldSucceed = true

        await viewModel.loadContent()
        let initialCount = viewModel.items.count
        XCTAssertEqual(initialCount, 20)

        await viewModel.loadMore()

        XCTAssertEqual(viewModel.items.count, 40)
        XCTAssertFalse(viewModel.isLoadingMore)
        XCTAssertNil(viewModel.error)
        XCTAssertEqual(viewModel.currentPage, 2)

        expectation.fulfill()
        await fulfillment(of: [expectation], timeout: 5.0)
    }

    @MainActor
    func test_loadMore_whenNoMorePages_doesNotLoad() async {
        mockRepository.shouldSucceed = true
        mockRepository.hasMorePages = false

        await viewModel.loadContent()
        XCTAssertFalse(viewModel.hasMore)

        let initialCount = viewModel.items.count

        await viewModel.loadMore()

        XCTAssertEqual(viewModel.items.count, initialCount)
    }

    @MainActor
    func test_loadMore_preventsReentrantCalls() async {
        mockRepository.shouldSucceed = true

        await viewModel.loadContent()

        let task1 = Task {
            await viewModel.loadMore()
        }

        let task2 = Task {
            await viewModel.loadMore()
        }

        await task1.value
        await task2.value

        XCTAssertEqual(viewModel.currentPage, 2)
    }

    // MARK: - Refresh Tests

    @MainActor
    func test_refresh_success_replacesItems() async {
        let expectation = XCTestExpectation(description: "Refresh succeeds")

        mockRepository.shouldSucceed = true

        await viewModel.loadContent()
        await viewModel.loadMore()
        XCTAssertEqual(viewModel.currentPage, 2)

        await viewModel.refresh()

        XCTAssertEqual(viewModel.currentPage, 1)
        XCTAssertEqual(viewModel.items.count, 20)
        XCTAssertFalse(viewModel.isLoading)
        XCTAssertNil(viewModel.error)

        expectation.fulfill()
        await fulfillment(of: [expectation], timeout: 5.0)
    }

    @MainActor
    func test_refresh_clearsExistingError() async {
        let expectation = XCTestExpectation(description: "Refresh clears error")

        mockRepository.shouldSucceed = false
        await viewModel.loadContent()
        XCTAssertNotNil(viewModel.error)

        mockRepository.shouldSucceed = true
        await viewModel.refresh()

        XCTAssertNil(viewModel.error)

        expectation.fulfill()
        await fulfillment(of: [expectation], timeout: 5.0)
    }

    // MARK: - Pagination Tests

    @MainActor
    func test_pagination_hasMoreSetCorrectly() async {
        mockRepository.shouldSucceed = true
        mockRepository.totalPages = 3

        await viewModel.loadContent()
        XCTAssertTrue(viewModel.hasMore)

        await viewModel.loadMore()
        XCTAssertTrue(viewModel.hasMore)

        await viewModel.loadMore()
        XCTAssertFalse(viewModel.hasMore)
    }

    @MainActor
    func test_selectedType_canBeSet() {
        XCTAssertNil(viewModel.selectedType)

        viewModel.selectedType = "movie"
        XCTAssertEqual(viewModel.selectedType, "movie")

        viewModel.selectedType = "series"
        XCTAssertEqual(viewModel.selectedType, "series")
    }
}

// MARK: - Mock Implementation

private final class MockContentRepository: ContentRepository {
    var shouldSucceed = true
    var hasMorePages = true
    var totalPages = 5
    var fetchAllContentCallCount = 0

    func fetchAllContent(page: Int, limit: Int) async throws -> ContentListResponse {
        fetchAllContentCallCount += 1

        if shouldSucceed {
            let items = (1...limit).map { i in
                ContentItem(
                    id: "item\(page)-\(i)",
                    title: "Content \(page)-\(i)",
                    thumbnail: "https://example.com/thumb\(i).jpg",
                    contentType: .movie,
                    year: 2024,
                    rating: 4.5
                )
            }
            let total = totalPages * limit
            return ContentListResponse(
                items: items,
                page: page,
                total: total
            )
        } else {
            throw NSError(domain: "test", code: 1, userInfo: [NSLocalizedDescriptionKey: "Mock error"])
        }
    }

    func fetchFeatured() async throws -> FeaturedResponse { fatalError() }
    func fetchContentDetail(id: String) async throws -> ContentDetail { fatalError() }
    func searchContent(query: String, type: String?, page: Int, limit: Int) async throws -> SearchResponse { fatalError() }
    func fetchContinueWatching() async throws -> WatchHistoryResponse { fatalError() }
    func fetchTelAvivContent() async throws -> CityContentResponse { fatalError() }
    func fetchJerusalemContent() async throws -> CityContentResponse { fatalError() }
    func fetchTrending(cultureId: String) async throws -> [CultureTrendingItem] { fatalError() }
    func fetchIsraelisInCity(city: String, state: String) async throws -> IsraelisInCityResponse { fatalError() }
    func fetchIsraeliBusinesses(city: String, state: String) async throws -> IsraeliBusinessesResponse { fatalError() }
}
