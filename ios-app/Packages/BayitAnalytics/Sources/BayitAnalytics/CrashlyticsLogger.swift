import BayitCore
import Foundation
#if os(iOS) || os(tvOS)
    import FirebaseCrashlytics
#endif

/// Crashlytics integration for BayitLogger errors.
/// Automatically sends error and critical level logs to Firebase Crashlytics.
public final class CrashlyticsLogger {
    #if os(iOS) || os(tvOS)
        private let crashlytics = Crashlytics.crashlytics()
    #endif
    private let logger = BayitLogger(category: "CrashlyticsLogger")

    public init() {}

    /// Initialize Crashlytics and enable collection.
    public static func initialize() {
        #if os(iOS) || os(tvOS)
            Crashlytics.crashlytics().setCrashlyticsCollectionEnabled(true)
        #endif
    }

    // MARK: - User Context

    /// Set user identifier for crash reports.
    public func setUserID(_ userID: String) {
        #if os(iOS) || os(tvOS)
            crashlytics.setUserID(userID)
        #endif
    }

    /// Clear user identifier (on logout).
    public func clearUserID() {
        #if os(iOS) || os(tvOS)
            crashlytics.setUserID("")
        #endif
    }

    /// Set custom key-value pair for crash context.
    public func setCustomValue(_ value: String, forKey key: String) {
        #if os(iOS) || os(tvOS)
            crashlytics.setCustomValue(value, forKey: key)
        #endif
    }

    // MARK: - Error Logging

    /// Log error to Crashlytics.
    public func logError(_ error: Error, context: [String: String] = [:]) {
        #if os(iOS) || os(tvOS)
            for (key, value) in context {
                crashlytics.setCustomValue(value, forKey: key)
            }
            crashlytics.record(error: error)
        #else
            logger.error("Error recorded", error: error, context: context)
        #endif
    }

    /// Log error message to Crashlytics.
    public func logError(_ message: String, context: [String: String] = [:]) {
        let error = NSError(
            domain: "tv.bayit.app",
            code: -1,
            userInfo: [NSLocalizedDescriptionKey: message]
        )
        logError(error, context: context)
    }

    /// Log breadcrumb for crash context.
    public func log(_ message: String) {
        #if os(iOS) || os(tvOS)
            crashlytics.log(message)
        #else
            logger.debug(message)
        #endif
    }

    // MARK: - Force Crash (Testing Only)

    #if DEBUG
        /// Force a crash for testing Crashlytics integration.
        /// **WARNING:** Only call this in DEBUG builds for testing.
        public func forceCrashForTesting() {
            fatalError("Test crash from CrashlyticsLogger")
        }
    #endif
}
