import XCTest
@testable import BayitPlusApp

final class SettingsViewModelTests: XCTestCase {

    private var viewModel: SettingsViewModel!
    private var mockSettingsRepository: MockSettingsRepository!
    private var mockUserRepository: MockUserRepository!

    override func setUp() {
        super.setUp()
        mockSettingsRepository = MockSettingsRepository()
        mockUserRepository = MockUserRepository()
        viewModel = SettingsViewModel(
            settingsRepository: mockSettingsRepository,
            userRepository: mockUserRepository
        )
    }

    override func tearDown() {
        viewModel = nil
        mockSettingsRepository = nil
        mockUserRepository = nil
        super.tearDown()
    }

    // MARK: - Initial State Tests

    func test_initialState_allPropertiesHaveDefaults() {
        XCTAssertFalse(viewModel.isLoading)
        XCTAssertNil(viewModel.error)
        XCTAssertFalse(viewModel.isSaving)
        XCTAssertNil(viewModel.preferences)
        XCTAssertFalse(viewModel.autoTranslate)
        XCTAssertFalse(viewModel.showIsraelTime)
        XCTAssertFalse(viewModel.shabbatMode)
        XCTAssertFalse(viewModel.subtitles)
        XCTAssertFalse(viewModel.autoplay)
        XCTAssertFalse(viewModel.notifications)
    }

    // MARK: - Load Tests

    @MainActor
    func test_load_success_populatesPreferences() async {
        let expectation = XCTestExpectation(description: "Load preferences succeeds")

        mockSettingsRepository.shouldSucceed = true

        await viewModel.load()

        XCTAssertNotNil(viewModel.preferences)
        XCTAssertTrue(viewModel.autoTranslate)
        XCTAssertTrue(viewModel.showIsraelTime)
        XCTAssertTrue(viewModel.shabbatMode)
        XCTAssertTrue(viewModel.subtitles)
        XCTAssertFalse(viewModel.isLoading)
        XCTAssertNil(viewModel.error)

        expectation.fulfill()
        await fulfillment(of: [expectation], timeout: 5.0)
    }

    @MainActor
    func test_load_failure_setsError() async {
        let expectation = XCTestExpectation(description: "Load preferences fails")

        mockSettingsRepository.shouldSucceed = false

        await viewModel.load()

        XCTAssertNil(viewModel.preferences)
        XCTAssertFalse(viewModel.isLoading)
        XCTAssertNotNil(viewModel.error)
        XCTAssertEqual(viewModel.error, "Mock error")

        expectation.fulfill()
        await fulfillment(of: [expectation], timeout: 5.0)
    }

    @MainActor
    func test_load_stateTransition_loadingToLoaded() async {
        let expectation = XCTestExpectation(description: "State transitions correctly")

        mockSettingsRepository.shouldSucceed = true

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
        mockSettingsRepository.shouldSucceed = true

        let task1 = Task {
            await viewModel.load()
        }

        let task2 = Task {
            await viewModel.load()
        }

        await task1.value
        await task2.value

        XCTAssertEqual(mockSettingsRepository.fetchPreferencesCallCount, 1)
    }

    @MainActor
    func test_load_syncsLocalState() async {
        let expectation = XCTestExpectation(description: "Syncs local state")

        mockSettingsRepository.shouldSucceed = true

        await viewModel.load()

        XCTAssertTrue(viewModel.autoTranslate)
        XCTAssertTrue(viewModel.showIsraelTime)
        XCTAssertTrue(viewModel.shabbatMode)
        XCTAssertTrue(viewModel.subtitles)

        expectation.fulfill()
        await fulfillment(of: [expectation], timeout: 5.0)
    }

    // MARK: - Update Auto Translate Tests

    @MainActor
    func test_updateAutoTranslate_success_updatesLocalState() async {
        let expectation = XCTestExpectation(description: "Update auto translate succeeds")

        mockSettingsRepository.shouldSucceed = true

        XCTAssertFalse(viewModel.autoTranslate)

        await viewModel.updateAutoTranslate(true)

        XCTAssertTrue(viewModel.autoTranslate)
        XCTAssertFalse(viewModel.isSaving)
        XCTAssertNil(viewModel.error)

        expectation.fulfill()
        await fulfillment(of: [expectation], timeout: 5.0)
    }

    @MainActor
    func test_updateAutoTranslate_failure_setsError() async {
        let expectation = XCTestExpectation(description: "Update auto translate fails")

        mockSettingsRepository.shouldSucceed = false

        await viewModel.updateAutoTranslate(true)

        XCTAssertNotNil(viewModel.error)
        XCTAssertEqual(viewModel.error, "Mock error")

        expectation.fulfill()
        await fulfillment(of: [expectation], timeout: 5.0)
    }

    @MainActor
    func test_updateAutoTranslate_stateTransition_savingToSaved() async {
        let expectation = XCTestExpectation(description: "State transitions correctly")

        mockSettingsRepository.shouldSucceed = true

        XCTAssertFalse(viewModel.isSaving)

        Task {
            await viewModel.updateAutoTranslate(true)
            XCTAssertFalse(viewModel.isSaving)
            expectation.fulfill()
        }

        await fulfillment(of: [expectation], timeout: 5.0)
    }

    // MARK: - Update Subtitles Tests

    @MainActor
    func test_updateSubtitles_success_updatesLocalState() async {
        let expectation = XCTestExpectation(description: "Update subtitles succeeds")

        mockSettingsRepository.shouldSucceed = true

        XCTAssertFalse(viewModel.subtitles)

        await viewModel.updateSubtitles(true)

        XCTAssertTrue(viewModel.subtitles)
        XCTAssertFalse(viewModel.isSaving)
        XCTAssertNil(viewModel.error)

        expectation.fulfill()
        await fulfillment(of: [expectation], timeout: 5.0)
    }

