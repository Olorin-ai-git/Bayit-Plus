import XCTest
@testable import BayitPlusApp

final class FavoritesViewModelTests: XCTestCase {

    private var viewModel: FavoritesViewModel!
    private var mockRepository: MockUserRepository!

    override func setUp() {
        super.setUp()
        mockRepository = MockUserRepository()
        viewModel = FavoritesViewModel(repository: mockRepository)
    }

    override func tearDown() {
        viewModel = nil
        mockRepository = nil
        super.tearDown()
    }

    // MARK: - Initial State Tests

    func test_initialState_allPropertiesHaveDefaults() {
        XCTAssertEqual(viewModel.items, [])
        XCTAssertEqual(viewModel.total, 0)
        XCTAssertFalse(viewModel.isLoading)
        XCTAssertNil(viewModel.error)
        XCTAssertEqual(viewModel.currentPage, 1)
    }

    // MARK: - Load Tests

    @MainActor
    func test_load_success_populatesFavorites() async {
        let expectation = XCTestExpectation(description: "Load favorites succeeds")

        mockRepository.shouldSucceed = true

        await viewModel.load()

        XCTAssertEqual(viewModel.items.count, 5)
        XCTAssertEqual(viewModel.total, 25)
        XCTAssertFalse(viewModel.isLoading)
        XCTAssertNil(viewModel.error)
        XCTAssertEqual(viewModel.currentPage, 1)

        expectation.fulfill()
        await fulfillment(of: [expectation], timeout: 5.0)
    }

    @MainActor
    func test_load_failure_setsError() async {
        let expectation = XCTestExpectation(description: "Load favorites fails")

        mockRepository.shouldSucceed = false

        await viewModel.load()

        XCTAssertEqual(viewModel.items, [])
        XCTAssertFalse(viewModel.isLoading)
        XCTAssertNotNil(viewModel.error)
        XCTAssertEqual(viewModel.error, "Mock error")

        expectation.fulfill()
        await fulfillment(of: [expectation], timeout: 5.0)
    }

    @MainActor
    func test_load_stateTransition_loadingToLoaded() async {
        let expectation = XCTestExpectation(description: "State transitions correctly")

        mockRepository.shouldSucceed = true

        XCTAssertFalse(viewModel.isLoading)

        Task {
            await viewModel.load()
            XCTAssertFalse(viewModel.isLoading)
            expectation.fulfill()
        }

        await fulfillment(of: [expectation], timeout: 5.0)
    }

    @MainActor
    func test_load_preventsReentrantCalls() async {
        mockRepository.shouldSucceed = true

        let task1 = Task {
            await viewModel.load()
        }

        let task2 = Task {
            await viewModel.load()
        }

        await task1.value
        await task2.value

        XCTAssertEqual(mockRepository.fetchFavoritesCallCount, 1)
    }

    @MainActor
    func test_load_resetsToPageOne() async {
        let expectation = XCTestExpectation(description: "Resets to page one")

        mockRepository.shouldSucceed = true

        await viewModel.loadMore()
        XCTAssertEqual(viewModel.currentPage, 2)

        await viewModel.load()
        XCTAssertEqual(viewModel.currentPage, 1)

        expectation.fulfill()
        await fulfillment(of: [expectation], timeout: 5.0)
    }

    // MARK: - Load More Tests

    @MainActor
    func test_loadMore_success_appendsItems() async {
        let expectation = XCTestExpectation(description: "Load more succeeds")

        mockRepository.shouldSucceed = true

        await viewModel.load()
        XCTAssertEqual(viewModel.items.count, 5)

        await viewModel.loadMore()

        XCTAssertEqual(viewModel.items.count, 10)
        XCTAssertFalse(viewModel.isLoading)
        XCTAssertNil(viewModel.error)
        XCTAssertEqual(viewModel.currentPage, 2)

        expectation.fulfill()
        await fulfillment(of: [expectation], timeout: 5.0)
    }

    @MainActor
    func test_loadMore_whenAllItemsLoaded_doesNotLoad() async {
        mockRepository.shouldSucceed = true
        mockRepository.totalFavorites = 5

        await viewModel.load()
        XCTAssertEqual(viewModel.items.count, 5)
        XCTAssertEqual(viewModel.total, 5)

        let initialCount = viewModel.items.count

        await viewModel.loadMore()

        XCTAssertEqual(viewModel.items.count, initialCount)
    }

    @MainActor
    func test_loadMore_failure_setsError() async {
        let expectation = XCTestExpectation(description: "Load more fails")

        mockRepository.shouldSucceed = true
        await viewModel.load()

        mockRepository.shouldSucceed = false

        await viewModel.loadMore()

        XCTAssertNotNil(viewModel.error)
        XCTAssertEqual(viewModel.error, "Mock error")

        expectation.fulfill()
        await fulfillment(of: [expectation], timeout: 5.0)
    }

