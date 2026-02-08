import BayitNetworking
import Foundation

/// Repository protocol for live dubbing availability API operations.
protocol LiveDubbingRepository: Sendable {
    func checkAvailability(channelId: String) async throws -> DubbingAvailability
}

/// Production implementation of `LiveDubbingRepository` using `APIClient`.
final class APILiveDubbingRepository: LiveDubbingRepository, @unchecked Sendable {

    private let client: APIClient

    init(client: APIClient) {
        self.client = client
    }

    func checkAvailability(channelId: String) async throws -> DubbingAvailability {
        return try await client.get(
            "/api/v1/live-dubbing/availability/\(channelId)",
            as: DubbingAvailability.self
        )
    }
}
