import XCTest
@testable import BayitPlusApp

final class PendingIntentManagerTests: XCTestCase {

    private var manager: PendingIntentManager!

    override func setUp() {
        super.setUp()
        manager = PendingIntentManager.shared
        // Reset state between tests
        _ = manager.consumePendingRoute()
        manager.lastPlayedContentId = nil
        manager.lastPlayedContentType = nil
    }

    // MARK: - requestPlay

    func testRequestPlaySetsPendingRoute() {
        manager.requestPlay(contentId: "movie-1", contentType: .movie)

        XCTAssertEqual(
            manager.pendingRoute,
            .player(contentId: "movie-1", contentType: .movie)
        )
    }

    func testRequestPlayWithLiveType() {
        manager.requestPlay(contentId: "channel-5", contentType: .live)

        XCTAssertEqual(
            manager.pendingRoute,
            .player(contentId: "channel-5", contentType: .live)
        )
    }

    // MARK: - requestSearch

    func testRequestSearchSetsPendingRoute() {
        manager.requestSearch(query: "funny movies")
        XCTAssertEqual(manager.pendingRoute, .search)
    }

    func testRequestSearchWithNilQuery() {
        manager.requestSearch(query: nil)
        XCTAssertEqual(manager.pendingRoute, .search)
    }

    // MARK: - requestLiveTV / requestRadio / requestPodcasts

    func testRequestLiveTV() {
        manager.requestLiveTV()
        XCTAssertEqual(manager.pendingRoute, .liveTV)
    }

    func testRequestRadio() {
        manager.requestRadio()
        XCTAssertEqual(manager.pendingRoute, .radio)
    }

    func testRequestPodcasts() {
        manager.requestPodcasts()
        XCTAssertEqual(manager.pendingRoute, .podcasts)
    }

    // MARK: - requestResume

    func testRequestResumeWithLastPlayed() {
        manager.recordPlayback(contentId: "ep-10", contentType: .episode)
        manager.requestResume()

        XCTAssertEqual(
            manager.pendingRoute,
            .player(contentId: "ep-10", contentType: .episode)
        )
    }

    func testRequestResumeWithoutLastPlayedDoesNothing() {
        manager.requestResume()
        XCTAssertNil(manager.pendingRoute)
    }

    func testRequestResumeWithOnlyContentIdDoesNothing() {
        manager.lastPlayedContentId = "abc"
        manager.lastPlayedContentType = nil
        manager.requestResume()
        XCTAssertNil(manager.pendingRoute)
    }

    func testRequestResumeWithOnlyContentTypeDoesNothing() {
        manager.lastPlayedContentId = nil
        manager.lastPlayedContentType = .movie
        manager.requestResume()
        XCTAssertNil(manager.pendingRoute)
    }

    // MARK: - consumePendingRoute

    func testConsumePendingRouteReturnsRoute() {
        manager.requestLiveTV()
        let route = manager.consumePendingRoute()
        XCTAssertEqual(route, .liveTV)
    }

    func testConsumePendingRouteClearsRoute() {
        manager.requestLiveTV()
        _ = manager.consumePendingRoute()
        XCTAssertNil(manager.pendingRoute)
    }

    func testConsumePendingRouteReturnsNilWhenEmpty() {
        let route = manager.consumePendingRoute()
        XCTAssertNil(route)
    }

    func testConsumeIsIdempotent() {
        manager.requestRadio()
        _ = manager.consumePendingRoute()
        let secondConsume = manager.consumePendingRoute()
        XCTAssertNil(secondConsume)
    }

    // MARK: - recordPlayback

    func testRecordPlaybackStoresValues() {
        manager.recordPlayback(contentId: "pod-5", contentType: .podcast)

        XCTAssertEqual(manager.lastPlayedContentId, "pod-5")
        XCTAssertEqual(manager.lastPlayedContentType, .podcast)
    }

    func testRecordPlaybackOverwritesPrevious() {
        manager.recordPlayback(contentId: "first", contentType: .movie)
        manager.recordPlayback(contentId: "second", contentType: .series)

        XCTAssertEqual(manager.lastPlayedContentId, "second")
        XCTAssertEqual(manager.lastPlayedContentType, .series)
    }

    // MARK: - Overwrite Behavior

    func testNewRequestOverwritesPending() {
        manager.requestLiveTV()
        manager.requestRadio()
        XCTAssertEqual(manager.pendingRoute, .radio)
    }
}
