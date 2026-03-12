import BayitCore
import Foundation

/// YouTube Data API v3 client using OAuth access token.
public actor YouTubeAPIClient {
    private let accessToken: String
    private let logger = BayitLogger(category: "YouTubeAPI")
    private static let baseURL = "https://www.googleapis.com/youtube/v3"

    public init(accessToken: String) {
        self.accessToken = accessToken
    }

    /// Fetch user's YouTube subscriptions.
    public func fetchSubscriptions(
        maxResults: Int = 25,
        pageToken: String? = nil
    ) async throws -> YouTubePageResponse<YouTubeSubscription> {
        var params = "part=snippet&mine=true&maxResults=\(maxResults)"
        if let pageToken { params += "&pageToken=\(encodeParam(pageToken))" }

        let data = try await get(path: "subscriptions", query: params)
        return try parseSubscriptions(data)
    }

    /// Fetch videos from a specific channel.
    public func fetchChannelVideos(
        channelId: String,
        maxResults: Int = 25,
        pageToken: String? = nil
    ) async throws -> YouTubePageResponse<YouTubeVideo> {
        var params = "part=snippet&channelId=\(channelId)&type=video&order=date&maxResults=\(maxResults)"
        if let pageToken { params += "&pageToken=\(encodeParam(pageToken))" }

        let data = try await get(path: "search", query: params)
        return try parseSearchResults(data)
    }

    /// Search YouTube videos.
    public func search(
        query: String,
        maxResults: Int = 25,
        pageToken: String? = nil
    ) async throws -> YouTubePageResponse<YouTubeVideo> {
        let encoded = query.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? query
        var params = "part=snippet&q=\(encoded)&type=video&maxResults=\(maxResults)"
        if let pageToken { params += "&pageToken=\(encodeParam(pageToken))" }

        let data = try await get(path: "search", query: params)
        return try parseSearchResults(data)
    }

    /// Fetch user's playlists.
    public func fetchPlaylists(
        maxResults: Int = 25
    ) async throws -> YouTubePageResponse<YouTubePlaylist> {
        let params = "part=snippet,contentDetails&mine=true&maxResults=\(maxResults)"
        let data = try await get(path: "playlists", query: params)
        return try parsePlaylists(data)
    }

    /// Fetch videos from a playlist.
    public func fetchPlaylistItems(
        playlistId: String,
        maxResults: Int = 25,
        pageToken: String? = nil
    ) async throws -> YouTubePageResponse<YouTubeVideo> {
        var params = "part=snippet&playlistId=\(playlistId)&maxResults=\(maxResults)"
        if let pageToken { params += "&pageToken=\(encodeParam(pageToken))" }

        let data = try await get(path: "playlistItems", query: params)
        return try parsePlaylistItems(data)
    }

    // MARK: - Private

    private func get(path: String, query: String) async throws -> Data {
        guard let url = URL(string: "\(Self.baseURL)/\(path)?\(query)") else {
            throw YouTubeError.invalidResponse
        }

        var request = URLRequest(url: url)
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse else {
            throw YouTubeError.invalidResponse
        }

        if http.statusCode == 403 {
            throw YouTubeError.quotaExceeded
        }
        guard http.statusCode == 200 else {
            throw YouTubeError.httpError(statusCode: http.statusCode)
        }

        return data
    }

    private func encodeParam(_ value: String) -> String {
        value.addingPercentEncoding(
            withAllowedCharacters: .urlQueryAllowed
        ) ?? value
    }
}
