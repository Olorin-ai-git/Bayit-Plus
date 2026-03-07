@testable import BayitBYOC
import Testing

@Suite("M3U Parser Tests")
struct M3UParserTests {
    let sourceId = "test-source"

    @Test("Parses standard M3U playlist")
    func standardPlaylist() {
        let m3u = """
        #EXTM3U
        #EXTINF:-1 tvg-name="Channel 1" tvg-logo="https://example.com/logo1.png" group-title="News",Channel One
        https://stream.example.com/channel1.m3u8
        #EXTINF:-1 tvg-name="Channel 2" tvg-logo="https://example.com/logo2.png" group-title="Sports",Channel Two
        https://stream.example.com/channel2.m3u8
        """
        let channels = M3UParser.parse(m3u, sourceId: sourceId)
        #expect(channels.count == 2)
        #expect(channels[0].name == "Channel One")
        #expect(channels[0].group == "News")
        #expect(channels[0].logoURL?.absoluteString == "https://example.com/logo1.png")
        #expect(channels[0].streamURL.absoluteString == "https://stream.example.com/channel1.m3u8")
        #expect(channels[1].name == "Channel Two")
        #expect(channels[1].group == "Sports")
    }

    @Test("Parses playlist without logo or group")
    func minimalAttributes() {
        let m3u = """
        #EXTM3U
        #EXTINF:-1,Simple Channel
        https://stream.example.com/simple.m3u8
        """
        let channels = M3UParser.parse(m3u, sourceId: sourceId)
        #expect(channels.count == 1)
        #expect(channels[0].name == "Simple Channel")
        #expect(channels[0].logoURL == nil)
        #expect(channels[0].group == "Uncategorized")
    }

    @Test("Handles Windows line endings")
    func windowsLineEndings() {
        let m3u = "#EXTM3U\r\n#EXTINF:-1,Test\r\nhttps://stream.example.com/test.m3u8\r\n"
        let channels = M3UParser.parse(m3u, sourceId: sourceId)
        #expect(channels.count == 1)
        #expect(channels[0].name == "Test")
    }

    @Test("Skips invalid stream URLs")
    func invalidURLs() {
        let m3u = """
        #EXTM3U
        #EXTINF:-1,Valid
        https://stream.example.com/valid.m3u8
        #EXTINF:-1,Invalid
        not a url at all
        """
        let channels = M3UParser.parse(m3u, sourceId: sourceId)
        #expect(channels.count == 1)
        #expect(channels[0].name == "Valid")
    }

    @Test("Handles empty playlist")
    func emptyPlaylist() {
        let channels = M3UParser.parse("#EXTM3U\n", sourceId: sourceId)
        #expect(channels.isEmpty)
    }

    @Test("Uses tvg-name when display name is empty")
    func tvgNameFallback() {
        let m3u = """
        #EXTM3U
        #EXTINF:-1 tvg-name="From Attribute",
        https://stream.example.com/test.m3u8
        """
        let channels = M3UParser.parse(m3u, sourceId: sourceId)
        #expect(channels.count == 1)
        #expect(channels[0].name == "From Attribute")
    }

    @Test("Generates stable IDs from source and URL")
    func stableIds() {
        let m3u = """
        #EXTM3U
        #EXTINF:-1,Channel A
        https://stream.example.com/a.m3u8
        """
        let first = M3UParser.parse(m3u, sourceId: sourceId)
        let second = M3UParser.parse(m3u, sourceId: sourceId)
        #expect(first[0].id == second[0].id)
    }

    @Test("Groups channels by group-title")
    func grouping() {
        let m3u = """
        #EXTM3U
        #EXTINF:-1 group-title="Sports",ESPN
        https://stream.example.com/espn.m3u8
        #EXTINF:-1 group-title="News",CNN
        https://stream.example.com/cnn.m3u8
        #EXTINF:-1 group-title="Sports",Fox Sports
        https://stream.example.com/fox.m3u8
        """
        let channels = M3UParser.parse(m3u, sourceId: sourceId)
        let groups = M3UParser.groupChannels(channels)
        #expect(groups.count == 2)
        let sports = groups.first { $0.name == "Sports" }
        #expect(sports?.channels.count == 2)
        let news = groups.first { $0.name == "News" }
        #expect(news?.channels.count == 1)
    }

    @Test("Handles comma in channel name")
    func commaInName() {
        let m3u = """
        #EXTM3U
        #EXTINF:-1,News, Weather & Sports
        https://stream.example.com/nws.m3u8
        """
        let channels = M3UParser.parse(m3u, sourceId: sourceId)
        #expect(channels[0].name == "News, Weather & Sports")
    }

    @Test("Parses extra attributes")
    func extraAttributes() {
        let m3u = """
        #EXTM3U
        #EXTINF:-1 tvg-id="ch1" tvg-country="IL" tvg-language="Hebrew",Channel 1
        https://stream.example.com/ch1.m3u8
        """
        let channels = M3UParser.parse(m3u, sourceId: sourceId)
        #expect(channels[0].attributes["tvg-id"] == "ch1")
        #expect(channels[0].attributes["tvg-country"] == "IL")
        #expect(channels[0].attributes["tvg-language"] == "Hebrew")
    }
}
