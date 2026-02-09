import XCTest
@testable import BayitPlusApp

final class ProfileViewModelTests: XCTestCase {

    private var viewModel: ProfileViewModel!
    private var mockRepository: MockUserRepository!

    override func setUp() {
        super.setUp()
        mockRepository = MockUserRepository()
        viewModel = ProfileViewModel(repository: mockRepository)
    }

    override func tearDown() {
        viewModel = nil
        mockRepository = nil
        super.tearDown()
    }

    // MARK: - Initial State Tests

    func test_initialState_allPropertiesHaveDefaults() {
        XCTAssertNil(viewModel.profile)
        XCTAssertNil(viewModel.stats)
        XCTAssertFalse(viewModel.isLoading)
        XCTAssertNil(viewModel.error)
        XCTAssertFalse(viewModel.isSaving)
    }

    // MARK: - Load Tests

    @MainActor
    func test_load_success_populatesProfileAndStats() async {
        let expectation = XCTestExpectation(description: "Load profile succeeds")

        mockRepository.shouldSucceed = true

        await viewModel.load()

        XCTAssertNotNil(viewModel.profile)
        XCTAssertNotNil(viewModel.stats)
        XCTAssertEqual(viewModel.profile?.displayName, "Test User")
        XCTAssertEqual(viewModel.stats?.watchedCount, 50)
        XCTAssertFalse(viewModel.isLoading)
        XCTAssertNil(viewModel.error)

        expectation.fulfill()
        await fulfillment(of: [expectation], timeout: 5.0)
    }

    @MainActor
    func test_load_failure_setsError() async {
        let expectation = XCTestExpectation(description: "Load profile fails")

        mockRepository.shouldSucceed = false

        await viewModel.load()

        XCTAssertNil(viewModel.profile)
        XCTAssertNil(viewModel.stats)
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

        XCTAssertEqual(mockRepository.fetchProfileCallCount, 1)
    }

    @MainActor
    func test_load_loadsProfileAndStatsInParallel() async {
        let expectation = XCTestExpectation(description: "Loads profile and stats in parallel")

        mockRepository.shouldSucceed = true

        await viewModel.load()

        XCTAssertNotNil(viewModel.profile)
        XCTAssertNotNil(viewModel.stats)
        XCTAssertEqual(mockRepository.fetchProfileCallCount, 1)
        XCTAssertEqual(mockRepository.fetchProfileStatsCallCount, 1)

        expectation.fulfill()
        await fulfillment(of: [expectation], timeout: 5.0)
    }

    // MARK: - Update Profile Tests

    @MainActor
    func test_updateProfile_success_updatesProfile() async {
        let expectation = XCTestExpectation(description: "Update profile succeeds")

        mockRepository.shouldSucceed = true

        await viewModel.updateProfile(
            displayName: "Updated Name",
            avatar: "new-avatar.jpg",
            language: "he"
        )

        XCTAssertNotNil(viewModel.profile)
        XCTAssertEqual(viewModel.profile?.displayName, "Updated Name")
        XCTAssertFalse(viewModel.isSaving)
        XCTAssertNil(viewModel.error)

        expectation.fulfill()
        await fulfillment(of: [expectation], timeout: 5.0)
    }

    @MainActor
    func test_updateProfile_failure_setsError() async {
        let expectation = XCTestExpectation(description: "Update profile fails")

        mockRepository.shouldSucceed = false

        await viewModel.updateProfile(
            displayName: "Updated Name",
            avatar: nil,
            language: nil
        )

        XCTAssertFalse(viewModel.isSaving)
        XCTAssertNotNil(viewModel.error)
        XCTAssertEqual(viewModel.error, "Mock error")

        expectation.fulfill()
        await fulfillment(of: [expectation], timeout: 5.0)
    }

    @MainActor
    func test_updateProfile_stateTransition_savingToSaved() async {
        let expectation = XCTestExpectation(description: "State transitions correctly")

        mockRepository.shouldSucceed = true

        XCTAssertFalse(viewModel.isSaving)

        Task {
            await viewModel.updateProfile(displayName: "Test", avatar: nil, language: nil)
            XCTAssertFalse(viewModel.isSaving)
            expectation.fulfill()
        }

        await fulfillment(of: [expectation], timeout: 5.0)
    }

    @MainActor
    func test_updateProfile_onlyDisplayName() async {
        let expectation = XCTestExpectation(description: "Updates only display name")

        mockRepository.shouldSucceed = true

        await viewModel.updateProfile(
            displayName: "New Name",
            avatar: nil,
            language: nil
        )

        XCTAssertEqual(mockRepository.lastUpdateRequest?.displayName, "New Name")
        XCTAssertNil(mockRepository.lastUpdateRequest?.avatar)
        XCTAssertNil(mockRepository.lastUpdateRequest?.language)

        expectation.fulfill()
        await fulfillment(of: [expectation], timeout: 5.0)
    }

