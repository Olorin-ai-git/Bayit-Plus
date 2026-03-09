import BayitCore
import Foundation
#if os(iOS) || os(tvOS)
    import FirebaseAnalytics
#endif

/// Analytics service for tracking user events and screen views via Firebase Analytics.
///
/// Use `AnalyticsService` for event tracking. Use `CrashlyticsLogger` (also in this
/// package) for crash and error reporting.
public final class AnalyticsService: @unchecked Sendable {
    private let logger = BayitLogger(category: "Analytics")

    public init() {}

    /// Log a custom event with optional parameters.
    public func logEvent(_ name: String, parameters: [String: Any] = [:]) {
        #if os(iOS) || os(tvOS)
            Analytics.logEvent(name, parameters: parameters.isEmpty ? nil : parameters)
        #endif
        logger.debug("Event logged", context: ["event": name])
    }

    /// Log a screen view.
    public func logScreen(_ screenName: String, screenClass: String) {
        #if os(iOS) || os(tvOS)
            Analytics.logEvent(AnalyticsEventScreenView, parameters: [
                AnalyticsParameterScreenName: screenName,
                AnalyticsParameterScreenClass: screenClass,
            ])
        #endif
        logger.debug("Screen view logged", context: ["screen": screenName])
    }

    /// Set a user property (e.g. subscription tier, language preference).
    public func setUserProperty(_ value: String?, forName name: String) {
        #if os(iOS) || os(tvOS)
            Analytics.setUserProperty(value, forName: name)
        #endif
    }

    /// Associate subsequent events with a user identifier.
    public func setUserID(_ userID: String?) {
        #if os(iOS) || os(tvOS)
            Analytics.setUserID(userID)
        #endif
    }

    /// Reset analytics data (called on logout).
    public func resetAnalyticsData() {
        #if os(iOS) || os(tvOS)
            Analytics.resetAnalyticsData()
        #endif
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
    #if os(iOS) || os(tvOS)
        public static let searchPerformed = AnalyticsEventSearch
        public static let subscriptionStart = AnalyticsEventBeginCheckout
        public static let subscriptionPurchase = AnalyticsEventPurchase
        public static let loginSuccess = AnalyticsEventLogin
        public static let signupSuccess = AnalyticsEventSignUp
        public static let shareContent = AnalyticsEventShare
    #else
        public static let searchPerformed = "search"
        public static let subscriptionStart = "begin_checkout"
        public static let subscriptionPurchase = "purchase"
        public static let loginSuccess = "login"
        public static let signupSuccess = "sign_up"
        public static let shareContent = "share"
    #endif
    public static let liveChannelTuned = "live_channel_tuned"
    public static let subtitleEnabled = "subtitle_enabled"
    public static let dubbingEnabled = "dubbing_enabled"
    public static let castStarted = "cast_started"
    public static let downloadStarted = "download_started"
    // Onboarding tour events
    public static let onboardingTourStart = "onboarding_tour_start"
    public static let onboardingCardView = "onboarding_card_view"
    public static let onboardingDemoTap = "onboarding_demo_tap"
    public static let onboardingDemoComplete = "onboarding_demo_complete"
    public static let onboardingTourComplete = "onboarding_tour_complete"
    public static let onboardingTourSkip = "onboarding_tour_skip"
    public static let onboardingTourResume = "onboarding_tour_resume"
}

/// Standard parameter name constants.
public enum BayitAnalyticsParam {
    #if os(iOS) || os(tvOS)
        public static let contentId = AnalyticsParameterItemID
        public static let contentType = AnalyticsParameterContentType
    #else
        public static let contentId = "item_id"
        public static let contentType = "content_type"
    #endif
    public static let language = "language"
    public static let channelId = "channel_id"
    public static let quality = "quality"
    public static let duration = "duration"
    public static let position = "position"
    public static let featureKey = "feature_key"
    public static let cardIndex = "card_index"
    public static let tourVersion = "tour_version"
    public static let completionStatus = "completion_status"
}
