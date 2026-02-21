#if os(iOS)
    import AVFoundation
    import BayitCore
    import BayitNetworking
    import Foundation
    import Observation

    /// Manages voice-based interaction with movie characters via WebSocket.
    /// Delegates connection management to the centralized `WebSocketManager`.
    /// Handles audio capture (AVAudioEngine) and playback.
    @MainActor
    @Observable
    final class VoiceInteractionService {
        // MARK: - Public State

        var isConnected = false
        var isRecording = false
        var isProcessing = false
        var processingStage: String?
        var lastTranscript: String?
        var connectionError: String?

        // MARK: - Internal

        var connection: WebSocketConnection?
        var connectionId: UUID?
        var audioEngine: AVAudioEngine?
        var recordedData = Data()
        let webSocketManager: WebSocketManager
        let configuration: any EnvironmentConfiguration
        let authTokenProvider: AuthTokenProvider
        let logger = BayitLogger(category: "VoiceInteraction")
        var receiveTask: Task<Void, Never>?

        // MARK: - Init

        init(
            webSocketManager: WebSocketManager,
            configuration: any EnvironmentConfiguration,
            authTokenProvider: AuthTokenProvider
        ) {
            self.webSocketManager = webSocketManager
            self.configuration = configuration
            self.authTokenProvider = authTokenProvider
        }

        // MARK: - Connect

        func connect(sessionId: String) {
            let wsPath = "/api/v1/ws/vod-interaction/\(sessionId)"
            let wsBaseURLString = configuration.webSocketBaseURL.absoluteString
            guard let url = URL(string: "\(wsBaseURLString)\(wsPath)") else {
                connectionError = "Invalid WebSocket URL"
                return
            }

            Task { [weak self] in
                guard let self else { return }
                do {
                    guard let token = try await authTokenProvider.currentToken() else {
                        await MainActor.run {
                            self.connectionError = "No auth token available"
                            self.isConnected = false
                        }
                        return
                    }

                    let conn = try await webSocketManager.connect(to: url, authToken: token)
                    let connId = await conn.id

                    await MainActor.run {
                        self.connection = conn
                        self.connectionId = connId
                        self.isConnected = true
                        self.connectionError = nil
                    }

                    self.startReceiving(connection: conn)
                    self.logger.info("Voice WS connected to session", context: [
                        "sessionId": sessionId,
                    ])
                } catch {
                    await MainActor.run {
                        self.connectionError = error.localizedDescription
                        self.isConnected = false
                        self.logger.error("Voice WS connect failed", error: error)
                    }
                }
            }
        }

        // MARK: - Disconnect

        func disconnect() {
            receiveTask?.cancel()
            receiveTask = nil

            if let connId = connectionId {
                let manager = webSocketManager
                Task { await manager.disconnect(id: connId) }
            }

            connection = nil
            connectionId = nil
            stopRecording()
            isConnected = false
            isProcessing = false
            processingStage = nil
            logger.info("Voice WS disconnected")
        }
    }
#endif
