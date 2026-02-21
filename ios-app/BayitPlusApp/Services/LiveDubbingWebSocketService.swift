import BayitCore
import BayitNetworking
import Foundation
import Observation

/// WebSocket service for real-time live dubbing audio and translation streams.
/// Delegates connection management to the centralized `WebSocketManager`.
@Observable
final class LiveDubbingWebSocketService: @unchecked Sendable {
    private(set) var isConnected = false
    private(set) var latency: DubbingLatencyMessage?
    private(set) var currentAudio: DubbingAudioMessage?
    private(set) var connectionInfo: DubbingConnectionMessage?
    private(set) var error: String?

    private var connection: WebSocketConnection?
    private var connectionId: UUID?
    private var receiveTask: Task<Void, Never>?
    private let webSocketManager: WebSocketManager
    private let configuration: any EnvironmentConfiguration
    private let authTokenProvider: AuthTokenProvider
    private let logger = BayitLogger(category: "LiveDubbingWebSocket")

    private static var platformIdentifier: String {
        #if os(tvOS)
            return "tvos"
        #else
            return "ios"
        #endif
    }

    init(
        webSocketManager: WebSocketManager,
        configuration: any EnvironmentConfiguration,
        authTokenProvider: AuthTokenProvider
    ) {
        self.webSocketManager = webSocketManager
        self.configuration = configuration
        self.authTokenProvider = authTokenProvider
    }

    @MainActor
    func connect(channelId: String, targetLanguage: String, voiceId: String?) {
        let wsURL = configuration.webSocketBaseURL
            .appendingPathComponent("live-dubbing/stream")
        var urlComponents = URLComponents(url: wsURL, resolvingAgainstBaseURL: false)
        var queryItems = [
            URLQueryItem(name: "channel_id", value: channelId),
            URLQueryItem(name: "target_language", value: targetLanguage),
            URLQueryItem(name: "platform", value: Self.platformIdentifier),
        ]
        if let voiceId {
            queryItems.append(URLQueryItem(name: "voice_id", value: voiceId))
        }
        urlComponents?.queryItems = queryItems

        guard let url = urlComponents?.url else {
            error = "Failed to construct WebSocket URL"
            logger.error("Invalid WebSocket URL construction", context: [
                "channelId": channelId,
                "targetLanguage": targetLanguage,
            ])
            return
        }

        Task { [weak self] in
            guard let self else { return }
            do {
                guard let token = try await authTokenProvider.currentToken() else {
                    await MainActor.run {
                        self.error = "No auth token available"
                        self.isConnected = false
                    }
                    return
                }

                let conn = try await webSocketManager.connect(to: url, authToken: token)
                let connId = await conn.id

                await MainActor.run {
                    self.connection = conn
                    self.connectionId = connId
                }

                self.startReceiving(connection: conn)

                self.logger.info("WebSocket connection initiated", context: [
                    "channelId": channelId,
                    "targetLanguage": targetLanguage,
                    "voiceId": voiceId ?? "default",
                ])
            } catch {
                await MainActor.run {
                    self.error = error.localizedDescription
                    self.isConnected = false
                    self.logger.error("WebSocket connect failed", error: error)
                }
            }
        }
    }

    @MainActor
    func disconnect() {
        receiveTask?.cancel()
        receiveTask = nil

        if let connId = connectionId {
            let manager = webSocketManager
            Task { await manager.disconnect(id: connId) }
        }

        connection = nil
        connectionId = nil
        isConnected = false
        connectionInfo = nil
        logger.info("WebSocket disconnected")
    }

    @MainActor
    func sendSyncStatus(currentVideoTimeMs: Int) {
        guard isConnected, let conn = connection else { return }

        let message = DubbingSyncStatusMessage(currentVideoTimeMs: currentVideoTimeMs)
        guard let data = try? JSONEncoder().encode(message),
              let jsonString = String(data: data, encoding: .utf8)
        else {
            return
        }

        Task {
            do {
                try await conn.send(message: jsonString)
            } catch {
                await MainActor.run {
                    self.logger.error("Failed to send sync status", error: error)
                }
            }
        }
    }

    private func startReceiving(connection: WebSocketConnection) {
        receiveTask = Task { [weak self] in
            let stream = await connection.receive()
            for await text in stream {
                guard !Task.isCancelled else { break }
                await self?.handleTextMessage(text)
            }

            await MainActor.run {
                guard !Task.isCancelled else { return }
                self?.isConnected = false
            }
        }
    }

    @MainActor
    private func handleTextMessage(_ text: String) {
        guard let data = text.data(using: .utf8) else { return }
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase

        if let conn = try? decoder.decode(DubbingConnectionMessage.self, from: data) {
            connectionInfo = conn
            isConnected = true
            error = nil
            logger.info("Connection established", context: [
                "sessionId": conn.sessionId ?? "unknown",
                "syncDelayMs": String(conn.syncDelayMs ?? 0),
            ])
        } else if let audio = try? decoder.decode(DubbingAudioMessage.self, from: data) {
            currentAudio = audio
        } else if let lat = try? decoder.decode(DubbingLatencyMessage.self, from: data) {
            latency = lat
        } else if text.contains("\"error\"") {
            error = "Server error received"
            isConnected = false
            logger.error("Server error message", context: ["message": text])
        }
    }
}
