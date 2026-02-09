import XCTest
@testable import BayitPlusApp

final class SearchViewModelTests: XCTestCase {

    private var viewModel: SearchViewModel!
    private var mockRepository: MockContentRepository!

    override func setUp() {
        super.setUp()
        mockRepository = MockContentRepository()
        viewModel = SearchViewModel(repository: mockRepository)
    }

    override func tearDown() {
        viewModel = nil
        mockRepository = nil
        super.tearDown()
    }

    // MARK: - Initial State Tests

    func test_initialState_allPropertiesHaveDefaults() {
        XCTAssertEqual(viewModel.query, "")
        XCTAssertEqual(viewModel.results, [])
        XCTAssertFalse(viewModel.isSearching)
        XCTAssertNil(viewModel.error)
        XCTAssertFalse(viewModel.hasSearched)
        XCTAssertNil(viewModel.selectedType)
    }

    // MARK: - Query Changed Tests

    @MainActor
    func test_onQueryChanged_emptyQuery_clearsResults() async {
        viewModel.query = "test"
        await viewModel.performSearch()
        XCTAssertTrue(viewModel.hasSearched)

        viewModel.query = ""
        viewModel.onQueryChanged()

        try? await Task.sleep(for: .milliseconds(50))

        XCTAssertEqual(viewModel.results, [])
        XCTAssertFalse(viewModel.hasSearched)
    }

    @MainActor
    func test_onQueryChanged_whitespaceQuery_clearsResults() async {
        viewModel.query = "test"
        await viewModel.performSearch()
        XCTAssertTrue(viewModel.hasSearched)

        viewModel.query = "   "
        viewModel.onQueryChanged()

        try? await Task.sleep(for: .milliseconds(50))

        XCTAssertEqual(viewModel.results, [])
        XCTAssertFalse(viewModel.hasSearched)
    }

    @MainActor
    func test_onQueryChanged_debounces_search() async {
        let expectation = XCTestExpectation(description: "Debounced search executes")

        mockRepository.shouldSucceed = true

        viewModel.query = "test"
        viewModel.onQueryChanged()

        try? await Task.sleep(for: .milliseconds(100))
        XCTAssertEqual(mockRepository.searchContentCallCount, 0)

        try? await Task.sleep(for: .milliseconds(250))
        XCTAssertEqual(mockRepository.searchContentCallCount, 1)

        expectation.fulfill()
        await fulfillment(of: [expectation], timeout: 5.0)
    }

    @MainActor
    func test_onQueryChanged_cancelsInProgressSearch() async {
        let expectation = XCTestExpectation(description: "Cancels in-progress search")

        mockRepository.shouldSucceed = true

        viewModel.query = "first"
        viewModel.onQueryChanged()

        try? await Task.sleep(for: .milliseconds(100))

        viewModel.query = "second"
        viewModel.onQueryChanged()

        try? await Task.sleep(for: .milliseconds(400))

        XCTAssertEqual(mockRepository.searchContentCallCount, 1)
        XCTAssertEqual(mockRepository.lastSearchQuery, "second")

        expectation.fulfill()
        await fulfillment(of: [expectation], timeout: 5.0)
    }

    // MARK: - Perform Search Tests

    @MainActor
    func test_performSearch_success_populatesResults() async {
        let expectation = XCTestExpectation(description: "Search succeeds")

        mockRepository.shouldSucceed = true
        viewModel.query = "test query"

        await viewModel.performSearch()

        XCTAssertEqual(viewModel.results.count, 5)
        XCTAssertFalse(viewModel.isSearching)
        XCTAssertNil(viewModel.error)
        XCTAssertTrue(viewModel.hasSearched)

        expectation.fulfill()
        await fulfillment(of: [expectation], timeout: 5.0)
    }

    @MainActor
    func test_performSearch_failure_setsError() async {
        let expectation = XCTestExpectation(description: "Search fails")

        mockRepository.shouldSucceed = false
        viewModel.query = "test query"

        await viewModel.performSearch()

        XCTAssertEqual(viewModel.results, [])
        XCTAssertFalse(viewModel.isSearching)
        XCTAssertNotNil(viewModel.error)
        XCTAssertEqual(viewModel.error, "Mock error")

        expectation.fulfill()
        await fulfillment(of: [expectation], timeout: 5.0)
    }

    @MainActor
    func test_performSearch_emptyQuery_doesNotSearch() async {
        mockRepository.shouldSucceed = true
        viewModel.query = ""

        await viewModel.performSearch()

        XCTAssertEqual(mockRepository.searchContentCallCount, 0)
    }

    @MainActor
    func test_performSearch_whitespaceQuery_doesNotSearch() async {
        mockRepository.shouldSucceed = true
        viewModel.query = "   "

        await viewModel.performSearch()

        XCTAssertEqual(mockRepository.searchContentCallCount, 0)
    }

    @MainActor
    func test_performSearch_trimsQuery() async {
        let expectation = XCTestExpectation(description: "Query is trimmed")

        mockRepository.shouldSucceed = true
        viewModel.query = "  test query  "

        await viewModel.performSearch()

        XCTAssertEqual(mockRepository.lastSearchQuery, "test query")

        expectation.fulfill()
        await fulfillment(of: [expectation], timeout: 5.0)
    }

