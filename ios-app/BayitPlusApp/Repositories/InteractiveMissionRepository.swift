import BayitNetworking
import Foundation

protocol InteractiveMissionRepository: Sendable {

    func getMission(missionId: String) async throws -> InteractiveMission

    func submitAttempt(
        missionId: String, profileId: String,
        sceneNumber: Int, attempt: Int, userInput: String
    ) async throws -> AttemptResult

    func completeMission(
        missionId: String, profileId: String
    ) async throws -> MissionCompletion
}

final class APIInteractiveMissionRepository: InteractiveMissionRepository, @unchecked Sendable {

    private let client: APIClient

    init(client: APIClient) {
        self.client = client
    }

    func getMission(missionId: String) async throws -> InteractiveMission {
        return try await client.get(
            "/api/v1/interactive-missions/\(missionId)",
            as: InteractiveMission.self
        )
    }

    func submitAttempt(
        missionId: String, profileId: String,
        sceneNumber: Int, attempt: Int, userInput: String
    ) async throws -> AttemptResult {
        let request = SubmitAttemptRequest(
            profileId: profileId,
            responseTranscript: userInput,
            languageDetected: "he"
        )
        return try await client.post(
            "/api/v1/interactive-missions/\(missionId)/scenes/\(sceneNumber)/attempt",
            body: request,
            as: AttemptResult.self
        )
    }

    func completeMission(
        missionId: String, profileId: String
    ) async throws -> MissionCompletion {
        let request = CompleteMissionRequest(profileId: profileId)
        return try await client.post(
            "/api/v1/interactive-missions/\(missionId)/complete",
            body: request,
            as: MissionCompletion.self
        )
    }
}
