import BayitNetworking
import Foundation

// MARK: - Shared Interaction (Phase 3)

extension APIAvatarRepository {
    func startSharedInteraction(
        partyId: String,
        contentId: String,
        momentTimestamp: Double,
        characterName: String,
        profileId: String,
        avatarId: String,
        displayName: String
    ) async throws -> VODSessionResponse {
        let body: [String: Any] = [
            "content_id": contentId,
            "moment_timestamp": momentTimestamp,
            "character_name": characterName,
            "profile_id": profileId,
            "avatar_id": avatarId,
            "display_name": displayName,
        ]
        return try await client.postJSON(
            "/api/v1/parties/\(partyId)/interaction/start",
            body: body,
            as: VODSessionResponse.self
        )
    }

    func sendSharedMessage(
        partyId: String,
        sessionId: String,
        message: String,
        addressedCharacter: String?
    ) async throws -> MultiCharacterResponse {
        var body: [String: String] = ["message": message]
        if let addressed = addressedCharacter {
            body["addressed_character"] = addressed
        }
        return try await client.post(
            "/api/v1/parties/\(partyId)/interaction/\(sessionId)/message",
            body: body,
            as: MultiCharacterResponse.self
        )
    }

    func endSharedInteraction(
        partyId: String,
        sessionId: String
    ) async throws -> SessionStatusPayload {
        return try await client.postJSON(
            "/api/v1/parties/\(partyId)/interaction/\(sessionId)/end",
            body: [:],
            as: SessionStatusPayload.self
        )
    }

    func getSharedInteractionState(
        partyId: String,
        sessionId: String
    ) async throws -> SharedSessionState {
        return try await client.get(
            "/api/v1/parties/\(partyId)/interaction/\(sessionId)",
            as: SharedSessionState.self
        )
    }
}
