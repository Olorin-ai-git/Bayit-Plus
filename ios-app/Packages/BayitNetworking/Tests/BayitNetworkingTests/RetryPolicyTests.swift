import XCTest
@testable import BayitNetworking

/// Test double conforming to NetworkConfiguration for RetryPolicy tests.
/// Only used in test target - never exported to production.
private struct TestNetworkConfiguration: NetworkConfiguration {
    var baseURL: URL = URL(string: "https://test.example.com")!
    var timeout: TimeInterval = 30
    var maxRetries: Int = 3
    var retryBaseDelay: TimeInterval = 1.0
    var retryableStatusCodes: Set<Int> = [408, 429, 500, 502, 503, 504]
    var defaultHeaders: [String: String] = [:]
    var webSocketMaxConcurrentConnections: Int = 5
    var webSocketPingInterval: TimeInterval = 30
    var webSocketMaxReconnectAttempts: Int = 5
    var webSocketReconnectBaseDelay: TimeInterval = 1.0
    var webSocketInactiveGracePeriod: TimeInterval = 10
}

final class RetryPolicyTests: XCTestCase {

    private func makePolicy(
        maxRetries: Int = 3,
        baseDelay: TimeInterval = 1.0,
        retryableStatusCodes: Set<Int> = [408, 429, 500, 502, 503, 504]
    ) -> RetryPolicy {
        var config = TestNetworkConfiguration()
        config.maxRetries = maxRetries
        config.retryBaseDelay = baseDelay
        config.retryableStatusCodes = retryableStatusCodes
        return RetryPolicy(configuration: config)
    }

    // MARK: - isRetryable

    func testIsRetryableForRetryableStatusCodes() {
        let policy = makePolicy()

        XCTAssertTrue(policy.isRetryable(statusCode: 408))
        XCTAssertTrue(policy.isRetryable(statusCode: 429))
        XCTAssertTrue(policy.isRetryable(statusCode: 500))
        XCTAssertTrue(policy.isRetryable(statusCode: 502))
        XCTAssertTrue(policy.isRetryable(statusCode: 503))
        XCTAssertTrue(policy.isRetryable(statusCode: 504))
    }

    func testIsNotRetryableForClientErrors() {
        let policy = makePolicy()

        XCTAssertFalse(policy.isRetryable(statusCode: 400))
        XCTAssertFalse(policy.isRetryable(statusCode: 401))
        XCTAssertFalse(policy.isRetryable(statusCode: 403))
        XCTAssertFalse(policy.isRetryable(statusCode: 404))
    }

    func testIsNotRetryableForSuccessCodes() {
        let policy = makePolicy()

        XCTAssertFalse(policy.isRetryable(statusCode: 200))
        XCTAssertFalse(policy.isRetryable(statusCode: 201))
        XCTAssertFalse(policy.isRetryable(statusCode: 204))
    }

    func testCustomRetryableStatusCodes() {
        let policy = makePolicy(retryableStatusCodes: [418, 503])

        XCTAssertTrue(policy.isRetryable(statusCode: 418))
        XCTAssertTrue(policy.isRetryable(statusCode: 503))
        XCTAssertFalse(policy.isRetryable(statusCode: 500))
    }

    // MARK: - shouldRetry

    func testShouldRetryWithinBudget() {
        let policy = makePolicy(maxRetries: 3)

        XCTAssertTrue(policy.shouldRetry(attempt: 0))
        XCTAssertTrue(policy.shouldRetry(attempt: 1))
        XCTAssertTrue(policy.shouldRetry(attempt: 2))
    }

    func testShouldNotRetryBeyondBudget() {
        let policy = makePolicy(maxRetries: 3)

        XCTAssertFalse(policy.shouldRetry(attempt: 3))
        XCTAssertFalse(policy.shouldRetry(attempt: 4))
        XCTAssertFalse(policy.shouldRetry(attempt: 100))
    }

    func testShouldNotRetryWithZeroMaxRetries() {
        let policy = makePolicy(maxRetries: 0)

        XCTAssertFalse(policy.shouldRetry(attempt: 0))
    }

    // MARK: - delay (Exponential Backoff)

    func testDelayExponentialBackoff() {
        let policy = makePolicy(baseDelay: 1.0)

        // baseDelay * 2^attempt
        XCTAssertEqual(policy.delay(forAttempt: 0, retryAfterHeader: nil), 1.0, accuracy: 0.001)
        XCTAssertEqual(policy.delay(forAttempt: 1, retryAfterHeader: nil), 2.0, accuracy: 0.001)
        XCTAssertEqual(policy.delay(forAttempt: 2, retryAfterHeader: nil), 4.0, accuracy: 0.001)
        XCTAssertEqual(policy.delay(forAttempt: 3, retryAfterHeader: nil), 8.0, accuracy: 0.001)
    }

    func testDelayWithCustomBaseDelay() {
        let policy = makePolicy(baseDelay: 0.5)

        XCTAssertEqual(policy.delay(forAttempt: 0, retryAfterHeader: nil), 0.5, accuracy: 0.001)
        XCTAssertEqual(policy.delay(forAttempt: 1, retryAfterHeader: nil), 1.0, accuracy: 0.001)
        XCTAssertEqual(policy.delay(forAttempt: 2, retryAfterHeader: nil), 2.0, accuracy: 0.001)
    }

    // MARK: - delay (Retry-After Header)

    func testDelayRespectsRetryAfterHeader() {
        let policy = makePolicy(baseDelay: 1.0)

        let delay = policy.delay(forAttempt: 0, retryAfterHeader: "60")
        XCTAssertEqual(delay, 60.0, accuracy: 0.001)
    }

    func testDelayRetryAfterHeaderOverridesBackoff() {
        let policy = makePolicy(baseDelay: 1.0)

        // Even on attempt 5 (backoff would be 32s), server says 5s
        let delay = policy.delay(forAttempt: 5, retryAfterHeader: "5")
        XCTAssertEqual(delay, 5.0, accuracy: 0.001)
    }

    func testDelayIgnoresInvalidRetryAfterHeader() {
        let policy = makePolicy(baseDelay: 1.0)

        // Non-numeric header falls back to exponential backoff
        let delay = policy.delay(forAttempt: 1, retryAfterHeader: "invalid")
        XCTAssertEqual(delay, 2.0, accuracy: 0.001)
    }

    func testDelayIgnoresZeroRetryAfterHeader() {
        let policy = makePolicy(baseDelay: 1.0)

        // Zero is not > 0, so falls back to exponential backoff
        let delay = policy.delay(forAttempt: 1, retryAfterHeader: "0")
        XCTAssertEqual(delay, 2.0, accuracy: 0.001)
    }

    func testDelayIgnoresNegativeRetryAfterHeader() {
        let policy = makePolicy(baseDelay: 1.0)

        // Negative is not > 0, so falls back to exponential backoff
        let delay = policy.delay(forAttempt: 2, retryAfterHeader: "-5")
        XCTAssertEqual(delay, 4.0, accuracy: 0.001)
    }

    func testDelayWithNilRetryAfterHeader() {
        let policy = makePolicy(baseDelay: 1.0)

        let delay = policy.delay(forAttempt: 0, retryAfterHeader: nil)
        XCTAssertEqual(delay, 1.0, accuracy: 0.001)
    }
}
