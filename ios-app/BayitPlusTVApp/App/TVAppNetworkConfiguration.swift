import BayitCore
import BayitNetworking
import Foundation

/// Bridges `BayitCore.EnvironmentConfiguration` to `BayitNetworking.NetworkConfiguration`
/// for the tvOS app target.
struct TVAppNetworkConfiguration: NetworkConfiguration {

    private let appConfig: EnvironmentConfiguration

    init(appConfig: EnvironmentConfiguration) {
        self.appConfig = appConfig
    }

    var baseURL: URL { appConfig.apiBaseURL }
    var timeout: TimeInterval { appConfig.apiTimeout }
    var maxRetries: Int { appConfig.apiMaxRetries }
    var retryBaseDelay: TimeInterval { appConfig.apiRetryBaseDelay }
    var retryableStatusCodes: Set<Int> { appConfig.apiRetryableStatusCodes }

    var defaultHeaders: [String: String] {
        [
            "X-Client-Platform": "tvos",
            "X-Client-Version": Bundle.main.object(
                forInfoDictionaryKey: "CFBundleShortVersionString"
            ) as? String ?? "0.0.0",
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
}
