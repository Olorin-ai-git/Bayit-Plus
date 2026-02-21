import BayitAuth
import BayitCore
import Foundation

// MARK: - WebSocket Message Handling

extension TVQRAuthViewModel {
    func handleWebSocketMessage(
        _ message: URLSessionWebSocketTask.Message
    ) {
        let data: Data
        switch message {
        case let .string(text):
            guard let textData = text.data(using: .utf8) else { return }
            data = textData
        case let .data(binaryData):
            data = binaryData
        @unknown default:
            return
        }

        guard let decoded = try? JSONDecoder().decode(
            WebSocketMessage.self, from: data
        ) else {
            logger.warning(
                "Failed to decode WebSocket message",
                metadata: [
                    "raw": String(data: data, encoding: .utf8) ?? "binary",
                ]
            )
            return
        }

        switch decoded.type {
        case "connected":
            logger.debug(
                "Device pairing WebSocket connected",
                metadata: [
                    "session_id_prefix": String(
                        (sessionId ?? "unknown").prefix(8)
                    ),
                ]
            )

        case "companion_connected":
            wsDeliveredUpdate = true
            status = .companionConnected
            logger.info(
                "Companion device connected for pairing",
                metadata: [
                    "session_id_prefix": String(
                        (sessionId ?? "unknown").prefix(8)
                    ),
                ]
            )

        case "authenticating":
            wsDeliveredUpdate = true
            status = .authenticating
            logger.info(
                "Companion device authenticating",
                metadata: [
                    "session_id_prefix": String(
                        (sessionId ?? "unknown").prefix(8)
                    ),
                ]
            )

        case "pairing_success":
            wsDeliveredUpdate = true
            handlePairingSuccess(decoded)

        case "session_expired":
            status = .expired
            error = AuthError.sessionExpired.userFacingMessage
            logger.info(
                "Device pairing session expired",
                metadata: [
                    "session_id_prefix": String(
                        (sessionId ?? "unknown").prefix(8)
                    ),
                ]
            )
            cleanup()

        case "pairing_failed":
            status = .failed
            error = AuthError.devicePairingFailed(
                underlying: "Companion device authentication failed"
            ).userFacingMessage
            cleanup()

        case "error":
            status = .failed
            error = AuthError.devicePairingFailed(
                underlying: decoded.message ?? "Session not found"
            ).userFacingMessage
            logger.warning(
                "Device pairing error from server",
                metadata: [
                    "message": decoded.message ?? "unknown",
                    "session_id_prefix": String(
                        (sessionId ?? "unknown").prefix(8)
                    ),
                ]
            )
            cleanup()

        default:
            logger.debug(
                "Unhandled WebSocket message type",
                metadata: ["type": decoded.type]
            )
        }
    }

    func handlePairingSuccess(_ message: WebSocketMessage) {
        status = .authenticating

        guard let accessToken = message.accessToken,
              let user = message.user
        else {
            status = .failed
            error = AuthError.devicePairingFailed(
                underlying: "Missing credentials in pairing response"
            ).userFacingMessage
            return
        }

        do {
            try authManager.signInFromDevicePairing(
                accessToken: accessToken,
                refreshToken: message.refreshToken,
                user: user
            )
            status = .authenticated
            cleanup()
        } catch {
            status = .failed
            self.error = AuthError.devicePairingFailed(
                underlying: error.localizedDescription
            ).userFacingMessage
            cleanup()
        }
    }
}
