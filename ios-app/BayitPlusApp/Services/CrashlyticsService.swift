import BayitAnalytics
import BayitCore
import Foundation

/// Service for logging errors and crashes to Firebase Crashlytics.
/// Wrapper around CrashlyticsLogger from BayitAnalytics.
final class CrashlyticsService {

    private let logger = BayitLogger(category: "CrashlyticsService")
    private let crashlyticsLogger = CrashlyticsLogger()

    // MARK: - User Context

    /// Set user identifier for crash reports.
    func setUserID(_ userID: String) {
        crashlyticsLogger.setUserID(userID)
        logger.info("Set Crashlytics user ID", context: ["userID": userID])
    }

    /// Clear user identifier (on logout).
    func clearUserID() {
        crashlyticsLogger.clearUserID()
        logger.info("Cleared Crashlytics user ID")
    }

    /// Set custom key-value pair for crash context.
    func setCustomValue(_ value: String, forKey key: String) {
        crashlyticsLogger.setCustomValue(value, forKey: key)
    }

    // MARK: - Error Logging

    /// Log non-fatal error to Crashlytics.
    func logError(_ error: Error, context: [String: String] = [:]) {
        crashlyticsLogger.logError(error, context: context)
        logger.error("Logged error to Crashlytics", error: error, context: context)
    }

    /// Log non-fatal error with custom message.
    func logError(_ message: String, context: [String: String] = [:]) {
        crashlyticsLogger.logError(message, context: context)
        logger.error("Logged error to Crashlytics", context: context)
    }

    /// Log breadcrumb for crash context.
    func log(_ message: String) {
        crashlyticsLogger.log(message)
    }

    // MARK: - Force Crash (Testing Only)

    #if DEBUG
    /// Force a crash for testing Crashlytics integration.
    /// **WARNING:** Only call this in DEBUG builds for testing.
    func forceCrashForTesting() {
        crashlyticsLogger.forceCrashForTesting()
    }
    #endif
}
