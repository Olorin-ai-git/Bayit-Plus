import BayitCore
import BayitLocalization
import BayitNetworking
import Foundation
import Observation

@Observable
final class LiveSubtitlesWebSocketService: @unchecked Sendable {
    private(set) var isConnected = false
    private(set) var currentCue: LiveSubtitleCueData?
    private(set) var connectionInfo: LiveSubtitleConnectionMessage?
    private(set) var error: String?
    private(set) var isQuotaExceeded = false

    private var connection: WebSocketConnection?
    private var connectionId: UUID?
    private var receiveTask: Task<Void, Never>?
    private let webSocketManager: WebSocketManager
    private let configuration: any EnvironmentConfiguration
    private let authTokenProvider: AuthTokenProvider
    private let localization: LocalizationManager
    private let logger = BayitLogger(category: "LiveSubtitlesWebSocket")

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
        authTokenProvider: AuthTokenProvider,
        localization: LocalizationManager
    ) {
        self.webSocketManager = webSocketManager
        self.configuration = configuration
        self.authTokenProvider = authTokenProvider
        self.localization = localization
    }

    @MainActor
    func connect(
        channelId: String,
        targetLanguage: String,
        sourceLang: String,
        streamUrl: String? = nil
    ) {
        var wsURL = configuration.webSocketBaseURL
        for component in configuration.apiBaseURL.pathComponents where component != "/" {
            wsURL = wsURL.appendingPathComponent(component)
        }
        wsURL = wsURL
            .appendingPathComponent("ws")
            .appendingPathComponent("live")
            .appendingPathComponent(channelId)
            .appendingPathComponent("subtitles")

        var urlComponents = URLComponents(url: wsURL, resolvingAgainstBaseURL: false)
        var queryItems = [
            URLQueryItem(name: "source_lang", value: sourceLang),
            URLQueryItem(name: "target_lang", value: targetLanguage),
            URLQueryItem(name: "audio_source", value: "server"),
            URLQueryItem(name: "platform", value: Self.platformIdentifier),
        ]
        if let streamUrl {
            queryItems.append(URLQueryItem(name: "stream_url", value: streamUrl))
        }
        urlComponents?.queryItems = queryItems

        guard let url = urlComponents?.url else {
            error = localization.t("errors.websocketUrlFailed")
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
                        self.error = self.localization.t("errors.noAuthToken")
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

                self.logger.info("Subtitle WebSocket connection initiated", context: [
                    "channelId": channelId,
                    "targetLanguage": targetLanguage,
                    "sourceLang": sourceLang,
                    "audioSource": "server",
                ])
            } catch {
                await MainActor.run {
                    self.error = error.localizedDescription
                    self.isConnected = false
                    self.logger.error("Subtitle WebSocket connect failed", error: error)
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
        currentCue = nil
        isQuotaExceeded = false
        logger.info("Subtitle WebSocket disconnected")
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

        guard let typeMsg = try? decoder.decode(LiveSubtitleTypeMessage.self, from: data) else {
            return
        }

        switch typeMsg.type {
        case "connected":
            if let conn = try? decoder.decode(LiveSubtitleConnectionMessage.self, from: data) {
                connectionInfo = conn
                isConnected = true
                error = nil
                logger.info("Subtitle connection established", context: [
                    "channelId": conn.channelId ?? "unknown",
                ])
            }

        case "final_subtitle", "partial_subtitle":
            if let cueMsg = try? decoder.decode(LiveSubtitleCueMessage.self, from: data),
               let cue = cueMsg.data
            {
                currentCue = cue
            }

        case "ping":
            break

        case "quota_exceeded":
            isQuotaExceeded = true
            error = typeMsg.message ?? "Usage limit reached"
            isConnected = false
            logger.warning("Subtitle quota exceeded")

        case "error":
            error = typeMsg.message ?? "Server error"
            if typeMsg.recoverable != true {
                isConnected = false
            }
            logger.error("Server error", context: [
                "message": typeMsg.message ?? "unknown",
            ])

        default:
            break
        }
    }
}
