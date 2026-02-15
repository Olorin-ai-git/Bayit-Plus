import BayitCore
import FirebaseCrashlytics
import Foundation

/// Crashlytics integration for BayitLogger errors.
/// Automatically sends error and critical level logs to Firebase Crashlytics.
public final class CrashlyticsLogger {

    private let crashlytics = Crashlytics.crashlytics()
    private let logger = BayitLogger(category: "CrashlyticsLogger")

    public init() {}

    /// Initialize Crashlytics and enable collection.
    public static func initialize() {
        Crashlytics.crashlytics().setCrashlyticsCollectionEnabled(true)
    }

    // MARK: - User Context

    /// Set user identifier for crash reports.
    public func setUserID(_ userID: String) {
        crashlytics.setUserID(userID)
    }

    /// Clear user identifier (on logout).
    public func clearUserID() {
        crashlytics.setUserID("")
    }

    /// Set custom key-value pair for crash context.
    public func setCustomValue(_ value: String, forKey key: String) {
        crashlytics.setCustomValue(value, forKey: key)
    }

    // MARK: - Error Logging

    /// Log error to Crashlytics.
    public func logError(_ error: Error, context: [String: String] = [:]) {
        // Add context as custom keys
        for (key, value) in context {
            crashlytics.setCustomValue(value, forKey: key)
        }

        crashlytics.record(error: error)
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
        crashlytics.log(message)
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