    @MainActor
    func test_performSearch_passesSelectedType() async {
        let expectation = XCTestExpectation(description: "Selected type is passed")

        mockRepository.shouldSucceed = true
        viewModel.query = "test"
        viewModel.selectedType = "movie"

        await viewModel.performSearch()

        XCTAssertEqual(mockRepository.lastSearchType, "movie")

        expectation.fulfill()
        await fulfillment(of: [expectation], timeout: 5.0)
    }

    @MainActor
    func test_performSearch_stateTransition_searchingToComplete() async {
        let expectation = XCTestExpectation(description: "State transitions correctly")

        mockRepository.shouldSucceed = true
        viewModel.query = "test"

        XCTAssertFalse(viewModel.isSearching)

        Task {
            await viewModel.performSearch()
            XCTAssertFalse(viewModel.isSearching)
            expectation.fulfill()
        }

        await fulfillment(of: [expectation], timeout: 5.0)
    }

    // MARK: - Clear Search Tests

    @MainActor
    func test_clearSearch_resetsAllState() async {
        mockRepository.shouldSucceed = true
        viewModel.query = "test"
        await viewModel.performSearch()

        XCTAssertTrue(viewModel.hasSearched)
        XCTAssertGreaterThan(viewModel.results.count, 0)

        viewModel.clearSearch()

        XCTAssertEqual(viewModel.query, "")
        XCTAssertEqual(viewModel.results, [])
        XCTAssertFalse(viewModel.hasSearched)
        XCTAssertNil(viewModel.error)
    }

    @MainActor
    func test_clearSearch_cancelsInProgressSearch() async {
        viewModel.query = "test"
        viewModel.onQueryChanged()

        viewModel.clearSearch()

        try? await Task.sleep(for: .milliseconds(400))

        XCTAssertEqual(mockRepository.searchContentCallCount, 0)
    }

    // MARK: - Selected Type Tests

    func test_selectedType_canBeSet() {
        XCTAssertNil(viewModel.selectedType)

        viewModel.selectedType = "movie"
        XCTAssertEqual(viewModel.selectedType, "movie")

        viewModel.selectedType = "series"
        XCTAssertEqual(viewModel.selectedType, "series")

        viewModel.selectedType = nil
        XCTAssertNil(viewModel.selectedType)
    }

    // MARK: - Error Handling Tests

    @MainActor
    func test_performSearch_cancellation_doesNotSetError() async {
        let expectation = XCTestExpectation(description: "Cancellation handled gracefully")

        mockRepository.shouldSucceed = true
        viewModel.query = "test"

        let task = Task {
            await viewModel.performSearch()
        }

        task.cancel()

        try? await Task.sleep(for: .milliseconds(100))

        XCTAssertNil(viewModel.error)

        expectation.fulfill()
        await fulfillment(of: [expectation], timeout: 5.0)
    }

    @MainActor
    func test_performSearch_subsequentSearch_clearsError() async {
        mockRepository.shouldSucceed = false
        viewModel.query = "test"
        await viewModel.performSearch()
        XCTAssertNotNil(viewModel.error)

        mockRepository.shouldSucceed = true
        viewModel.query = "new test"
        await viewModel.performSearch()

        XCTAssertNil(viewModel.error)
    }
}

// MARK: - Mock Implementation

private final class MockContentRepository: ContentRepository {
    var shouldSucceed = true
    var searchContentCallCount = 0
    var lastSearchQuery: String?
    var lastSearchType: String?

    func searchContent(query: String, type: String?, page: Int, limit: Int) async throws -> SearchResponse {
        searchContentCallCount += 1
        lastSearchQuery = query
        lastSearchType = type

        if shouldSucceed {
            let results = (1...5).map { i in
                SearchResult(
                    contentId: "result\(i)",
                    title: "\(query) Result \(i)",
                    thumbnail: "https://example.com/result\(i).jpg",
                    contentType: .movie,
                    year: 2024,
                    matchScore: 0.9
                )
            }
            return SearchResponse(results: results, total: 5)
        } else {
            throw NSError(domain: "test", code: 1, userInfo: [NSLocalizedDescriptionKey: "Mock error"])
        }
    }

    func fetchFeatured() async throws -> FeaturedResponse { fatalError() }
    func fetchAllContent(page: Int, limit: Int) async throws -> ContentListResponse { fatalError() }
    func fetchContentDetail(id: String) async throws -> ContentDetail { fatalError() }
    func fetchContinueWatching() async throws -> WatchHistoryResponse { fatalError() }
    func fetchTelAvivContent() async throws -> CityContentResponse { fatalError() }
    func fetchJerusalemContent() async throws -> CityContentResponse { fatalError() }
    func fetchTrending(cultureId: String?) async throws -> TrendingResponse { fatalError() }
    func fetchIsraelisInCity(city: String, state: String) async throws -> IsraelisInCityResponse { fatalError() }
    func fetchIsraeliBusinesses(city: String, state: String) async throws -> IsraeliBusinessesResponse { fatalError() }
}
