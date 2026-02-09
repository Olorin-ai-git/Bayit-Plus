import XCTest
@testable import BayitPlusApp

final class DeepLinkTests: XCTestCase {

    // MARK: - Tab Root Deep Links

    func testEmptyPathReturnsHome() {
        let url = URL(string: "bayitplus://")!
        let route = DeepLink.route(from: url)
        XCTAssertEqual(route, .home)
    }

    func testLiveDeepLink() {
        let url = URL(string: "bayitplus://live")!
        let route = DeepLink.route(from: url)
        XCTAssertEqual(route, .liveTV)
    }

    func testRadioDeepLink() {
        let url = URL(string: "bayitplus://radio")!
        let route = DeepLink.route(from: url)
        XCTAssertEqual(route, .radio)
    }

    func testPodcastsDeepLink() {
        let url = URL(string: "bayitplus://podcasts")!
        let route = DeepLink.route(from: url)
        XCTAssertEqual(route, .podcasts)
    }

    func testSearchDeepLink() {
        let url = URL(string: "bayitplus://search")!
        let route = DeepLink.route(from: url)
        XCTAssertEqual(route, .search)
    }

    // MARK: - Content Deep Links

    func testMovieDeepLink() {
        let url = URL(string: "bayitplus://movie/abc-123")!
        let route = DeepLink.route(from: url)
        XCTAssertEqual(route, .movieDetail(movieId: "abc-123"))
    }

    func testSeriesDeepLink() {
        let url = URL(string: "bayitplus://series/ser-456")!
        let route = DeepLink.route(from: url)
        XCTAssertEqual(route, .seriesDetail(seriesId: "ser-456"))
    }

    func testPlayerDeepLinkWithTypeQuery() {
        let url = URL(string: "bayitplus://play/content-1?type=movie")!
        let route = DeepLink.route(from: url)
        XCTAssertEqual(route, .player(contentId: "content-1", contentType: .movie))
    }

    func testPlayerDeepLinkDefaultsToMovie() {
        let url = URL(string: "bayitplus://play/content-2")!
        let route = DeepLink.route(from: url)
        XCTAssertEqual(route, .player(contentId: "content-2", contentType: .movie))
    }

    func testPlayerDeepLinkWithLiveType() {
        let url = URL(string: "bayitplus://play/channel-1?type=live")!
        let route = DeepLink.route(from: url)
        XCTAssertEqual(route, .player(contentId: "channel-1", contentType: .live))
    }

    func testPlayerDeepLinkMissingContentIdReturnsNil() {
        let url = URL(string: "bayitplus://play")!
        let route = DeepLink.route(from: url)
        XCTAssertNil(route)
    }

    func testMovieDeepLinkMissingIdReturnsNil() {
        let url = URL(string: "bayitplus://movie")!
        let route = DeepLink.route(from: url)
        XCTAssertNil(route)
    }

    // MARK: - Feature Deep Links

    func testProfileDeepLink() {
        let url = URL(string: "bayitplus://profile")!
        XCTAssertEqual(DeepLink.route(from: url), .profile)
    }

    func testFavoritesDeepLink() {
        let url = URL(string: "bayitplus://favorites")!
        XCTAssertEqual(DeepLink.route(from: url), .favorites)
    }

    func testSettingsDeepLink() {
        let url = URL(string: "bayitplus://settings")!
        XCTAssertEqual(DeepLink.route(from: url), .settings)
    }

    func testSupportDeepLink() {
        let url = URL(string: "bayitplus://support")!
        XCTAssertEqual(DeepLink.route(from: url), .support)
    }

    func testJudaismDeepLink() {
        let url = URL(string: "bayitplus://judaism")!
        XCTAssertEqual(DeepLink.route(from: url), .judaism)
    }

    func testChildrenDeepLink() {
        let url = URL(string: "bayitplus://children")!
        XCTAssertEqual(DeepLink.route(from: url), .children)
    }

    func testTriviaDeepLinkWithContentId() {
        let url = URL(string: "bayitplus://trivia/quiz-1")!
        XCTAssertEqual(DeepLink.route(from: url), .trivia(contentId: "quiz-1"))
    }

    func testTriviaDeepLinkMissingIdReturnsNil() {
        let url = URL(string: "bayitplus://trivia")!
        XCTAssertNil(DeepLink.route(from: url))
    }

    func testAudiobooksDeepLink() {
        let url = URL(string: "bayitplus://audiobooks")!
        XCTAssertEqual(DeepLink.route(from: url), .audiobooks)
    }

    func testAudiobookDetailDeepLink() {
        let url = URL(string: "bayitplus://audiobooks/ab-789")!
        XCTAssertEqual(DeepLink.route(from: url), .audiobookDetail(audiobookId: "ab-789"))
    }

    // MARK: - Social Deep Links

    func testWatchPartyDeepLink() {
        let url = URL(string: "bayitplus://party")!
        XCTAssertEqual(DeepLink.route(from: url), .watchParty)
    }

    func testWatchPartyDetailDeepLink() {
        let url = URL(string: "bayitplus://party/join-code-123")!
        XCTAssertEqual(DeepLink.route(from: url), .watchPartyDetail(partyId: "join-code-123"))
    }

    func testDirectMessagesDeepLink() {
        let url = URL(string: "bayitplus://dm")!
        XCTAssertEqual(DeepLink.route(from: url), .directMessages)
    }

    func testConversationDeepLink() {
        let url = URL(string: "bayitplus://dm/friend-456")!
        XCTAssertEqual(DeepLink.route(from: url), .conversation(friendId: "friend-456"))
    }

    func testChessDeepLinkWithGameId() {
        let url = URL(string: "bayitplus://chess/game-1")!
        XCTAssertEqual(DeepLink.route(from: url), .chess(gameId: "game-1"))
    }

    func testChessDeepLinkWithoutGameId() {
        let url = URL(string: "bayitplus://chess")!
        XCTAssertEqual(DeepLink.route(from: url), .chess(gameId: nil))
    }

    // MARK: - Unknown Path

    func testUnknownPathReturnsHome() {
        let url = URL(string: "bayitplus://nonexistent")!
        XCTAssertEqual(DeepLink.route(from: url), .home)
    }

    // MARK: - URL Query Extension

    func testURLQueryValueExtraction() {
        let url = URL(string: "bayitplus://play/id?type=movie&quality=hd")!
        XCTAssertEqual(url.queryValue(for: "type"), "movie")
        XCTAssertEqual(url.queryValue(for: "quality"), "hd")
        XCTAssertNil(url.queryValue(for: "missing"))
    }
}
