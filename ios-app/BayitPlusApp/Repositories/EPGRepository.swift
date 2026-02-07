import BayitNetworking
import Foundation

/// Repository protocol for Electronic Program Guide (EPG) API operations.
protocol EPGRepository: Sendable {

    /// Fetch the full EPG for a given date.
    func fetchEPG(date: String?) async throws -> EPGResponse

    /// Fetch schedule for a specific channel.
    func fetchChannelSchedule(channelId: String, date: String?) async throws -> EPGScheduleResponse

    /// Fetch current and next program for a channel.
    func fetchCurrentProgram(channelId: String) async throws -> EPGCurrentResponse

    /// Search EPG programs by query.
    func searchPrograms(query: String, date: String?) async throws -> EPGSearchResponse

    /// Fetch catch-up stream for a past program.
    func fetchCatchUp(programId: String) async throws -> EPGCatchUpResponse
}

/// Production implementation of `EPGRepository` using `APIClient`.
final class APIEPGRepository: EPGRepository, @unchecked Sendable {

    private let client: APIClient

    init(client: APIClient) {
        self.client = client
    }

    func fetchEPG(date: String?) async throws -> EPGResponse {
        var queryItems: [URLQueryItem] = []
        if let date {
            queryItems.append(URLQueryItem(name: "date", value: date))
        }
        return try await client.get(
            "/api/v1/epg",
            queryItems: queryItems,
            as: EPGResponse.self
        )
    }

    func fetchChannelSchedule(channelId: String, date: String?) async throws -> EPGScheduleResponse {
        var queryItems: [URLQueryItem] = []
        if let date {
            queryItems.append(URLQueryItem(name: "date", value: date))
        }
        return try await client.get(
            "/api/v1/epg/schedule/\(channelId)",
            queryItems: queryItems,
            as: EPGScheduleResponse.self
        )
    }

    func fetchCurrentProgram(channelId: String) async throws -> EPGCurrentResponse {
        return try await client.get(
            "/api/v1/epg/current/\(channelId)",
            as: EPGCurrentResponse.self
        )
    }

    func searchPrograms(query: String, date: String?) async throws -> EPGSearchResponse {
        var queryItems = [
            URLQueryItem(name: "query", value: query)
        ]
        if let date {
            queryItems.append(URLQueryItem(name: "date", value: date))
        }
        return try await client.get(
            "/api/v1/epg/search",
            queryItems: queryItems,
            as: EPGSearchResponse.self
        )
    }

    func fetchCatchUp(programId: String) async throws -> EPGCatchUpResponse {
        return try await client.get(
            "/api/v1/epg/catchup/\(programId)",
            as: EPGCatchUpResponse.self
        )
    }
}
