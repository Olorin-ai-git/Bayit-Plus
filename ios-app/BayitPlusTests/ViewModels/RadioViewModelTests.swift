import XCTest
@testable import BayitPlusApp

final class RadioViewModelTests: XCTestCase {

    private var viewModel: RadioViewModel!
    private var mockRepository: MockRadioRepository!

    override func setUp() {
        super.setUp()
        mockRepository = MockRadioRepository()
        viewModel = RadioViewModel(repository: mockRepository)
    }

    override func tearDown() {
        viewModel = nil
        mockRepository = nil
        super.tearDown()
    }

    // MARK: - Initial State Tests

    func test_initialState_allPropertiesHaveDefaults() {
        XCTAssertEqual(viewModel.stations, [])
        XCTAssertFalse(viewModel.isLoading)
        XCTAssertNil(viewModel.error)
    }

    // MARK: - Load Stations Tests

    @MainActor
    func test_loadStations_success_populatesStations() async {
        let expectation = XCTestExpectation(description: "Load stations succeeds")

        mockRepository.shouldSucceed = true

        await viewModel.loadStations()

        XCTAssertEqual(viewModel.stations.count, 12)
        XCTAssertFalse(viewModel.isLoading)
        XCTAssertNil(viewModel.error)
        XCTAssertEqual(viewModel.stations.first?.name, "Station 1")
        XCTAssertEqual(viewModel.stations.last?.name, "Station 12")

        expectation.fulfill()
        await fulfillment(of: [expectation], timeout: 5.0)
    }

    @MainActor
    func test_loadStations_failure_setsError() async {
        let expectation = XCTestExpectation(description: "Load stations fails")

        mockRepository.shouldSucceed = false

        await viewModel.loadStations()

        XCTAssertEqual(viewModel.stations, [])
        XCTAssertFalse(viewModel.isLoading)
        XCTAssertNotNil(viewModel.error)
        XCTAssertEqual(viewModel.error, "Mock error")

        expectation.fulfill()
        await fulfillment(of: [expectation], timeout: 5.0)
    }

    @MainActor
    func test_loadStations_stateTransition_loadingToLoaded() async {
        let expectation = XCTestExpectation(description: "State transitions correctly")

        mockRepository.shouldSucceed = true

        XCTAssertFalse(viewModel.isLoading)

        Task {
            await viewModel.loadStations()
            XCTAssertFalse(viewModel.isLoading)
            expectation.fulfill()
        }

        await fulfillment(of: [expectation], timeout: 5.0)
    }

    @MainActor
    func test_loadStations_preventsReentrantCalls() async {
        mockRepository.shouldSucceed = true

        let task1 = Task {
            await viewModel.loadStations()
        }

        let task2 = Task {
            await viewModel.loadStations()
        }

        await task1.value
        await task2.value

        XCTAssertEqual(mockRepository.fetchStationsCallCount, 1)
    }

    @MainActor
    func test_loadStations_populatesLiveMetadata() async {
        let expectation = XCTestExpectation(description: "Populates live metadata")

        mockRepository.shouldSucceed = true

        await viewModel.loadStations()

        guard let firstStation = viewModel.stations.first else {
            XCTFail("No stations loaded")
            return
        }

        XCTAssertNotNil(firstStation.logo)
        XCTAssertNotNil(firstStation.streamUrl)
        XCTAssertNotNil(firstStation.nowPlaying)
        XCTAssertEqual(firstStation.genre, "News")

        expectation.fulfill()
        await fulfillment(of: [expectation], timeout: 5.0)
    }

    @MainActor
    func test_loadStations_populatesVariousGenres() async {
        let expectation = XCTestExpectation(description: "Populates various genres")

        mockRepository.shouldSucceed = true

        await viewModel.loadStations()

        let genres = Set(viewModel.stations.compactMap(\.genre))
        XCTAssertTrue(genres.contains("News"))
        XCTAssertTrue(genres.contains("Music"))
        XCTAssertTrue(genres.contains("Talk"))

        expectation.fulfill()
        await fulfillment(of: [expectation], timeout: 5.0)
    }

    // MARK: - Refresh Tests

