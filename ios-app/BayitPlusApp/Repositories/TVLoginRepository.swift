import BayitAuth
import BayitNetworking
import Foundation

/// Repository protocol for TV login device-pairing API operations.
///
/// Abstracts the network calls behind a protocol for testability, extracting
/// them from `TVLoginView` where they previously used raw `URLSession` calls.
protocol TVLoginRepository: Sendable {
    /// Verify that a TV login session is valid.
    ///
    /// - Parameters:
    ///   - sessionId: The pairing session ID from the QR code.
    ///   - token: The pairing token from the QR code.
    /// - Returns: `true` if the session is valid, `false` otherwise.
    /// - Throws: `NetworkError` if the request fails.
    func verifySession(sessionId: String, token: String) async throws -> Bool

    /// Notify the backend that a companion device has connected.
    ///
    /// - Parameter sessionId: The pairing session ID.
    /// - Throws: `NetworkError` or `AuthError` if the request fails.
    func notifyConnection(sessionId: String) async throws

    /// Complete the TV login by sending the authenticated user's token.
    ///
    /// - Parameter sessionId: The pairing session ID.
    /// - Throws: `AuthError` if authentication fails, `NetworkError` for transport errors.
    func completeAuthentication(sessionId: String) async throws
}

/// Production implementation of `TVLoginRepository` using `APIClient`.
final class APITVLoginRepository: TVLoginRepository, @unchecked Sendable {
    private let client: APIClient

    init(client: APIClient) {
        self.client = client
    }

    func verifySession(sessionId: String, token: String) async throws -> Bool {
        let body = VerifySessionRequest(sessionId: sessionId, token: token)
        let response: VerifySessionResponse = try await client.post(
            "/api/v1/auth/device-pairing/verify",
            body: body,
            as: VerifySessionResponse.self
        )
        return response.valid
    }

    func notifyConnection(sessionId: String) async throws {
        let body = CompanionConnectRequest(
            sessionId: sessionId,
            deviceType: Self.currentDeviceType
        )
        _ = try await client.post(
            "/api/v1/auth/device-pairing/companion-connect",
            body: body,
            as: MessageResponse.self
        )
    }

    func completeAuthentication(sessionId: String) async throws {
        let body = CompleteAuthRequest(sessionId: sessionId)
        _ = try await client.post(
            "/api/v1/auth/device-pairing/v2/complete-token",
            body: body,
            as: MessageResponse.self
        )
    }

    private static var currentDeviceType: String {
        #if os(iOS)
            return "ios"
        #elseif os(tvOS)
            return "tvos"
        #else
            return "unknown"
        #endif
    }
}

// MARK: - Request/Response Models

struct VerifySessionRequest: Encodable, Sendable {
    let sessionId: String
    let token: String
}

struct VerifySessionResponse: Decodable, Sendable {
    let valid: Bool
    let sessionId: String
    let status: String
    let expiresAt: String
}

struct CompanionConnectRequest: Encodable, Sendable {
    let sessionId: String
    let deviceType: String
}

struct CompleteAuthRequest: Encodable, Sendable {
    let sessionId: String
}
