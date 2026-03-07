import Foundation
import SwiftUI

/// App environment configuration
public enum AppEnvironment: String, Sendable {
    case development
    case staging
    case production

    public static var current: AppEnvironment {
        guard let rawValue = Bundle.main.infoDictionary?["APP_ENVIRONMENT"] as? String,
              let environment = AppEnvironment(rawValue: rawValue)
        else {
            #if DEBUG
                return .development
            #else
                return .production
            #endif
        }
        return environment
    }

    public var isDevelopment: Bool {
        self == .development
    }

    public var isStaging: Bool {
        self == .staging
    }

    public var isProduction: Bool {
        self == .production
    }
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

    // MARK: - Cast Configuration

    var googleCastReceiverAppId: String { get }
    var supportEmail: String { get }

    // MARK: - Content Configuration

    var progressTrackingIntervalSeconds: TimeInterval { get }
    var homeContentRowLimit: Int { get }
    var defaultCultureId: String { get }
    var hiddenChannelKeywords: [String] { get }

    /// When true, the app shows the owner's personal content library (VOD, movies, series).
    /// When false (App Store release), VOD content is hidden — only radio, podcasts,
    /// and AI features are available.
    var ownerMode: Bool { get }
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
    public let googleCastReceiverAppId: String
    public let supportEmail: String
    public let progressTrackingIntervalSeconds: TimeInterval
    public let homeContentRowLimit: Int
    public let defaultCultureId: String
    public let hiddenChannelKeywords: [String]
    public let ownerMode: Bool
}

// MARK: - SwiftUI Environment Key

private struct AppConfigurationKey: EnvironmentKey {
    static var defaultValue: AppConfiguration {
        AppConfiguration()
    }
}

public extension EnvironmentValues {
    var appConfiguration: AppConfiguration {
        get { self[AppConfigurationKey.self] }
        set { self[AppConfigurationKey.self] = newValue }
    }
}
