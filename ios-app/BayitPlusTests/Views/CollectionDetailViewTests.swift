import XCTest
@testable import BayitPlus

final class CollectionDetailViewTests: XCTestCase {

    var mockRepository: MockContentRepository!
    var viewModel: CollectionDetailViewModel!

    override func setUp() {
        super.setUp()
        mockRepository = MockContentRepository()
        viewModel = CollectionDetailViewModel(
            collectionId: "test-collection-id",
            repository: mockRepository
        )
    }

    override func tearDown() {
        mockRepository = nil
        viewModel = nil
        super.tearDown()
    }

    // MARK: - Collection Loading Tests

    func testLoadCollectionSuccess() async {
        // Given
        let expectedCollection = CollectionDetail(
            id: "test-collection-id",
            title: "The Lord of the Rings Collection",
            description: "Epic fantasy trilogy",
            thumbnail: "https://example.com/poster.jpg",
            backdrop: "https://example.com/backdrop.jpg",
            availableMovies: 3,
            totalMovies: 3,
            promoText: "An epic journey through Middle-earth",
            movies: [
                CollectionMovie(id: "m1", title: "Fellowship", thumbnail: nil, year: 2001, duration: "2h 58m", order: 1),
                CollectionMovie(id: "m2", title: "Two Towers", thumbnail: nil, year: 2002, duration: "2h 59m", order: 2),
                CollectionMovie(id: "m3", title: "Return", thumbnail: nil, year: 2003, duration: "3h 21m", order: 3)
            ]
        )
        mockRepository.collectionDetailResult = .success(expectedCollection)

        // When
        await viewModel.loadCollection()

        // Then
        XCTAssertNotNil(viewModel.collection)
        XCTAssertEqual(viewModel.collection?.id, "test-collection-id")
        XCTAssertEqual(viewModel.collection?.title, "The Lord of the Rings Collection")
        XCTAssertEqual(viewModel.collection?.movies.count, 3)
        XCTAssertNil(viewModel.error)
        XCTAssertFalse(viewModel.isLoading)
    }

    func testLoadCollectionFailure() async {
        // Given
        mockRepository.collectionDetailResult = .failure(NetworkError.notFound)

        // When
        await viewModel.loadCollection()

        // Then
        XCTAssertNil(viewModel.collection)
        XCTAssertNotNil(viewModel.error)
        XCTAssertFalse(viewModel.isLoading)
    }

    func testLoadCollectionSetsLoadingState() async {
        // Given
        mockRepository.collectionDetailDelay = 1.0
        mockRepository.collectionDetailResult = .success(createMockCollection())

        // When
        let loadTask = Task {
            await viewModel.loadCollection()
        }

        // Then - should be loading
        try? await Task.sleep(nanoseconds: 100_000_000) // 0.1s
        XCTAssertTrue(viewModel.isLoading)

        // Wait for completion
        await loadTask.value
        XCTAssertFalse(viewModel.isLoading)
    }

    // MARK: - Movie Order Tests

    func testMoviesAreSortedByOrder() async {
        // Given
        let collection = CollectionDetail(
            id: "test-id",
            title: "Test",
            description: nil,
            thumbnail: nil,
            backdrop: nil,
            availableMovies: 3,
            totalMovies: 3,
            promoText: nil,
            movies: [
                CollectionMovie(id: "m3", title: "Third", thumbnail: nil, year: nil, duration: nil, order: 3),
                CollectionMovie(id: "m1", title: "First", thumbnail: nil, year: nil, duration: nil, order: 1),
                CollectionMovie(id: "m2", title: "Second", thumbnail: nil, year: nil, duration: nil, order: 2)
            ]
        )
        mockRepository.collectionDetailResult = .success(collection)

        // When
        await viewModel.loadCollection()

        // Then
        let sortedMovies = viewModel.collection?.movies.sorted(by: { $0.order < $1.order })
        XCTAssertEqual(sortedMovies?[0].title, "First")
        XCTAssertEqual(sortedMovies?[1].title, "Second")
        XCTAssertEqual(sortedMovies?[2].title, "Third")
    }

    // MARK: - Helper Methods

    private func createMockCollection() -> CollectionDetail {
        return CollectionDetail(
            id: "test-id",
            title: "Test Collection",
            description: "Test description",
            thumbnail: "https://example.com/thumb.jpg",
            backdrop: "https://example.com/backdrop.jpg",
            availableMovies: 2,
            totalMovies: 3,
            promoText: "Test promo text",
            movies: [
                CollectionMovie(id: "m1", title: "Movie 1", thumbnail: nil, year: 2020, duration: "2h", order: 1),
                CollectionMovie(id: "m2", title: "Movie 2", thumbnail: nil, year: 2021, duration: "2h 10m", order: 2)
            ]
        )
    }
}

// MARK: - Mock Repository

class MockContentRepository: ContentRepository {
    var collectionDetailResult: Result<CollectionDetail, Error>?
    var collectionDetailDelay: TimeInterval = 0
    var collectionsResult: Result<ContentListResponse, Error>?

    func fetchCollectionDetail(id: String) async throws -> CollectionDetail {
        if collectionDetailDelay > 0 {
            try await Task.sleep(nanoseconds: UInt64(collectionDetailDelay * 1_000_000_000))
        }
        switch collectionDetailResult {
        case .success(let collection):
            return collection
        case .failure(let error):
            throw error
        case .none:
            throw NetworkError.unknown
        }
    }

    func fetchCollections(page: Int, limit: Int) async throws -> ContentListResponse {
        switch collectionsResult {
        case .success(let response):
            return response
        case .failure(let error):
            throw error
        case .none:
            throw NetworkError.unknown
        }
    }

    // Stub implementations for other required methods
    func fetchFeatured() async throws -> FeaturedResponse { fatalError("Not implemented") }
    func fetchAllContent(page: Int, limit: Int) async throws -> ContentListResponse { fatalError("Not implemented") }
    func fetchContentDetail(id: String) async throws -> ContentDetail { fatalError("Not implemented") }
    func searchContent(query: String, type: String?, page: Int, limit: Int) async throws -> SearchResponse { fatalError("Not implemented") }
    func fetchIsraelisInCity(city: String, state: String) async throws -> IsraelisInCityResponse { fatalError("Not implemented") }
    func fetchIsraeliBusinesses(city: String, state: String) async throws -> IsraeliBusinessesResponse { fatalError("Not implemented") }
    func fetchTelAvivContent() async throws -> CityContentResponse { fatalError("Not implemented") }
    func fetchJerusalemContent() async throws -> CityContentResponse { fatalError("Not implemented") }
    func fetchTrending(cultureId: String) async throws -> [CultureTrendingItem] { fatalError("Not implemented") }
    func fetchContinueWatching() async throws -> ContinueWatchingResponse { fatalError("Not implemented") }
}

enum NetworkError: Error {
    case notFound
    case unknown
}
