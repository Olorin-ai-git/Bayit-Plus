import XCTest
@testable import BayitCast

final class CastMediaTests: XCTestCase {

    func testCastMediaCreation() {
        let streamUrl = URL(string: "https://example.com/stream.m3u8")!
        let media = CastMedia(
            contentId: "test-123",
            title: "Test Content",
            streamUrl: streamUrl
        )

        XCTAssertEqual(media.contentId, "test-123")
        XCTAssertEqual(media.title, "Test Content")
        XCTAssertEqual(media.streamUrl, streamUrl)
        XCTAssertNil(media.posterUrl)
        XCTAssertNil(media.duration)
        XCTAssertTrue(media.subtitleTracks.isEmpty)
    }

    func testCastMediaEquality() {
        let url = URL(string: "https://example.com/stream.m3u8")!
        let media1 = CastMedia(contentId: "test", title: "Title", streamUrl: url)
        let media2 = CastMedia(contentId: "test", title: "Title", streamUrl: url)

        XCTAssertEqual(media1, media2)
    }

    func testSubtitleTrack() {
        let trackUrl = URL(string: "https://example.com/en.vtt")!
        let track = SubtitleTrack(
            language: "en",
            url: trackUrl,
            name: "English"
        )

        XCTAssertEqual(track.language, "en")
        XCTAssertEqual(track.url, trackUrl)
        XCTAssertEqual(track.name, "English")
    }
}
