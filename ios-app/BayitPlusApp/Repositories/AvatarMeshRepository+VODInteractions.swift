import BayitNetworking
import Foundation

// MARK: - VOD Interactions

extension APIAvatarRepository {
    func fetchInteractiveMoments(
        contentId: String
    ) async throws -> [InteractiveMoment] {
        return try await client.get(
            "/api/v1/admin/interactive-moments/content/\(contentId)/moments",
            as: [InteractiveMoment].self
        )
    }

    func fetchInteractiveCharacters(
        contentId: String
    ) async throws -> [ContentCharacter] {
        return try await client.get(
            "/api/v1/vod-interactions/characters/\(contentId)",
            as: [ContentCharacter].self
        )
    }

    func startInteractionSession(
        profileId: String,
        avatarId: String,
        contentId: String,
        timestamp: Double
    ) async throws -> VODSessionResponse {
        let body: [String: Any] = [
            "profile_id": profileId,
            "avatar_id": avatarId,
            "content_id": contentId,
            "timestamp": timestamp,
        ]
        return try await client.postJSON(
            "/api/v1/vod-interactions/sessions/start",
            body: body,
            as: VODSessionResponse.self
        )
    }

    func startFreeInteractionSession(
        profileId: String,
        avatarId: String,
        contentId: String,
        characterName: String,
        currentTimestamp: Double
    ) async throws -> VODSessionResponse {
        let body: [String: Any] = [
            "profile_id": profileId,
            "avatar_id": avatarId,
            "content_id": contentId,
            "character_name": characterName,
            "current_timestamp": currentTimestamp,
        ]
        return try await client.postJSON(
            "/api/v1/vod-interactions/sessions/start-free",
            body: body,
            as: VODSessionResponse.self
        )
    }

    func sendInteractionMessage(
        sessionId: String,
        message: String
    ) async throws -> CharacterResponsePayload {
        let body: [String: String] = ["message": message]
        return try await client.post(
            "/api/v1/vod-interactions/sessions/\(sessionId)/message",
            body: body,
            as: CharacterResponsePayload.self
        )
    }

    func completeInteractionSession(
        sessionId: String
    ) async throws -> SessionStatusPayload {
        return try await client.postJSON(
            "/api/v1/vod-interactions/sessions/\(sessionId)/complete",
            body: [:],
            as: SessionStatusPayload.self
        )
    }

    // MARK: - Multi-Character Interaction (Phase 3)

    func sendMultiCharacterMessage(
        sessionId: String,
        message: String,
        addressedCharacter: String
    ) async throws -> MultiCharacterResponse {
        let body: [String: String] = [
            "message": message,
            "addressed_character": addressedCharacter,
        ]
        return try await client.post(
            "/api/v1/vod-interactions/sessions/\(sessionId)/multi-message",
            body: body,
            as: MultiCharacterResponse.self
        )
    }

    // MARK: - Pause & Ask

    func sendPauseAskMessage(
        sessionId: String,
        message: String,
        languageHint: String
    ) async throws -> PauseAskResponse {
        let body: [String: String] = [
            "message": message,
            "language_hint": languageHint,
        ]
        return try await client.post(
            "/api/v1/vod-interactions/sessions/\(sessionId)/pause-ask",
            body: body,
            as: PauseAskResponse.self
        )
    }
}
