import BayitCore
import Foundation

/// Fetches and parses M3U playlists from remote URLs.
public enum M3UPlaylistFetcher {
    private static let logger = BayitLogger(category: "M3UPlaylistFetcher")

    /// Fetch an M3U playlist from a URL and parse it into channels.
    public static func fetch(
        url: URL,
        sourceId: String,
        session: URLSession = .shared
    ) async throws -> [BYOCChannel] {
        logger.info("Fetching M3U playlist", context: ["url": url.absoluteString])

        let (data, response) = try await session.data(from: url)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw M3UFetchError.invalidResponse
        }
        guard (200 ... 299).contains(httpResponse.statusCode) else {
            throw M3UFetchError.httpError(statusCode: httpResponse.statusCode)
        }
        guard let content = decodePlaylistData(data) else {
            throw M3UFetchError.invalidEncoding
        }
        guard content.contains("#EXTINF") || content.contains("#EXTM3U") else {
            throw M3UFetchError.notM3UFormat
        }

        let channels = M3UParser.parse(content, sourceId: sourceId)
        logger.info(
            "Parsed M3U playlist",
            context: ["channelCount": "\(channels.count)"]
        )
        return channels
    }

    private static func decodePlaylistData(_ data: Data) -> String? {
        if let utf8 = String(data: data, encoding: .utf8) {
            return utf8.hasPrefix("\u{FEFF}") ? String(utf8.dropFirst()) : utf8
        }
        if let latin1 = String(data: data, encoding: .isoLatin1) {
            return latin1
        }
        return nil
    }
}

/// Errors from M3U playlist fetching.
public enum M3UFetchError: Error, LocalizedError {
    case invalidResponse
    case httpError(statusCode: Int)
    case invalidEncoding
    case notM3UFormat

    public var errorDescription: String? {
        switch self {
        case .invalidResponse:
            return "Invalid server response"
        case let .httpError(statusCode):
            return "HTTP error \(statusCode)"
        case .invalidEncoding:
            return "Unable to decode playlist text"
        case .notM3UFormat:
            return "File is not a valid M3U playlist"
        }
    }
}
