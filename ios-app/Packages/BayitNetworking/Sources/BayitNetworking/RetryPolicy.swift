import Foundation

/// Encapsulates retry logic with exponential back-off.
///
/// Mirrors the web api.js retry algorithm:
/// `delay = retryBaseDelay * 2^retryCount`
///
/// For 429 responses the server's `Retry-After` header takes precedence.
public struct RetryPolicy: Sendable {

    private let maxRetries: Int
    private let baseDelay: TimeInterval
    private let retryableStatusCodes: Set<Int>

    public init(configuration: NetworkConfiguration) {
        self.maxRetries = configuration.maxRetries
        self.baseDelay = configuration.retryBaseDelay
        self.retryableStatusCodes = configuration.retryableStatusCodes
    }

    /// Whether the given HTTP status code is eligible for retry.
    public func isRetryable(statusCode: Int) -> Bool {
        retryableStatusCodes.contains(statusCode)
    }

    /// Whether the given attempt number (0-based) is within retry budget.
    public func shouldRetry(attempt: Int) -> Bool {
        attempt < maxRetries
    }

    /// Computes the delay before the next retry attempt.
    ///
    /// - Parameters:
    ///   - attempt: Zero-based attempt index (0 = first retry).
    ///   - retryAfterHeader: Value of the `Retry-After` response header, if present.
    /// - Returns: Delay in seconds.
    public func delay(forAttempt attempt: Int, retryAfterHeader: String?) -> TimeInterval {
        // Respect server's Retry-After if present (seconds value)
        if let retryAfterHeader,
           let serverDelay = TimeInterval(retryAfterHeader),
           serverDelay > 0 {
            return serverDelay
        }

        // Exponential back-off: baseDelay * 2^attempt
        return baseDelay * pow(2.0, Double(attempt))
    }
}
