import XCTest
@testable import BayitWidgetShared

final class WidgetDataStoreTests: XCTestCase {

    private var store: WidgetDataStore!
    private let testSuiteName = "tv.bayit.test.dataStore.\(UUID().uuidString)"

    override func setUp() {
        super.setUp()
        let testDefaults = SharedDefaults(suiteName: testSuiteName)
        store = WidgetDataStore(defaults: testDefaults)
    }

    override func tearDown() {
        UserDefaults(suiteName: testSuiteName)?.removePersistentDomain(
            forName: testSuiteName
        )
        store = nil
        super.tearDown()
    }

    // MARK: - Now Playing

    func testWriteReadNowPlayingRoundTrip() async {
        let data = makeNowPlaying()

        await store.writeNowPlaying(data)
        let result = await store.readNowPlaying()

        XCTAssertNotNil(result)
        XCTAssertEqual(result?.channelName, data.channelName)
        XCTAssertEqual(result?.showTitle, data.showTitle)
        XCTAssertEqual(result?.progress, data.progress)
        XCTAssertEqual(result?.isPlaying, data.isPlaying)
        XCTAssertEqual(result?.contentType, data.contentType)
        XCTAssertEqual(result?.channelID, data.channelID)
    }

    func testReadNowPlayingReturnsNilWhenEmpty() async {
        let result = await store.readNowPlaying()
        XCTAssertNil(result)
    }

    func testClearNowPlayingRemovesData() async {
        await store.writeNowPlaying(makeNowPlaying())
        XCTAssertNotNil(await store.readNowPlaying())

        await store.clearNowPlaying()
        XCTAssertNil(await store.readNowPlaying())
    }

    // MARK: - Continue Watching

    func testWriteReadContinueWatchingRoundTrip() async {
        let items = [
            makeContinueWatchingItem(id: "cw-1", title: "Episode 1"),
            makeContinueWatchingItem(id: "cw-2", title: "Episode 2"),
            makeContinueWatchingItem(id: "cw-3", title: "Episode 3"),
        ]

        await store.writeContinueWatching(items)
        let result = await store.readContinueWatching()

        XCTAssertEqual(result.count, 3)
        XCTAssertEqual(result[0].id, "cw-1")
        XCTAssertEqual(result[1].title, "Episode 2")
        XCTAssertEqual(result[2].id, "cw-3")
    }

    func testReadContinueWatchingReturnsEmptyArrayWhenNoData() async {
        let result = await store.readContinueWatching()
        XCTAssertTrue(result.isEmpty)
    }

    // MARK: - Playlists

    func testWriteReadPlaylistsRoundTrip() async {
        let items = [
            SharedPlaylistItem(
                id: "pl-1",
                name: "Shabbat Songs",
                itemCount: 12,
                thumbnailURL: URL(string: "https://example.com/thumb1.jpg")
            ),
            SharedPlaylistItem(
                id: "pl-2",
                name: "Morning Mix",
                itemCount: 8,
                thumbnailURL: nil
            ),
        ]

        await store.writePlaylists(items)
        let result = await store.readPlaylists()

        XCTAssertEqual(result.count, 2)
        XCTAssertEqual(result[0].id, "pl-1")
        XCTAssertEqual(result[0].name, "Shabbat Songs")
        XCTAssertEqual(result[0].itemCount, 12)
        XCTAssertNotNil(result[0].thumbnailURL)
        XCTAssertEqual(result[1].id, "pl-2")
        XCTAssertNil(result[1].thumbnailURL)
    }

    func testReadPlaylistsReturnsEmptyArrayWhenNoData() async {
        let result = await store.readPlaylists()
        XCTAssertTrue(result.isEmpty)
    }

    // MARK: - Test Data Builders

    private func makeNowPlaying() -> SharedNowPlayingData {
        SharedNowPlayingData(
            channelName: "Channel 12",
            showTitle: "Evening News",
            logoURL: URL(string: "https://example.com/logo.png"),
            progress: 0.45,
            isPlaying: true,
            contentType: .liveTV,
            nextShowTitle: "Late Night",
            nextShowTime: "23:00",
            channelID: "ch-12"
        )
    }

    private func makeContinueWatchingItem(
        id: String,
        title: String
    ) -> SharedContinueWatchingItem {
        SharedContinueWatchingItem(
            id: id,
            contentID: "content-\(id)",
            title: title,
            thumbnailURL: nil,
            progress: 0.5,
            durationSeconds: 3600,
            contentType: .vod
        )
    }
}