    @MainActor
    func test_updateProfile_allFields() async {
        let expectation = XCTestExpectation(description: "Updates all fields")

        mockRepository.shouldSucceed = true

        await viewModel.updateProfile(
            displayName: "New Name",
            avatar: "avatar.jpg",
            language: "en"
        )

        XCTAssertEqual(mockRepository.lastUpdateRequest?.displayName, "New Name")
        XCTAssertEqual(mockRepository.lastUpdateRequest?.avatar, "avatar.jpg")
        XCTAssertEqual(mockRepository.lastUpdateRequest?.language, "en")

        expectation.fulfill()
        await fulfillment(of: [expectation], timeout: 5.0)
    }

    // MARK: - Update Preferences Tests

    @MainActor
    func test_updatePreferences_success_updatesProfile() async {
        let expectation = XCTestExpectation(description: "Update preferences succeeds")

        mockRepository.shouldSucceed = true

        let preferences = ProfilePreferencesUpdate(
            language: "he",
            subtitleLanguage: "en",
            autoplay: true,
            notifications: true,
            contentRating: "PG-13",
            quality: "1080p"
        )

        await viewModel.updatePreferences(preferences)

        XCTAssertNotNil(viewModel.profile)
        XCTAssertFalse(viewModel.isSaving)
        XCTAssertNil(viewModel.error)

        expectation.fulfill()
        await fulfillment(of: [expectation], timeout: 5.0)
    }

    @MainActor
    func test_updatePreferences_failure_setsError() async {
        let expectation = XCTestExpectation(description: "Update preferences fails")

        mockRepository.shouldSucceed = false

        let preferences = ProfilePreferencesUpdate(
            language: "he",
            subtitleLanguage: nil,
            autoplay: nil,
            notifications: nil,
            contentRating: nil,
            quality: nil
        )

        await viewModel.updatePreferences(preferences)

        XCTAssertFalse(viewModel.isSaving)
        XCTAssertNotNil(viewModel.error)

        expectation.fulfill()
        await fulfillment(of: [expectation], timeout: 5.0)
    }

    @MainActor
    func test_updatePreferences_stateTransition_savingToSaved() async {
        let expectation = XCTestExpectation(description: "State transitions correctly")

        mockRepository.shouldSucceed = true

        let preferences = ProfilePreferencesUpdate(
            language: "en",
            subtitleLanguage: nil,
            autoplay: nil,
            notifications: nil,
            contentRating: nil,
            quality: nil
        )

        XCTAssertFalse(viewModel.isSaving)

        Task {
            await viewModel.updatePreferences(preferences)
            XCTAssertFalse(viewModel.isSaving)
            expectation.fulfill()
        }

        await fulfillment(of: [expectation], timeout: 5.0)
    }

    // MARK: - Error Handling Tests

    @MainActor
    func test_updateProfile_subsequentCall_clearsError() async {
        mockRepository.shouldSucceed = false
        await viewModel.updateProfile(displayName: "Test", avatar: nil, language: nil)
        XCTAssertNotNil(viewModel.error)

        mockRepository.shouldSucceed = true
        await viewModel.updateProfile(displayName: "New Test", avatar: nil, language: nil)

        XCTAssertNil(viewModel.error)
    }
}

// MARK: - Mock Implementation

private final class MockUserRepository: UserRepository {
    var shouldSucceed = true
    var fetchProfileCallCount = 0
    var fetchProfileStatsCallCount = 0
    var lastUpdateRequest: ProfileUpdateRequest?

    func fetchProfile() async throws -> ProfileResponse {
        fetchProfileCallCount += 1

        if shouldSucceed {
            return ProfileResponse(
                userId: "user123",
                email: "test@example.com",
                displayName: "Test User",
                avatar: "avatar.jpg",
                language: "en",
                createdAt: "2024-01-01"
            )
        } else {
            throw NSError(domain: "test", code: 1, userInfo: [NSLocalizedDescriptionKey: "Mock error"])
        }
    }

    func fetchProfileStats() async throws -> ProfileStats {
        fetchProfileStatsCallCount += 1

        if shouldSucceed {
            return ProfileStats(
                watchedCount: 50,
                favoritesCount: 20,
                totalWatchTime: 86400
            )
        } else {
            throw NSError(domain: "test", code: 1, userInfo: [NSLocalizedDescriptionKey: "Mock error"])
        }
    }

    func updateProfile(request: ProfileUpdateRequest) async throws -> ProfileResponse {
        lastUpdateRequest = request

        if shouldSucceed {
            return ProfileResponse(
                userId: "user123",
                email: "test@example.com",
                displayName: request.displayName ?? "Test User",
                avatar: request.avatar ?? "avatar.jpg",
                language: request.language ?? "en",
                createdAt: "2024-01-01"
            )
        } else {
            throw NSError(domain: "test", code: 1, userInfo: [NSLocalizedDescriptionKey: "Mock error"])
        }
    }

    func fetchFavorites(page: Int, limit: Int) async throws -> FavoritesResponse { fatalError() }
    func toggleFavorite(request: FavoriteToggleRequest) async throws -> FavoriteToggleResponse { fatalError() }
    func removeFavorite(contentId: String) async throws -> EmptyResponse { fatalError() }
    func fetchDownloads() async throws -> DownloadsResponse { fatalError() }
    func startDownload(request: DownloadStartRequest) async throws -> DownloadStartResponse { fatalError() }
    func deleteDownload(downloadId: String) async throws -> EmptyResponse { fatalError() }
}
