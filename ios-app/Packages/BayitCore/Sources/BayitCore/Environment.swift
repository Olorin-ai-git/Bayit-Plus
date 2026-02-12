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

    // MARK: - WebSocket Configuration
    var webSocketMaxConcurrentConnections: Int { get }
    var webSocketPingInterval: TimeInterval { get }
    var webSocketMaxReconnectAttempts: Int { get }
    var webSocketReconnectBaseDelay: TimeInterval { get }
    var webSocketInactiveGracePeriod: TimeInterval { get }

    // MARK: - Catch-Up Configuration
    var catchUpCreditCost: Int { get }
    var catchUpAutoPromptSeconds: Int { get }
    var catchUpDefaultWindowMinutes: Int { get }
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
    public let webSocketMaxConcurrentConnections: Int
    public let webSocketPingInterval: TimeInterval
    public let webSocketMaxReconnectAttempts: Int
    public let webSocketReconnectBaseDelay: TimeInterval
    public let webSocketInactiveGracePeriod: TimeInterval
    public let catchUpCreditCost: Int
    public let catchUpAutoPromptSeconds: Int
    public let catchUpDefaultWindowMinutes: Int

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

        let wsMaxConnValue = info["WS_MAX_CONCURRENT_CONNECTIONS"] as? String
            ?? ProcessInfo.processInfo.environment["WS_MAX_CONCURRENT_CONNECTIONS"]

        let wsPingValue = info["WS_PING_INTERVAL"] as? String
            ?? ProcessInfo.processInfo.environment["WS_PING_INTERVAL"]

        let wsMaxReconnectValue = info["WS_MAX_RECONNECT_ATTEMPTS"] as? String
            ?? ProcessInfo.processInfo.environment["WS_MAX_RECONNECT_ATTEMPTS"]

        let wsReconnectDelayValue = info["WS_RECONNECT_BASE_DELAY"] as? String
            ?? ProcessInfo.processInfo.environment["WS_RECONNECT_BASE_DELAY"]

        let wsGracePeriodValue = info["WS_INACTIVE_GRACE_PERIOD"] as? String
            ?? ProcessInfo.processInfo.environment["WS_INACTIVE_GRACE_PERIOD"]

        let catchUpCreditCostValue = info["CATCHUP_CREDIT_COST"] as? String
            ?? ProcessInfo.processInfo.environment["CATCHUP_CREDIT_COST"]

        let catchUpAutoPromptValue = info["CATCHUP_AUTO_PROMPT_SECONDS"] as? String
            ?? ProcessInfo.processInfo.environment["CATCHUP_AUTO_PROMPT_SECONDS"]

        let catchUpWindowValue = info["CATCHUP_DEFAULT_WINDOW_MINUTES"] as? String
            ?? ProcessInfo.processInfo.environment["CATCHUP_DEFAULT_WINDOW_MINUTES"]

        self.environment = env
        self.apiBaseURL = apiURL
        self.apiTimeout = TimeInterval(timeoutValue ?? "") ?? 30.0
        self.apiMaxRetries = Int(maxRetriesValue ?? "") ?? 3
        self.apiRetryBaseDelay = TimeInterval(retryDelayValue ?? "") ?? 1.0
        self.apiRetryableStatusCodes = [408, 429, 500, 502, 503, 504]
        self.webSocketBaseURL = wsURL
        self.webSocketMaxConcurrentConnections = Int(wsMaxConnValue ?? "") ?? 5
        self.webSocketPingInterval = TimeInterval(wsPingValue ?? "") ?? 30.0
        self.webSocketMaxReconnectAttempts = Int(wsMaxReconnectValue ?? "") ?? 5
        self.webSocketReconnectBaseDelay = TimeInterval(wsReconnectDelayValue ?? "") ?? 1.0
        self.webSocketInactiveGracePeriod = TimeInterval(wsGracePeriodValue ?? "") ?? 10.0
        self.catchUpCreditCost = Int(catchUpCreditCostValue ?? "") ?? 1
        self.catchUpAutoPromptSeconds = Int(catchUpAutoPromptValue ?? "") ?? 15
        self.catchUpDefaultWindowMinutes = Int(catchUpWindowValue ?? "") ?? 15
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
