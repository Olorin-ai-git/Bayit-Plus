import BayitCore
import Foundation

/// Client for the Xtream Codes API.
/// Fetches live streams, VOD, and series from an Xtream Codes server.
public actor XtreamCodesClient {
    private let logger = BayitLogger(category: "XtreamCodesClient")
    private let serverURL: String
    private let username: String
    private let password: String
    private let session: URLSession

    public init(
        serverURL: String,
        username: String,
        password: String,
        session: URLSession = .shared
    ) {
        self.serverURL = serverURL.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        self.username = username
        self.password = password
        self.session = session
    }

    /// Authenticate and get account info.
    public func authenticate() async throws -> XtreamAccountInfo {
        let data = try await request(action: nil)
        let json = try parseJSON(data)

        guard let userInfo = json["user_info"] as? [String: Any] else {
            throw XtreamError.invalidCredentials
        }
        let status = userInfo["status"] as? String ?? ""
        if status.lowercased() != "active" {
            if status.lowercased() == "expired" {
                throw XtreamError.accountExpired
            }
            throw XtreamError.invalidCredentials
        }
        var expDate: Date?
        if let expStr = userInfo["exp_date"] as? String,
           let timestamp = TimeInterval(expStr)
        {
            expDate = Date(timeIntervalSince1970: timestamp)
        }
        return XtreamAccountInfo(
            username: userInfo["username"] as? String ?? username,
            status: status,
            expirationDate: expDate,
            maxConnections: Int(userInfo["max_connections"] as? String ?? "1") ?? 1,
            activeConnections: Int(userInfo["active_cons"] as? String ?? "0") ?? 0,
            serverURL: serverURL
        )
    }

    /// Fetch live stream categories.
    public func fetchLiveCategories() async throws -> [XtreamCategory] {
        let data = try await request(action: "get_live_categories")
        return try parseCategories(data)
    }

    /// Fetch all live streams.
    public func fetchLiveStreams() async throws -> [XtreamLiveStream] {
        let data = try await request(action: "get_live_streams")
        let array = try parseArray(data)
        return array.compactMap { item -> XtreamLiveStream? in
            guard let streamId = intValue(item["stream_id"]),
                  let name = item["name"] as? String
            else { return nil }
            return XtreamLiveStream(
                streamId: streamId,
                name: name,
                streamIcon: item["stream_icon"] as? String,
                epgChannelId: item["epg_channel_id"] as? String,
                categoryId: stringValue(item["category_id"]) ?? "",
                customSid: item["custom_sid"] as? String
            )
        }
    }

    /// Fetch VOD categories.
    public func fetchVODCategories() async throws -> [XtreamCategory] {
        let data = try await request(action: "get_vod_categories")
        return try parseCategories(data)
    }

    /// Fetch all VOD items.
    public func fetchVODStreams() async throws -> [XtreamVODItem] {
        let data = try await request(action: "get_vod_streams")
        let array = try parseArray(data)
        return array.compactMap { item -> XtreamVODItem? in
            guard let streamId = intValue(item["stream_id"]),
                  let name = item["name"] as? String
            else { return nil }
            return XtreamVODItem(
                streamId: streamId,
                name: name,
                streamIcon: item["stream_icon"] as? String,
                rating: item["rating"] as? String,
                year: stringValue(item["year"]),
                categoryId: stringValue(item["category_id"]) ?? "",
                containerExtension: item["container_extension"] as? String ?? "mp4"
            )
        }
    }

    /// Fetch all series.
    public func fetchSeries() async throws -> [XtreamSeries] {
        let data = try await request(action: "get_series")
        let array = try parseArray(data)
        return array.compactMap { item -> XtreamSeries? in
            guard let seriesId = intValue(item["series_id"]),
                  let name = item["name"] as? String
            else { return nil }
            return XtreamSeries(
                seriesId: seriesId,
                name: name,
                cover: item["cover"] as? String,
                plot: item["plot"] as? String,
                year: stringValue(item["year"]),
                genre: item["genre"] as? String,
                categoryId: stringValue(item["category_id"]) ?? ""
            )
        }
    }

    // MARK: - Stream URL Construction

    /// Build live stream URL (client-side only).
    public func liveStreamURL(streamId: Int) -> URL? {
        URL(string: "\(serverURL)/live/\(username)/\(password)/\(streamId).m3u8")
    }

    /// Build VOD stream URL (client-side only).
    public func vodStreamURL(streamId: Int, ext: String) -> URL? {
        URL(string: "\(serverURL)/movie/\(username)/\(password)/\(streamId).\(ext)")
    }

    /// Build series episode stream URL (client-side only).
    public func seriesStreamURL(streamId: Int, ext: String) -> URL? {
        URL(string: "\(serverURL)/series/\(username)/\(password)/\(streamId).\(ext)")
    }

    // MARK: - Private

    private func request(action: String?) async throws -> Data {
        var components = URLComponents(
            string: "\(serverURL)/player_api.php"
        )!
        var queryItems = [
            URLQueryItem(name: "username", value: username),
            URLQueryItem(name: "password", value: password),
        ]
        if let action {
            queryItems.append(URLQueryItem(name: "action", value: action))
        }
        components.queryItems = queryItems

        var urlRequest = URLRequest(url: components.url!)
        urlRequest.timeoutInterval = 30

        do {
            let (data, response) = try await session.data(for: urlRequest)
            guard let http = response as? HTTPURLResponse else {
                throw XtreamError.invalidResponse
            }
            guard (200 ... 299).contains(http.statusCode) else {
                throw XtreamError.httpError(statusCode: http.statusCode)
            }
            return data
        } catch let error as XtreamError {
            throw error
        } catch {
            throw XtreamError.networkError(error)
        }
    }

    private func parseJSON(_ data: Data) throws -> [String: Any] {
        guard let json = try JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            throw XtreamError.invalidResponse
        }
        return json
    }

    private func parseArray(_ data: Data) throws -> [[String: Any]] {
        guard let arr = try JSONSerialization.jsonObject(with: data) as? [[String: Any]] else {
            throw XtreamError.invalidResponse
        }
        return arr
    }

    private func parseCategories(_ data: Data) throws -> [XtreamCategory] {
        let array = try parseArray(data)
        return array.compactMap { item -> XtreamCategory? in
            guard let name = item["category_name"] as? String else { return nil }
            let id = stringValue(item["category_id"]) ?? ""
            return XtreamCategory(categoryId: id, categoryName: name)
        }
    }

    private func intValue(_ value: Any?) -> Int? {
        if let i = value as? Int { return i }
        if let s = value as? String { return Int(s) }
        return nil
    }

    private func stringValue(_ value: Any?) -> String? {
        if let s = value as? String { return s }
        if let i = value as? Int { return String(i) }
        return nil
    }
}
