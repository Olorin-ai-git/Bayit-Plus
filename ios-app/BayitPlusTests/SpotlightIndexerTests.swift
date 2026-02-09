import XCTest
import CoreSpotlight
@testable import BayitPlusApp

@MainActor
final class SpotlightIndexerTests: XCTestCase {

    private var indexer: SpotlightIndexer!

    override func setUp() {
        super.setUp()
        indexer = SpotlightIndexer()
    }

    override func tearDown() {
        indexer = nil
        super.tearDown()
    }

    // MARK: - Empty Input Handling

    func testIndexEmptyMoviesDoesNotCrash() {
        indexer.indexMovies([])
    }

    func testIndexEmptySeriesDoesNotCrash() {
        indexer.indexSeries([])
    }

    func testIndexEmptyChannelsDoesNotCrash() {
        indexer.indexChannels([])
    }

    func testIndexEmptyRadioStationsDoesNotCrash() {
        indexer.indexRadioStations([])
    }

    // MARK: - SpotlightItem Construction

    func testSpotlightItemWithMinimalData() {
        let item = SpotlightItem(
            id: "test-1",
            title: nil,
            description: nil,
            backdrop: nil,
            thumbnail: nil,
            category: nil,
            year: nil,
            duration: nil,
            rating: nil,
            isSeries: nil,
            totalEpisodes: nil,
            availableSubtitleLanguages: nil,
            hasSubtitles: nil
        )

        indexer.indexMovies([item])
    }

    func testSpotlightItemWithFullData() {
        let item = SpotlightItem(
            id: "movie-full",
            title: "Test Movie",
            description: "A test movie description",
            backdrop: "https://example.com/backdrop.jpg",
            thumbnail: "https://example.com/thumb.jpg",
            category: "drama",
            year: 2024,
            duration: "2h 15m",
            rating: nil,
            isSeries: false,
            totalEpisodes: nil,
            availableSubtitleLanguages: ["en", "he"],
            hasSubtitles: true
        )

        indexer.indexMovies([item])
    }

    // MARK: - Multiple Items

    func testIndexMultipleMovies() {
        let items = (1...5).map { index in
            SpotlightItem(
                id: "movie-\(index)",
                title: "Movie \(index)",
                description: nil,
                backdrop: nil,
                thumbnail: nil,
                category: "action",
                year: 2024,
                duration: nil,
                rating: nil,
                isSeries: nil,
                totalEpisodes: nil,
                availableSubtitleLanguages: nil,
                hasSubtitles: nil
            )
        }

        indexer.indexMovies(items)
    }

    func testIndexMultipleContentTypes() {
        let movie = SpotlightItem(
            id: "m1", title: "Movie", description: nil,
            backdrop: nil, thumbnail: nil, category: nil,
            year: nil, duration: nil, rating: nil,
            isSeries: nil, totalEpisodes: nil,
            availableSubtitleLanguages: nil, hasSubtitles: nil
        )
        let channel = SpotlightItem(
            id: "c1", title: "Channel", description: nil,
            backdrop: nil, thumbnail: nil, category: nil,
            year: nil, duration: nil, rating: nil,
            isSeries: nil, totalEpisodes: nil,
            availableSubtitleLanguages: nil, hasSubtitles: nil
        )

        indexer.indexMovies([movie])
        indexer.indexChannels([channel])
    }

    // MARK: - Remove Operations

    func testRemoveAllDoesNotCrash() {
        indexer.removeAll()
    }

    func testRemoveByIdsDoesNotCrash() {
        indexer.remove(ids: ["movie-1", "series-2"])
    }

    func testRemoveEmptyIdsDoesNotCrash() {
        indexer.remove(ids: [])
    }
}
