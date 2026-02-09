import XCTest
@testable import BayitWidgetShared

final class WidgetDeepLinksTests: XCTestCase {

    // MARK: - Scheme

    func testAllLinksUseBayitplusScheme() {
        let urls: [URL] = [
            WidgetDeepLinks.liveTV,
            WidgetDeepLinks.radio,
            WidgetDeepLinks.podcasts,
            WidgetDeepLinks.audiobooks,
            WidgetDeepLinks.search,
            WidgetDeepLinks.trending,
            WidgetDeepLinks.shabbatMode,
            WidgetDeepLinks.home,
            WidgetDeepLinks.login,
        ]
        for url in urls {
            XCTAssertEqual(url.scheme, "bayitplus", "URL \(url) should use bayitplus scheme")
        }
    }

    // MARK: - Navigation Deep Links

    func testLiveTVPathContainsLive() {
        let url = WidgetDeepLinks.liveTV
        XCTAssertTrue(
            url.path.contains("live"),
            "liveTV path should contain 'live', got: \(url.path)"
        )
    }

    func testRadioPathContainsRadio() {
        let url = WidgetDeepLinks.radio
        XCTAssertTrue(
            url.path.contains("radio"),
            "radio path should contain 'radio', got: \(url.path)"
        )
    }

    func testPodcastsPathContainsPodcasts() {
        let url = WidgetDeepLinks.podcasts
        XCTAssertTrue(
            url.path.contains("podcasts"),
            "podcasts path should contain 'podcasts', got: \(url.path)"
        )
    }

    func testAudiobooksPathContainsAudiobooks() {
        let url = WidgetDeepLinks.audiobooks
        XCTAssertTrue(
            url.path.contains("audiobooks"),
            "audiobooks path should contain 'audiobooks', got: \(url.path)"
        )
    }

    func testSearchPathContainsSearch() {
        let url = WidgetDeepLinks.search
        XCTAssertTrue(
            url.path.contains("search"),
            "search path should contain 'search', got: \(url.path)"
        )
    }

    func testShabbatModePathContainsShabbatMode() {
        let url = WidgetDeepLinks.shabbatMode
        XCTAssertTrue(
            url.path.contains("shabbatMode"),
            "shabbatMode path should contain 'shabbatMode', got: \(url.path)"
        )
    }

    func testTrendingPathContainsTrending() {
        let url = WidgetDeepLinks.trending
        XCTAssertTrue(
            url.path.contains("trending"),
            "trending path should contain 'trending', got: \(url.path)"
        )
    }

    // MARK: - Content Deep Link

    func testContentIncludesIDInPath() {
        let url = WidgetDeepLinks.content(id: "movie-123", type: .vod)
        XCTAssertTrue(
            url.path.contains("movie-123"),
            "content URL path should contain the content ID, got: \(url.path)"
        )
    }

    func testContentIncludesTypeInQuery() {
        let url = WidgetDeepLinks.content(id: "ep-456", type: .podcast)
        let components = URLComponents(url: url, resolvingAgainstBaseURL: false)
        let typeParam = components?.queryItems?.first(where: { $0.name == "type" })
        XCTAssertEqual(
            typeParam?.value,
            SharedContentType.podcast.rawValue,
            "content URL should include type query parameter"
        )
    }

    func testContentUsesCorrectScheme() {
        let url = WidgetDeepLinks.content(id: "abc", type: .liveTV)
        XCTAssertEqual(url.scheme, "bayitplus")
    }

    // MARK: - Playlist Deep Link

    func testPlaylistIncludesIDInPath() {
        let url = WidgetDeepLinks.playlist(id: "playlist-789")
        XCTAssertTrue(
            url.path.contains("playlist-789"),
            "playlist URL path should contain the playlist ID, got: \(url.path)"
        )
    }

    func testPlaylistUsesCorrectScheme() {
        let url = WidgetDeepLinks.playlist(id: "pl-1")
        XCTAssertEqual(url.scheme, "bayitplus")
    }
}
