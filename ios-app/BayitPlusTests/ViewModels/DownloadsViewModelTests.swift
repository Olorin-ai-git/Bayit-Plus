import XCTest
@testable import BayitPlusApp

final class DownloadsViewModelTests: XCTestCase {

    private var viewModel: DownloadsViewModel!
    private var mockRepository: MockUserRepository!

    override func setUp() {
        super.setUp()
        mockRepository = MockUserRepository()
        viewModel = DownloadsViewModel(repository: mockRepository)
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
        XCTAssertNil(viewModel.error)
    }

    // MARK: - Load Tests

    @MainActor
    func test_load_success_populatesDownloads() async {
        let expectation = XCTestExpectation(description: "Load downloads succeeds")

        mockRepository.shouldSucceed = true

        await viewModel.load()

        XCTAssertEqual(viewModel.items.count, 3)
        XCTAssertFalse(viewModel.isLoading)
        XCTAssertNil(viewModel.error)

        expectation.fulfill()
        await fulfillment(of: [expectation], timeout: 5.0)
    }

    @MainActor
    func test_load_failure_setsError() async {
        let expectation = XCTestExpectation(description: "Load downloads fails")

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

        XCTAssertEqual(mockRepository.fetchDownloadsCallCount, 1)
    }

    // MARK: - Delete Download Tests

    @MainActor
    func test_deleteDownload_success_removesItem() async {
        let expectation = XCTestExpectation(description: "Delete download succeeds")

        mockRepository.shouldSucceed = true

        await viewModel.load()
        XCTAssertEqual(viewModel.items.count, 3)

        let itemToDelete = viewModel.items[0].id

        await viewModel.deleteDownload(downloadId: itemToDelete)

        XCTAssertEqual(viewModel.items.count, 2)
        XCTAssertFalse(viewModel.items.contains { $0.id == itemToDelete })

        expectation.fulfill()
        await fulfillment(of: [expectation], timeout: 5.0)
    }

    @MainActor
    func test_deleteDownload_failure_setsError() async {
        let expectation = XCTestExpectation(description: "Delete download fails")

        mockRepository.shouldSucceed = true
        await viewModel.load()

        mockRepository.shouldSucceed = false

        await viewModel.deleteDownload(downloadId: "dl1")

        XCTAssertNotNil(viewModel.error)
        XCTAssertEqual(viewModel.error, "Mock error")

        expectation.fulfill()
        await fulfillment(of: [expectation], timeout: 5.0)
    }

    @MainActor
    func test_deleteDownload_notInList_doesNotCrash() async {
        mockRepository.shouldSucceed = true
        await viewModel.load()

        let initialCount = viewModel.items.count

        await viewModel.deleteDownload(downloadId: "nonexistent")

        XCTAssertEqual(viewModel.items.count, initialCount)
    }

    // MARK: - Start Download Tests

    @MainActor
    func test_startDownload_success_addsItem() async {
        let expectation = XCTestExpectation(description: "Start download succeeds")

        mockRepository.shouldSucceed = true

        await viewModel.load()
        let initialCount = viewModel.items.count

        let result = await viewModel.startDownload(contentId: "test123", quality: "1080p")

        XCTAssertNotNil(result)
        XCTAssertEqual(result?.downloadId, "dl-new")
        XCTAssertGreaterThan(viewModel.items.count, initialCount)

        expectation.fulfill()
        await fulfillment(of: [expectation], timeout: 5.0)
    }

    @MainActor
    func test_startDownload_failure_returnsNilAndSetsError() async {
        let expectation = XCTestExpectation(description: "Start download fails")

        mockRepository.shouldSucceed = false

        let result = await viewModel.startDownload(contentId: "test123", quality: "1080p")

        XCTAssertNil(result)
        XCTAssertNotNil(viewModel.error)

        expectation.fulfill()
        await fulfillment(of: [expectation], timeout: 5.0)
    }

    @MainActor
    func test_startDownload_withQuality() async {
        let expectation = XCTestExpectation(description: "Start download with quality")

        mockRepository.shouldSucceed = true

        let result = await viewModel.startDownload(contentId: "test123", quality: "720p")

        XCTAssertNotNil(result)
        XCTAssertEqual(mockRepository.lastStartDownloadRequest?.quality, "720p")

        expectation.fulfill()
        await fulfillment(of: [expectation], timeout: 5.0)
    }

    @MainActor
    func test_startDownload_withoutQuality() async {
        let expectation = XCTestExpectation(description: "Start download without quality")

        mockRepository.shouldSucceed = true

        let result = await viewModel.startDownload(contentId: "test123", quality: nil)

        XCTAssertNotNil(result)
        XCTAssertNil(mockRepository.lastStartDownloadRequest?.quality)

        expectation.fulfill()
        await fulfillment(of: [expectation], timeout: 5.0)
    }

