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

    // MARK: - Resume Deep Link

    func testResumeIncludesResumeQueryParam() {
        let url = WidgetDeepLinks.resume(id: "ep-789", type: .vod)
        let components = URLComponents(url: url, resolvingAgainstBaseURL: false)
        let resumeParam = components?.queryItems?.first(where: { $0.name == "resume" })
        XCTAssertEqual(
            resumeParam?.value,
            "true",
            "resume URL should include resume=true query parameter"
        )
    }

    func testResumeIncludesContentIDInPath() {
        let url = WidgetDeepLinks.resume(id: "movie-456", type: .vod)
        XCTAssertTrue(
            url.path.contains("movie-456"),
            "resume URL path should contain the content ID, got: \(url.path)"
        )
    }

    func testResumeUsesCorrectScheme() {
        let url = WidgetDeepLinks.resume(id: "abc", type: .podcast)
        XCTAssertEqual(url.scheme, "bayitplus")
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
