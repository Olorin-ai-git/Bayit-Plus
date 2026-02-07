import BayitNetworking
import BayitVoice
import Foundation

/// API-backed implementation of VoiceRepository.
/// Calls POST /api/v1/voice/unified for voice intent processing.
struct APIVoiceRepository: VoiceRepository {

    private let client: APIClient

    init(client: APIClient) {
        self.client = client
    }

    func processVoice(request: VoiceRequest) async throws -> VoiceResponse {
        try await client.post(
            "/voice/unified",
            body: request,
            as: VoiceResponse.self
        )
    }
}