    @MainActor
    func test_updateSubtitles_failure_setsError() async {
        let expectation = XCTestExpectation(description: "Update subtitles fails")

        mockSettingsRepository.shouldSucceed = false

        await viewModel.updateSubtitles(true)

        XCTAssertNotNil(viewModel.error)

        expectation.fulfill()
        await fulfillment(of: [expectation], timeout: 5.0)
    }

    // MARK: - Update Autoplay Tests

    @MainActor
    func test_updateAutoplay_success_updatesLocalState() async {
        let expectation = XCTestExpectation(description: "Update autoplay succeeds")

        mockUserRepository.shouldSucceed = true

        XCTAssertFalse(viewModel.autoplay)

        await viewModel.updateAutoplay(true)

        XCTAssertTrue(viewModel.autoplay)
        XCTAssertNil(viewModel.error)

        expectation.fulfill()
        await fulfillment(of: [expectation], timeout: 5.0)
    }

    @MainActor
    func test_updateAutoplay_failure_setsError() async {
        let expectation = XCTestExpectation(description: "Update autoplay fails")

        mockUserRepository.shouldSucceed = false

        await viewModel.updateAutoplay(true)

        XCTAssertNotNil(viewModel.error)

        expectation.fulfill()
        await fulfillment(of: [expectation], timeout: 5.0)
    }

    // MARK: - Update Notifications Tests

    @MainActor
    func test_updateNotifications_success_updatesLocalState() async {
        let expectation = XCTestExpectation(description: "Update notifications succeeds")

        mockUserRepository.shouldSucceed = true

        XCTAssertFalse(viewModel.notifications)

        await viewModel.updateNotifications(true)

        XCTAssertTrue(viewModel.notifications)
        XCTAssertNil(viewModel.error)

        expectation.fulfill()
        await fulfillment(of: [expectation], timeout: 5.0)
    }

    @MainActor
    func test_updateNotifications_failure_setsError() async {
        let expectation = XCTestExpectation(description: "Update notifications fails")

        mockUserRepository.shouldSucceed = false

        await viewModel.updateNotifications(true)

        XCTAssertNotNil(viewModel.error)

        expectation.fulfill()
        await fulfillment(of: [expectation], timeout: 5.0)
    }

    // MARK: - Error Handling Tests

    @MainActor
    func test_updatePreferences_subsequentCall_clearsError() async {
        mockSettingsRepository.shouldSucceed = false
        await viewModel.updateAutoTranslate(true)
        XCTAssertNotNil(viewModel.error)

        mockSettingsRepository.shouldSucceed = true
        await viewModel.load()

        XCTAssertNil(viewModel.error)
    }

    // MARK: - Multiple Settings Updates Tests

    @MainActor
    func test_multipleUpdates_sequential() async {
        mockSettingsRepository.shouldSucceed = true
        mockUserRepository.shouldSucceed = true

        await viewModel.updateAutoTranslate(true)
        XCTAssertTrue(viewModel.autoTranslate)

        await viewModel.updateSubtitles(true)
        XCTAssertTrue(viewModel.subtitles)

        await viewModel.updateAutoplay(true)
        XCTAssertTrue(viewModel.autoplay)

        await viewModel.updateNotifications(true)
        XCTAssertTrue(viewModel.notifications)
    }
}

// MARK: - Mock Implementations

private final class MockSettingsRepository: SettingsRepository {
    var shouldSucceed = true
    var fetchPreferencesCallCount = 0

    func fetchPreferences() async throws -> UserPreferencesResponse {
        fetchPreferencesCallCount += 1

        if shouldSucceed {
            return UserPreferencesResponse(
                preferences: UserPreferencesDetail(
                    autoTranslateEnabled: true,
                    showIsraelTime: true,
                    shabbatModeEnabled: true,
                    subtitlesEnabled: true
                )
            )
        } else {
            throw NSError(domain: "test", code: 1, userInfo: [NSLocalizedDescriptionKey: "Mock error"])
        }
    }

    func updatePreferences(request: UserPreferencesUpdate) async throws -> UserPreferencesResponse {
        if shouldSucceed {
            return UserPreferencesResponse(
                preferences: UserPreferencesDetail(
                    autoTranslateEnabled: request.autoTranslateEnabled ?? true,
                    showIsraelTime: request.showIsraelTime ?? true,
                    shabbatModeEnabled: request.shabbatModeEnabled ?? true,
                    subtitlesEnabled: request.subtitlesEnabled ?? true
                )
            )
        } else {
            throw NSError(domain: "test", code: 1, userInfo: [NSLocalizedDescriptionKey: "Mock error"])
        }
    }
}

private final class MockUserRepository: UserRepository {
    var shouldSucceed = true

    func updateProfile(request: ProfileUpdateRequest) async throws -> ProfileResponse {
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

    func fetchProfile() async throws -> ProfileResponse { fatalError() }
    func fetchProfileStats() async throws -> ProfileStats { fatalError() }
    func fetchFavorites(page: Int, limit: Int) async throws -> FavoritesResponse { fatalError() }
    func toggleFavorite(request: FavoriteToggleRequest) async throws -> FavoriteToggleResponse { fatalError() }
    func removeFavorite(contentId: String) async throws -> EmptyResponse { fatalError() }
    func fetchDownloads() async throws -> DownloadsResponse { fatalError() }
    func startDownload(request: DownloadStartRequest) async throws -> DownloadStartResponse { fatalError() }
    func deleteDownload(downloadId: String) async throws -> EmptyResponse { fatalError() }
}