    @MainActor
    func test_loadMore_preventsReentrantCalls() async {
        mockRepository.shouldSucceed = true

        await viewModel.load()

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

    // MARK: - Remove Favorite Tests

    @MainActor
    func test_removeFavorite_success_removesItem() async {
        let expectation = XCTestExpectation(description: "Remove favorite succeeds")

        mockRepository.shouldSucceed = true

        await viewModel.load()
        XCTAssertEqual(viewModel.items.count, 5)
        XCTAssertEqual(viewModel.total, 25)

        let itemToRemove = viewModel.items[0].contentId

        await viewModel.removeFavorite(contentId: itemToRemove)

        XCTAssertEqual(viewModel.items.count, 4)
        XCTAssertEqual(viewModel.total, 24)
        XCTAssertFalse(viewModel.items.contains { $0.contentId == itemToRemove })

        expectation.fulfill()
        await fulfillment(of: [expectation], timeout: 5.0)
    }

    @MainActor
    func test_removeFavorite_failure_setsError() async {
        let expectation = XCTestExpectation(description: "Remove favorite fails")

        mockRepository.shouldSucceed = true
        await viewModel.load()

        mockRepository.shouldSucceed = false

        await viewModel.removeFavorite(contentId: "item1")

        XCTAssertNotNil(viewModel.error)
        XCTAssertEqual(viewModel.error, "Mock error")

        expectation.fulfill()
        await fulfillment(of: [expectation], timeout: 5.0)
    }

    @MainActor
    func test_removeFavorite_notInList_doesNotCrash() async {
        mockRepository.shouldSucceed = true
        await viewModel.load()

        let initialCount = viewModel.items.count

        await viewModel.removeFavorite(contentId: "nonexistent")

        XCTAssertEqual(viewModel.items.count, initialCount)
    }

    // MARK: - Toggle Favorite Tests

    @MainActor
    func test_toggleFavorite_success_returnsStatus() async {
        let expectation = XCTestExpectation(description: "Toggle favorite succeeds")

        mockRepository.shouldSucceed = true

        let result = await viewModel.toggleFavorite(contentId: "test123", contentType: "movie")

        XCTAssertNotNil(result)
        XCTAssertTrue(result!)
        XCTAssertNil(viewModel.error)

        expectation.fulfill()
        await fulfillment(of: [expectation], timeout: 5.0)
    }

    @MainActor
    func test_toggleFavorite_failure_returnsNilAndSetsError() async {
        let expectation = XCTestExpectation(description: "Toggle favorite fails")

        mockRepository.shouldSucceed = false

        let result = await viewModel.toggleFavorite(contentId: "test123", contentType: "movie")

        XCTAssertNil(result)
        XCTAssertNotNil(viewModel.error)

        expectation.fulfill()
        await fulfillment(of: [expectation], timeout: 5.0)
    }

    // MARK: - Pagination Tests

    @MainActor
    func test_pagination_multiplePages() async {
        mockRepository.shouldSucceed = true
        mockRepository.totalFavorites = 50

        await viewModel.load()
        XCTAssertEqual(viewModel.currentPage, 1)
        XCTAssertEqual(viewModel.items.count, 5)

        await viewModel.loadMore()
        XCTAssertEqual(viewModel.currentPage, 2)
        XCTAssertEqual(viewModel.items.count, 10)

        await viewModel.loadMore()
        XCTAssertEqual(viewModel.currentPage, 3)
        XCTAssertEqual(viewModel.items.count, 15)
    }

    @MainActor
    func test_pagination_totalUpdatesCorrectly() async {
        mockRepository.shouldSucceed = true
        mockRepository.totalFavorites = 25

        await viewModel.load()
        XCTAssertEqual(viewModel.total, 25)

        await viewModel.loadMore()
        XCTAssertEqual(viewModel.total, 25)
    }
}

// MARK: - Mock Implementation

private final class MockUserRepository: UserRepository {
    var shouldSucceed = true
    var fetchFavoritesCallCount = 0
    var totalFavorites = 25

    func fetchFavorites(page: Int, limit: Int) async throws -> FavoritesResponse {
        fetchFavoritesCallCount += 1

        if shouldSucceed {
            let items = (1...min(limit, max(0, totalFavorites - (page - 1) * limit))).map { i in
                FavoriteItem(
                    id: "fav\(page)-\(i)",
                    contentId: "item\(page)-\(i)",
                    title: "Favorite \(page)-\(i)",
                    thumbnail: "https://example.com/fav\(i).jpg",
                    contentType: .movie,
                    addedAt: "2024-01-01"
                )
            }
            return FavoritesResponse(items: items, total: totalFavorites)
        } else {
            throw NSError(domain: "test", code: 1, userInfo: [NSLocalizedDescriptionKey: "Mock error"])
        }
    }

    func toggleFavorite(request: FavoriteToggleRequest) async throws -> FavoriteToggleResponse {
        if shouldSucceed {
            return FavoriteToggleResponse(isFavorite: true)
        } else {
            throw NSError(domain: "test", code: 1, userInfo: [NSLocalizedDescriptionKey: "Mock error"])
        }
    }

    func removeFavorite(contentId: String) async throws -> EmptyResponse {
        if shouldSucceed {
            return EmptyResponse()
        } else {
            throw NSError(domain: "test", code: 1, userInfo: [NSLocalizedDescriptionKey: "Mock error"])
        }
    }

    func fetchProfile() async throws -> ProfileResponse { fatalError() }
    func fetchProfileStats() async throws -> ProfileStats { fatalError() }
    func updateProfile(request: ProfileUpdateRequest) async throws -> ProfileResponse { fatalError() }
    func fetchDownloads() async throws -> DownloadsResponse { fatalError() }
    func startDownload(request: DownloadStartRequest) async throws -> DownloadStartResponse { fatalError() }
    func deleteDownload(downloadId: String) async throws -> EmptyResponse { fatalError() }
}
