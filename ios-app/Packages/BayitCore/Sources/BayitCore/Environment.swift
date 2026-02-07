import Foundation

/// App environment configuration
public enum AppEnvironment: String, Sendable {
    case development
    case staging
    case production

    public static var current: AppEnvironment {
        guard let rawValue = Bundle.main.infoDictionary?["APP_ENVIRONMENT"] as? String,
              let environment = AppEnvironment(rawValue: rawValue) else {
            #if DEBUG
            return .development
            #else
            return .production
            #endif
        }
        return environment
    }

    public var isDevelopment: Bool { self == .development }
    public var isStaging: Bool { self == .staging }
    public var isProduction: Bool { self == .production }
}

/// Protocol for environment-specific configuration values
public protocol EnvironmentConfiguration: Sendable {
    var apiBaseURL: URL { get }
    var apiTimeout: TimeInterval { get }
    var apiMaxRetries: Int { get }
    var apiRetryBaseDelay: TimeInterval { get }
    var apiRetryableStatusCodes: Set<Int> { get }
    var webSocketBaseURL: URL { get }
    var environment: AppEnvironment { get }
}

/// Resolves configuration from Info.plist and environment
public struct AppConfiguration: EnvironmentConfiguration, Sendable {
    public let apiBaseURL: URL
    public let apiTimeout: TimeInterval
    public let apiMaxRetries: Int
    public let apiRetryBaseDelay: TimeInterval
    public let apiRetryableStatusCodes: Set<Int>
    public let webSocketBaseURL: URL
    public let environment: AppEnvironment

    public init() {
        let env = AppEnvironment.current
        let info = Bundle.main.infoDictionary ?? [:]

        let apiURLString = info["API_BASE_URL"] as? String
            ?? ProcessInfo.processInfo.environment["API_BASE_URL"]
            ?? Self.defaultAPIBaseURL(for: env)

        guard let apiURL = URL(string: apiURLString) else {
            fatalError("Invalid API_BASE_URL configuration: \(apiURLString)")
        }

        let wsURLString = info["WEBSOCKET_BASE_URL"] as? String
            ?? ProcessInfo.processInfo.environment["WEBSOCKET_BASE_URL"]
            ?? Self.defaultWebSocketURL(for: env)

        guard let wsURL = URL(string: wsURLString) else {
            fatalError("Invalid WEBSOCKET_BASE_URL configuration: \(wsURLString)")
        }

        let timeoutValue = info["API_TIMEOUT"] as? String
            ?? ProcessInfo.processInfo.environment["API_TIMEOUT"]

        let maxRetriesValue = info["API_MAX_RETRIES"] as? String
            ?? ProcessInfo.processInfo.environment["API_MAX_RETRIES"]

        let retryDelayValue = info["API_RETRY_BASE_DELAY"] as? String
            ?? ProcessInfo.processInfo.environment["API_RETRY_BASE_DELAY"]

        self.environment = env
        self.apiBaseURL = apiURL
        self.apiTimeout = TimeInterval(timeoutValue ?? "") ?? 30.0
        self.apiMaxRetries = Int(maxRetriesValue ?? "") ?? 3
        self.apiRetryBaseDelay = TimeInterval(retryDelayValue ?? "") ?? 1.0
        self.apiRetryableStatusCodes = [408, 429, 500, 502, 503, 504]
        self.webSocketBaseURL = wsURL
    }

    private static func defaultAPIBaseURL(for env: AppEnvironment) -> String {
        switch env {
        case .development:
            return "http://localhost:8000/api/v1"
        case .staging:
            return "https://staging-api.bayit.tv/api/v1"
        case .production:
            return "https://api.bayit.tv/api/v1"
        }
    }

    private static func defaultWebSocketURL(for env: AppEnvironment) -> String {
        switch env {
        case .development:
            return "ws://localhost:8000"
        case .staging:
            return "wss://staging-api.bayit.tv"
        case .production:
            return "wss://api.bayit.tv"
        }
    }
}
