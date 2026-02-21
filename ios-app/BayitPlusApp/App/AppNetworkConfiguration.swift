import BayitCore
import BayitNetworking
import Foundation

/// Bridges `BayitCore.EnvironmentConfiguration` → `BayitNetworking.NetworkConfiguration`.
///
/// This adapter lives in the host app target because it depends on both
/// `BayitCore` and `BayitNetworking`, which do not depend on each other.
struct AppNetworkConfiguration: NetworkConfiguration {
    private let appConfig: EnvironmentConfiguration
    private let clientVersion: String

    init(appConfig: EnvironmentConfiguration) {
        self.appConfig = appConfig
        clientVersion = Bundle.main.object(
            forInfoDictionaryKey: "CFBundleShortVersionString"
        ) as? String ?? "0.0.0"
    }

    var baseURL: URL {
        appConfig.apiBaseURL
    }

    var timeout: TimeInterval {
        appConfig.apiTimeout
    }

    var maxRetries: Int {
        appConfig.apiMaxRetries
    }

    var retryBaseDelay: TimeInterval {
        appConfig.apiRetryBaseDelay
    }

    var retryableStatusCodes: Set<Int> {
        appConfig.apiRetryableStatusCodes
    }

    var defaultHeaders: [String: String] {
        [
            "X-Client-Platform": "ios",
            "X-Client-Version": clientVersion,
        ]
    }

    // MARK: - WebSocket Configuration

    var webSocketMaxConcurrentConnections: Int {
        appConfig.webSocketMaxConcurrentConnections
    }

    var webSocketPingInterval: TimeInterval {
        appConfig.webSocketPingInterval
    }

    var webSocketMaxReconnectAttempts: Int {
        appConfig.webSocketMaxReconnectAttempts
    }

    var webSocketReconnectBaseDelay: TimeInterval {
        appConfig.webSocketReconnectBaseDelay
    }

    var webSocketInactiveGracePeriod: TimeInterval {
        appConfig.webSocketInactiveGracePeriod
    }

    var webSocketBaseURL: URL {
        appConfig.webSocketBaseURL
    }

    // MARK: - URLCache Configuration

    var urlCacheMemoryCapacity: Int {
        10 * 1024 * 1024
    }

    var urlCacheDiskCapacity: Int {
        50 * 1024 * 1024
    }
}
