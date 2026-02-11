import BayitCore
import BayitNetworking
import Foundation

/// Tracks playback sessions with the backend for concurrent stream management.
/// Reports session start/heartbeat/end to /api/v1/playback/session.
actor PlaybackSessionService {

    private let client: APIClient
    private let logger = BayitLogger(category: "PlaybackSession")
    private var activeSessionId: String?
    private var heartbeatTask: Task<Void, Never>?

    init(client: APIClient) {
        self.client = client
    }

    /// Start a new playback session for the given content.
    func startSession(contentId: String, contentType: String, deviceName: String) async throws -> PlaybackSessionResponse {
        let request = PlaybackSessionStartRequest(
            contentId: contentId,
            contentType: contentType,
            deviceName: deviceName
        )
        let response = try await client.post(
            "/api/v1/playback/session/start",
            body: request,
            as: PlaybackSessionResponse.self
        )
        activeSessionId = response.sessionId
        startHeartbeat()
        logger.info("Playback session started", context: [
            "sessionId": response.sessionId ?? "unknown",
            "contentId": contentId
        ])
        return response
    }

    /// End the current playback session.
    func endSession() async {
        heartbeatTask?.cancel()
        heartbeatTask = nil

        guard let sessionId = activeSessionId else { return }

        do {
            let request = PlaybackSessionEndRequest(sessionId: sessionId)
            _ = try await client.post(
                "/api/v1/playback/session/end",
                body: request,
                as: MessageResponse.self
            )
            logger.info("Playback session ended", context: ["sessionId": sessionId])
        } catch {
            logger.error("Failed to end playback session", error: error)
        }

        activeSessionId = nil
    }

    /// Send heartbeat to keep the session alive.
    private func startHeartbeat() {
        heartbeatTask?.cancel()
        heartbeatTask = Task { [weak self] in
            while !Task.isCancelled {
                try? await Task.sleep(for: .seconds(30))
                guard !Task.isCancelled else { return }
                await self?.sendHeartbeat()
            }
        }
    }

    private func sendHeartbeat() async {
        guard let sessionId = activeSessionId else { return }
        do {
            let request = PlaybackSessionHeartbeatRequest(sessionId: sessionId)
            _ = try await client.post(
                "/api/v1/playback/session/heartbeat",
                body: request,
                as: MessageResponse.self
            )
        } catch {
            logger.error("Heartbeat failed", error: error)
        }
    }
}

// MARK: - Models

struct PlaybackSessionStartRequest: Encodable, Sendable {
    let contentId: String
    let contentType: String
    let deviceName: String
}

struct PlaybackSessionEndRequest: Encodable, Sendable {
    let sessionId: String
}

struct PlaybackSessionHeartbeatRequest: Encodable, Sendable {
    let sessionId: String
}

struct PlaybackSessionResponse: Decodable, Sendable {
    let sessionId: String?
    let status: String?
    let maxStreams: Int?
    let activeStreams: Int?
    let error: String?
}
