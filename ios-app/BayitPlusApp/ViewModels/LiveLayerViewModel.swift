import BayitLocalization
import BayitNetworking
import Foundation
import SwiftUI

@Observable
class LiveLayerViewModel {
    var activeTrigger: LiveLayerTrigger?
    var lipsyncWeights: [String: Float] = [:]
    var isConnected = false
    var currentTimestamp: Double = 0
    var error: String?

    private var wsConnection: WebSocketConnection?
    private var receiveTask: Task<Void, Never>?
    private var webSocketManager: WebSocketManager?

    @MainActor
    func connect(
        contentId: String,
        manager: WebSocketManager,
        authToken: String
    ) async {
        webSocketManager = manager

        guard let wsURL = buildWebSocketURL(contentId: contentId) else {
            error = LocalizationManager.shared.t("zehAni.liveLayer.errors.invalidURL")
            return
        }

        do {
            let conn = try await manager.connect(to: wsURL, authToken: authToken)
            wsConnection = conn
            isConnected = true
            startReceiving(connection: conn)
        } catch {
            self.error = error.localizedDescription
        }
    }

    func disconnect() {
        receiveTask?.cancel()
        receiveTask = nil
        if let conn = wsConnection {
            Task { await conn.disconnect() }
        }
        wsConnection = nil
        isConnected = false
    }

    func sendTimestampUpdate(seconds: Double) async {
        currentTimestamp = seconds
        let payload: [String: Any] = [
            "type": "timestamp_update",
            "current_time": seconds
        ]

        do {
            if let jsonData = try? JSONSerialization.data(withJSONObject: payload),
               let jsonString = String(data: jsonData, encoding: .utf8) {
                try await wsConnection?.send(message: jsonString)
            }
        } catch {
            self.error = error.localizedDescription
        }
    }

    func sendTriggerResponse(triggerId: String, audioBase64: String) async {
        let payload: [String: Any] = [
            "type": "trigger_response",
            "trigger_id": triggerId,
            "audio": audioBase64
        ]

        do {
            if let jsonData = try? JSONSerialization.data(withJSONObject: payload),
               let jsonString = String(data: jsonData, encoding: .utf8) {
                try await wsConnection?.send(message: jsonString)
            }
        } catch {
            self.error = error.localizedDescription
        }
    }

    private func startReceiving(connection: WebSocketConnection) {
        receiveTask = Task { [weak self] in
            let stream = await connection.receive()
            for await text in stream {
                await self?.handleWSMessage(text)
            }
            await MainActor.run { self?.isConnected = false }
        }
    }

    @MainActor
    private func handleWSMessage(_ text: String) {
        guard let data = text.data(using: .utf8) else { return }
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase

        guard let message = try? decoder.decode(LiveLayerWSMessage.self, from: data) else {
            return
        }

        switch message.type {
        case .authenticated:
            break
        case .triggerUpcoming:
            if let trigger = message.trigger {
                activeTrigger = trigger
            }
        case .triggerResult:
            if let success = message.success, success {
                activeTrigger = nil
            }
        case .lipsyncWeights:
            if let weights = message.weights {
                lipsyncWeights = weights
            }
        case .heartbeatAck:
            break
        case .error:
            error = message.message
        }
    }

    private func buildWebSocketURL(contentId: String) -> URL? {
        guard let wsManager = webSocketManager else { return nil }
        let baseURL = wsManager.configuration.baseURL

        var components = URLComponents(url: baseURL, resolvingAgainstBaseURL: false)
        components?.scheme = baseURL.scheme == "https" ? "wss" : "ws"
        components?.path = "/ws/live-layer/\(contentId)"
        return components?.url
    }
}

struct LiveLayerWSMessage: Codable {
    let type: MessageType
    let trigger: LiveLayerTrigger?
    let success: Bool?
    let weights: [String: Float]?
    let message: String?

    enum MessageType: String, Codable {
        case authenticated
        case triggerUpcoming = "trigger_upcoming"
        case triggerResult = "trigger_result"
        case lipsyncWeights = "lipsync_weights"
        case heartbeatAck = "heartbeat_ack"
        case error
    }
}

struct LiveLayerTrigger: Codable, Identifiable {
    let id: String
    let targetWordHe: String
    let promptText: String
    let triggerType: String
    let timestampSec: Double

    enum CodingKeys: String, CodingKey {
        case id = "trigger_id"
        case targetWordHe = "target_word_he"
        case promptText = "prompt_text"
        case triggerType = "trigger_type"
        case timestampSec = "timestamp_sec"
    }
}
