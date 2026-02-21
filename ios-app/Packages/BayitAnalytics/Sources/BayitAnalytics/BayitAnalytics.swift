import BayitCore
import FirebaseAnalytics
import Foundation

/// Analytics service for tracking user events and screen views via Firebase Analytics.
///
/// Use `AnalyticsService` for event tracking. Use `CrashlyticsLogger` (also in this
/// package) for crash and error reporting.
public final class AnalyticsService: @unchecked Sendable {
    private let logger = BayitLogger(category: "Analytics")

    public init() {}

    /// Log a custom event with optional parameters.
    public func logEvent(_ name: String, parameters: [String: Any] = [:]) {
        Analytics.logEvent(name, parameters: parameters.isEmpty ? nil : parameters)
        logger.debug("Event logged", context: ["event": name])
    }

    /// Log a screen view.
    public func logScreen(_ screenName: String, screenClass: String) {
        Analytics.logEvent(AnalyticsEventScreenView, parameters: [
            AnalyticsParameterScreenName: screenName,
            AnalyticsParameterScreenClass: screenClass,
        ])
        logger.debug("Screen view logged", context: ["screen": screenName])
    }

    /// Set a user property (e.g. subscription tier, language preference).
    public func setUserProperty(_ value: String?, forName name: String) {
        Analytics.setUserProperty(value, forName: name)
    }

    /// Associate subsequent events with a user identifier.
    public func setUserID(_ userID: String?) {
        Analytics.setUserID(userID)
    }

    /// Reset analytics data (called on logout).
    public func resetAnalyticsData() {
        Analytics.resetAnalyticsData()
        logger.info("Analytics data reset")
    }
}

/// Standard event name constants for Bayit+ analytics.
///
/// Use these with `AnalyticsService.logEvent(_:parameters:)` to ensure
/// consistent naming across iOS, tvOS, and web.
public enum BayitAnalyticsEvent {
    public static let contentView = "content_view"
    public static let playbackStart = "playback_start"
    public static let playbackComplete = "playback_complete"
    public static let playbackError = "playback_error"
    public static let searchPerformed = AnalyticsEventSearch
    public static let subscriptionStart = AnalyticsEventBeginCheckout
    public static let subscriptionPurchase = AnalyticsEventPurchase
    public static let loginSuccess = AnalyticsEventLogin
    public static let signupSuccess = AnalyticsEventSignUp
    public static let shareContent = AnalyticsEventShare
    public static let liveChannelTuned = "live_channel_tuned"
    public static let subtitleEnabled = "subtitle_enabled"
    public static let dubbingEnabled = "dubbing_enabled"
    public static let castStarted = "cast_started"
    public static let downloadStarted = "download_started"
}

/// Standard parameter name constants.
public enum BayitAnalyticsParam {
    public static let contentId = AnalyticsParameterItemID
    public static let contentType = AnalyticsParameterContentType
    public static let language = "language"
    public static let channelId = "channel_id"
    public static let quality = "quality"
    public static let duration = "duration"
    public static let position = "position"
}
