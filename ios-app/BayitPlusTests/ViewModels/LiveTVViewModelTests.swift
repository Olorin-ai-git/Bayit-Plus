import XCTest
@testable import BayitPlusApp

final class LiveTVViewModelTests: XCTestCase {

    private var viewModel: LiveTVViewModel!
    private var mockRepository: MockLiveTVRepository!

    override func setUp() {
        super.setUp()
        mockRepository = MockLiveTVRepository()
        viewModel = LiveTVViewModel(repository: mockRepository)
    }

    override func tearDown() {
        viewModel = nil
        mockRepository = nil
        super.tearDown()
    }

    // MARK: - Initial State Tests

    func test_initialState_allPropertiesHaveDefaults() {
        XCTAssertEqual(viewModel.channels, [])
        XCTAssertFalse(viewModel.isLoading)
        XCTAssertNil(viewModel.error)
    }

    // MARK: - Load Channels Tests

    @MainActor
    func test_loadChannels_success_populatesChannels() async {
        let expectation = XCTestExpectation(description: "Load channels succeeds")

        mockRepository.shouldSucceed = true

        await viewModel.loadChannels()

        XCTAssertEqual(viewModel.channels.count, 10)
        XCTAssertFalse(viewModel.isLoading)
        XCTAssertNil(viewModel.error)
        XCTAssertEqual(viewModel.channels.first?.name, "Channel 1")
        XCTAssertEqual(viewModel.channels.last?.name, "Channel 10")

        expectation.fulfill()
        await fulfillment(of: [expectation], timeout: 5.0)
    }

    @MainActor
    func test_loadChannels_failure_setsError() async {
        let expectation = XCTestExpectation(description: "Load channels fails")

        mockRepository.shouldSucceed = false

        await viewModel.loadChannels()

        XCTAssertEqual(viewModel.channels, [])
        XCTAssertFalse(viewModel.isLoading)
        XCTAssertNotNil(viewModel.error)
        XCTAssertEqual(viewModel.error, "Mock error")

        expectation.fulfill()
        await fulfillment(of: [expectation], timeout: 5.0)
    }

    @MainActor
    func test_loadChannels_stateTransition_loadingToLoaded() async {
        let expectation = XCTestExpectation(description: "State transitions correctly")

        mockRepository.shouldSucceed = true

        XCTAssertFalse(viewModel.isLoading)

        Task {
            await viewModel.loadChannels()
            XCTAssertFalse(viewModel.isLoading)
            expectation.fulfill()
        }

        await fulfillment(of: [expectation], timeout: 5.0)
    }

    @MainActor
    func test_loadChannels_preventsReentrantCalls() async {
        mockRepository.shouldSucceed = true

        let task1 = Task {
            await viewModel.loadChannels()
        }

        let task2 = Task {
            await viewModel.loadChannels()
        }

        await task1.value
        await task2.value

        XCTAssertEqual(mockRepository.fetchChannelsCallCount, 1)
    }

    @MainActor
    func test_loadChannels_populatesLiveMetadata() async {
        let expectation = XCTestExpectation(description: "Populates live metadata")

        mockRepository.shouldSucceed = true

        await viewModel.loadChannels()

        guard let firstChannel = viewModel.channels.first else {
            XCTFail("No channels loaded")
            return
        }

        XCTAssertNotNil(firstChannel.logo)
        XCTAssertNotNil(firstChannel.streamUrl)
        XCTAssertNotNil(firstChannel.currentShow)
        XCTAssertEqual(firstChannel.category, "News")

        expectation.fulfill()
        await fulfillment(of: [expectation], timeout: 5.0)
    }

    // MARK: - Refresh Tests

    @MainActor
    func test_refresh_success_updatesChannels() async {
        let expectation = XCTestExpectation(description: "Refresh succeeds")

        mockRepository.shouldSucceed = true

        await viewModel.loadChannels()
        let initialChannels = viewModel.channels

        mockRepository.channelNamePrefix = "Updated Channel"
        await viewModel.refresh()

        XCTAssertEqual(viewModel.channels.count, 10)
        XCTAssertFalse(viewModel.isLoading)
        XCTAssertNil(viewModel.error)
        XCTAssertNotEqual(viewModel.channels.first?.name, initialChannels.first?.name)
        XCTAssertEqual(viewModel.channels.first?.name, "Updated Channel 1")

        expectation.fulfill()
        await fulfillment(of: [expectation], timeout: 5.0)
    }

    @MainActor
    func test_refresh_clearsExistingError() async {
        let expectation = XCTestExpectation(description: "Refresh clears error")

        mockRepository.shouldSucceed = false
        await viewModel.loadChannels()
        XCTAssertNotNil(viewModel.error)

        mockRepository.shouldSucceed = true
        await viewModel.refresh()

        XCTAssertNil(viewModel.error)

        expectation.fulfill()
        await fulfillment(of: [expectation], timeout: 5.0)
    }

    @MainActor
    func test_refresh_doesNotDuplicateChannels() async {
        let expectation = XCTestExpectation(description: "Refresh replaces channels")

        mockRepository.shouldSucceed = true

        await viewModel.loadChannels()
        XCTAssertEqual(viewModel.channels.count, 10)

        await viewModel.refresh()
        XCTAssertEqual(viewModel.channels.count, 10)

        expectation.fulfill()
        await fulfillment(of: [expectation], timeout: 5.0)
    }

    // MARK: - Error Handling Tests

    @MainActor
    func test_loadChannels_errorDoesNotClearExistingData() async {
        mockRepository.shouldSucceed = true
        await viewModel.loadChannels()
        XCTAssertEqual(viewModel.channels.count, 10)

        mockRepository.shouldSucceed = false
        await viewModel.refresh()

        XCTAssertNotNil(viewModel.error)
    }
}

// MARK: - Mock Implementation

private final class MockLiveTVRepository: LiveTVRepository {
    var shouldSucceed = true
    var fetchChannelsCallCount = 0
    var channelNamePrefix = "Channel"

    func fetchChannels(cultureId: String?, category: String?) async throws -> LiveChannelsResponse {
        fetchChannelsCallCount += 1

        if shouldSucceed {
            let channels = (1...10).map { i in
                LiveChannelItem(
                    id: "ch\(i)",
                    name: "\(channelNamePrefix) \(i)",
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

    func fetchChannelDetail(id: String) async throws -> LiveChannelDetail {
        fatalError("Not implemented for tests")
    }

    func fetchEPG(channelId: String, date: String?) async throws -> EPGResponse {
        fatalError("Not implemented for tests")
    }
}
