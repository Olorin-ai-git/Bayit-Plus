import BayitNetworking
import Foundation

// MARK: - WebSocket & Recording Helpers

extension V2VPracticeViewModel {
    func startReceiving(connection: WebSocketConnection) {
        receiveTask = Task { [weak self] in
            let stream = await connection.receive()
            for await text in stream {
                await self?.handleWSMessage(text)
            }
            await MainActor.run { [weak self] in
                self?.isConnected = false
            }
        }
    }

    @MainActor
    func handleWSMessage(_ text: String) {
        guard let data = text.data(using: .utf8),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let type = json["type"] as? String
        else {
            return
        }

        switch type {
        case "authenticated":
            break
        case "v2v_result":
            handleV2VResult(json)
        case "session_completed":
            break
        case "heartbeat_ack":
            break
        case "error":
            error = json["message"] as? String
            if practiceState == .transforming {
                practiceState = .idle
            }
        default:
            break
        }
    }

    func buildWebSocketURL(avatarId: String) async -> URL? {
        guard let wsManager = webSocketManager else { return nil }
        let baseURL = await wsManager.configuration.baseURL

        var components = URLComponents(url: baseURL, resolvingAgainstBaseURL: false)
        components?.scheme = baseURL.scheme == "https" ? "wss" : "ws"
        components?.path = "/ws/v2v/\(avatarId)"
        return components?.url
    }
}