    // MARK: - Total Storage Tests

    func test_totalStorageUsed_empty() {
        XCTAssertEqual(viewModel.totalStorageUsed, 0)
    }

    @MainActor
    func test_totalStorageUsed_calculatesCorrectly() async {
        mockRepository.shouldSucceed = true
        await viewModel.load()

        let expectedTotal = mockRepository.mockDownloads.compactMap(\.fileSize).reduce(0, +)
        XCTAssertEqual(viewModel.totalStorageUsed, expectedTotal)
    }

    @MainActor
    func test_totalStorageUsed_updatesAfterDelete() async {
        mockRepository.shouldSucceed = true
        await viewModel.load()

        let initialStorage = viewModel.totalStorageUsed

        await viewModel.deleteDownload(downloadId: "dl1")

        XCTAssertLessThan(viewModel.totalStorageUsed, initialStorage)
    }

    @MainActor
    func test_totalStorageUsed_withNilFileSizes() async {
        mockRepository.shouldSucceed = true
        mockRepository.mockDownloads = [
            DownloadItem(
                id: "dl1",
                contentId: "c1",
                title: "Download 1",
                thumbnail: "thumb1.jpg",
                fileSize: nil,
                progress: 1.0,
                status: .completed,
                quality: "1080p"
            )
        ]

        await viewModel.load()

        XCTAssertEqual(viewModel.totalStorageUsed, 0)
    }

    // MARK: - Error Handling Tests

    @MainActor
    func test_deleteDownload_subsequentCall_clearsError() async {
        mockRepository.shouldSucceed = false
        await viewModel.deleteDownload(downloadId: "dl1")
        XCTAssertNotNil(viewModel.error)

        mockRepository.shouldSucceed = true
        await viewModel.load()

        XCTAssertNil(viewModel.error)
    }
}

// MARK: - Mock Implementation

private final class MockUserRepository: UserRepository {
    var shouldSucceed = true
    var fetchDownloadsCallCount = 0
    var lastStartDownloadRequest: DownloadStartRequest?
    var mockDownloads: [DownloadItem] = [
        DownloadItem(
            id: "dl1",
            contentId: "c1",
            title: "Download 1",
            thumbnail: "thumb1.jpg",
            fileSize: 1024 * 1024 * 500,
            progress: 1.0,
            status: .completed,
            quality: "1080p"
        ),
        DownloadItem(
            id: "dl2",
            contentId: "c2",
            title: "Download 2",
            thumbnail: "thumb2.jpg",
            fileSize: 1024 * 1024 * 300,
            progress: 0.5,
            status: .inProgress,
            quality: "720p"
        ),
        DownloadItem(
            id: "dl3",
            contentId: "c3",
            title: "Download 3",
            thumbnail: "thumb3.jpg",
            fileSize: 1024 * 1024 * 200,
            progress: 0.0,
            status: .pending,
            quality: "480p"
        )
    ]

    func fetchDownloads() async throws -> DownloadsResponse {
        fetchDownloadsCallCount += 1

        if shouldSucceed {
            return DownloadsResponse(items: mockDownloads)
        } else {
            throw NSError(domain: "test", code: 1, userInfo: [NSLocalizedDescriptionKey: "Mock error"])
        }
    }

    func startDownload(request: DownloadStartRequest) async throws -> DownloadStartResponse {
        lastStartDownloadRequest = request

        if shouldSucceed {
            let newDownload = DownloadItem(
                id: "dl-new",
                contentId: request.contentId,
                title: "New Download",
                thumbnail: "thumb.jpg",
                fileSize: 1024 * 1024 * 400,
                progress: 0.0,
                status: .pending,
                quality: request.quality ?? "720p"
            )
            mockDownloads.append(newDownload)
            return DownloadStartResponse(downloadId: "dl-new", status: .pending)
        } else {
            throw NSError(domain: "test", code: 1, userInfo: [NSLocalizedDescriptionKey: "Mock error"])
        }
    }

    func deleteDownload(downloadId: String) async throws -> EmptyResponse {
        if shouldSucceed {
            return EmptyResponse()
        } else {
            throw NSError(domain: "test", code: 1, userInfo: [NSLocalizedDescriptionKey: "Mock error"])
        }
    }

    func fetchProfile() async throws -> ProfileResponse { fatalError() }
    func fetchProfileStats() async throws -> ProfileStats { fatalError() }
    func updateProfile(request: ProfileUpdateRequest) async throws -> ProfileResponse { fatalError() }
    func fetchFavorites(page: Int, limit: Int) async throws -> FavoritesResponse { fatalError() }
    func toggleFavorite(request: FavoriteToggleRequest) async throws -> FavoriteToggleResponse { fatalError() }
    func removeFavorite(contentId: String) async throws -> EmptyResponse { fatalError() }
}
