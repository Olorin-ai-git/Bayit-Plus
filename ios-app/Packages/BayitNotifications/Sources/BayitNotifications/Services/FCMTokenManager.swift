import BayitCore
import BayitNetworking
import FirebaseMessaging
import Foundation

#if canImport(UIKit)
import UIKit
#endif

/// Manages FCM token registration and synchronization with backend.
public actor FCMTokenManager {

    private let logger = BayitLogger(category: "FCMTokenManager")
    private let apiClient: APIClient
    private let messaging = Messaging.messaging()

    /// Current FCM token (cached)
    private var cachedToken: String?

    public init(apiClient: APIClient) {
        self.apiClient = apiClient
    }

    // MARK: - Token Management

    /// Get current FCM token.
    public func getCurrentToken() async throws -> String {
        // Return cached token if available
        if let cachedToken = cachedToken {
            return cachedToken
        }

        // Fetch fresh token from FCM
        let token = try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<String, Error>) in
            messaging.token { token, error in
                if let error = error {
                    continuation.resume(throwing: error)
                } else if let token = token {
                    continuation.resume(returning: token)
                } else {
                    continuation.resume(throwing: FCMError.noToken)
                }
            }
        }

        cachedToken = token
        return token
    }

    /// Register FCM token with backend.
    public func registerToken() async throws {
        let token = try await getCurrentToken()

        logger.info("Registering FCM token", context: ["tokenPrefix": String(token.prefix(10))])

        let deviceInfo = await Self.deviceInfo()
        let request = FCMTokenRequest(
            token: token,
            platform: "ios",
            deviceModel: deviceInfo.model,
            osVersion: deviceInfo.osVersion
        )

        do {
            let _: EmptyResponse = try await apiClient.post(
                "/notifications/register-token",
                body: request,
                as: EmptyResponse.self
            )
            logger.info("FCM token registered successfully")
        } catch {
            logger.error("Failed to register FCM token", error: error)
            throw error
        }
    }

    /// Unregister FCM token from backend (on logout).
    public func unregisterToken() async throws {
        let token: String
        if let cached = cachedToken {
            token = cached
        } else {
            token = try await getCurrentToken()
        }

        logger.info("Unregistering FCM token", context: ["tokenPrefix": String(token.prefix(10))])

        let deviceInfo = await Self.deviceInfo()
        let request = FCMTokenRequest(
            token: token,
            platform: "ios",
            deviceModel: deviceInfo.model,
            osVersion: deviceInfo.osVersion
        )

        do {
            let _: EmptyResponse = try await apiClient.post(
                "/notifications/unregister-token",
                body: request,
                as: EmptyResponse.self
            )
            logger.info("FCM token unregistered successfully")
        } catch {
            logger.error("Failed to unregister FCM token", error: error)
            throw error
        }
    }

    /// Delete FCM token locally.
    public func deleteToken() async throws {
        try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
            messaging.deleteToken { error in
                if let error = error {
                    continuation.resume(throwing: error)
                } else {
                    continuation.resume()
                }
            }
        }

        cachedToken = nil
        logger.info("FCM token deleted locally")
    }

    /// Handle token refresh (called when FCM token changes).
    public func handleTokenRefresh(_ newToken: String) async {
        logger.info("FCM token refreshed", context: ["tokenPrefix": String(newToken.prefix(10))])

        cachedToken = newToken

        // Re-register new token with backend
        do {
            try await registerToken()
        } catch {
            logger.error("Failed to register refreshed FCM token", error: error)
        }
    }

    // MARK: - Device Info

    @MainActor
    private static func deviceInfo() -> (model: String, osVersion: String) {
        #if canImport(UIKit)
        return (UIDevice.current.model, UIDevice.current.systemVersion)
        #else
        return ("unknown", "unknown")
        #endif
    }
}

// MARK: - Supporting Types

private struct FCMTokenRequest: Codable, Sendable {
    let token: String
    let platform: String
    let deviceModel: String
    let osVersion: String
}

private struct EmptyResponse: Codable, Sendable {}

public enum FCMError: Error {
    case noToken
    case registrationFailed
    case deletionFailed
}

extension FCMError: LocalizedError {
    public var errorDescription: String? {
        switch self {
        case .noToken:
            return "No FCM token available"
        case .registrationFailed:
            return "Failed to register FCM token with backend"
        case .deletionFailed:
            return "Failed to delete FCM token"
        }
    }
}