    @MainActor
    func test_refresh_success_updatesStations() async {
        let expectation = XCTestExpectation(description: "Refresh succeeds")

        mockRepository.shouldSucceed = true

        await viewModel.loadStations()
        let initialStations = viewModel.stations

        mockRepository.stationNamePrefix = "Updated Station"
        await viewModel.refresh()

        XCTAssertEqual(viewModel.stations.count, 12)
        XCTAssertFalse(viewModel.isLoading)
        XCTAssertNil(viewModel.error)
        XCTAssertNotEqual(viewModel.stations.first?.name, initialStations.first?.name)
        XCTAssertEqual(viewModel.stations.first?.name, "Updated Station 1")

        expectation.fulfill()
        await fulfillment(of: [expectation], timeout: 5.0)
    }

    @MainActor
    func test_refresh_clearsExistingError() async {
        let expectation = XCTestExpectation(description: "Refresh clears error")

        mockRepository.shouldSucceed = false
        await viewModel.loadStations()
        XCTAssertNotNil(viewModel.error)

        mockRepository.shouldSucceed = true
        await viewModel.refresh()

        XCTAssertNil(viewModel.error)

        expectation.fulfill()
        await fulfillment(of: [expectation], timeout: 5.0)
    }

    @MainActor
    func test_refresh_doesNotDuplicateStations() async {
        let expectation = XCTestExpectation(description: "Refresh replaces stations")

        mockRepository.shouldSucceed = true

        await viewModel.loadStations()
        XCTAssertEqual(viewModel.stations.count, 12)

        await viewModel.refresh()
        XCTAssertEqual(viewModel.stations.count, 12)

        expectation.fulfill()
        await fulfillment(of: [expectation], timeout: 5.0)
    }

    // MARK: - Error Handling Tests

    @MainActor
    func test_loadStations_errorDoesNotClearExistingData() async {
        mockRepository.shouldSucceed = true
        await viewModel.loadStations()
        XCTAssertEqual(viewModel.stations.count, 12)

        mockRepository.shouldSucceed = false
        await viewModel.refresh()

        XCTAssertNotNil(viewModel.error)
    }

    // MARK: - Station Metadata Tests

    @MainActor
    func test_loadStations_allStationsHaveRequiredFields() async {
        let expectation = XCTestExpectation(description: "All stations have required fields")

        mockRepository.shouldSucceed = true

        await viewModel.loadStations()

        for station in viewModel.stations {
            XCTAssertFalse(station.id.isEmpty)
            XCTAssertFalse(station.name.isEmpty)
            XCTAssertNotNil(station.streamUrl)
            XCTAssertFalse(station.streamUrl!.isEmpty)
        }

        expectation.fulfill()
        await fulfillment(of: [expectation], timeout: 5.0)
    }

    @MainActor
    func test_loadStations_stationsHaveValidStreamUrls() async {
        let expectation = XCTestExpectation(description: "Stations have valid stream URLs")

        mockRepository.shouldSucceed = true

        await viewModel.loadStations()

        for station in viewModel.stations {
            if let streamUrl = station.streamUrl {
                XCTAssertTrue(streamUrl.hasPrefix("http"), "Stream URL should start with http: \(streamUrl)")
            }
        }

        expectation.fulfill()
        await fulfillment(of: [expectation], timeout: 5.0)
    }
}

// MARK: - Mock Implementation

private final class MockRadioRepository: RadioRepository {
    var shouldSucceed = true
    var fetchStationsCallCount = 0
    var stationNamePrefix = "Station"

    func fetchStations(cultureId: String?, genre: String?) async throws -> RadioStationsResponse {
        fetchStationsCallCount += 1

        if shouldSucceed {
            let stations = (1...12).map { i in
                let genres = ["News", "Music", "Talk", "Sports"]
                RadioStationItem(
                    id: "st\(i)",
                    name: "\(stationNamePrefix) \(i)",
                    logo: "https://example.com/st\(i).jpg",
                    streamUrl: "https://example.com/stream\(i).m3u8",
                    nowPlaying: "Track \(i)",
                    genre: genres[i % genres.count],
                    description: "Station \(i) description",
                    cultureId: "israeli"
                )
            }
            return RadioStationsResponse(stations: stations)
        } else {
            throw NSError(domain: "test", code: 1, userInfo: [NSLocalizedDescriptionKey: "Mock error"])
        }
    }

    func fetchStationDetail(id: String) async throws -> RadioStationDetail {
        fatalError("Not implemented for tests")
    }
}
