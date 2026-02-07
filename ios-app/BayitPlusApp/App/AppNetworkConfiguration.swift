import BayitCore
import BayitNetworking
import Foundation

/// Bridges `BayitCore.EnvironmentConfiguration` → `BayitNetworking.NetworkConfiguration`.
///
/// This adapter lives in the host app target because it depends on both
/// `BayitCore` and `BayitNetworking`, which do not depend on each other.
struct AppNetworkConfiguration: NetworkConfiguration {

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
            "X-Client-Platform": "ios",
            "X-Client-Version": Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "0.0.0",
        ]
    }
}
