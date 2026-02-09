import XCTest
@testable import BayitNetworking

final class APIErrorTests: XCTestCase {

    // MARK: - Factory: fromHTTPStatus

    func testFromHTTPStatus401ReturnsUnauthorized() {
        let body = "Token expired".data(using: .utf8)
        let error = APIError.fromHTTPStatus(401, body: body)

        if case .unauthorized(let message) = error {
            XCTAssertEqual(message, "Token expired")
        } else {
            XCTFail("Expected unauthorized, got \(error)")
        }
    }

    func testFromHTTPStatus403ReturnsForbidden() {
        let body = "Insufficient permissions".data(using: .utf8)
        let error = APIError.fromHTTPStatus(403, body: body)

        if case .forbidden(let message) = error {
            XCTAssertEqual(message, "Insufficient permissions")
        } else {
            XCTFail("Expected forbidden, got \(error)")
        }
    }

    func testFromHTTPStatus404ReturnsNotFound() {
        let body = "Resource missing".data(using: .utf8)
        let error = APIError.fromHTTPStatus(404, body: body)

        if case .notFound(let message) = error {
            XCTAssertEqual(message, "Resource missing")
        } else {
            XCTFail("Expected notFound, got \(error)")
        }
    }

    func testFromHTTPStatus429ReturnsRateLimited() {
        let error = APIError.fromHTTPStatus(429, body: nil)

        if case .rateLimited(let retryAfter) = error {
            XCTAssertNil(retryAfter)
        } else {
            XCTFail("Expected rateLimited, got \(error)")
        }
    }

    func testFromHTTPStatus500ReturnsServerError() {
        let body = "Internal error".data(using: .utf8)
        let error = APIError.fromHTTPStatus(500, body: body)

        if case .serverError(let statusCode, let message) = error {
            XCTAssertEqual(statusCode, 500)
            XCTAssertEqual(message, "Internal error")
        } else {
            XCTFail("Expected serverError, got \(error)")
        }
    }

    func testFromHTTPStatus502ReturnsServerError() {
        let error = APIError.fromHTTPStatus(502, body: nil)

        if case .serverError(let statusCode, let message) = error {
            XCTAssertEqual(statusCode, 502)
            XCTAssertEqual(message, "No response body")
        } else {
            XCTFail("Expected serverError, got \(error)")
        }
    }

    func testFromHTTPStatus503ReturnsServerError() {
        let error = APIError.fromHTTPStatus(503, body: nil)
        if case .serverError(let statusCode, _) = error {
            XCTAssertEqual(statusCode, 503)
        } else {
            XCTFail("Expected serverError for 503")
        }
    }

    func testFromHTTPStatus599ReturnsServerError() {
        let error = APIError.fromHTTPStatus(599, body: nil)
        if case .serverError(let statusCode, _) = error {
            XCTAssertEqual(statusCode, 599)
        } else {
            XCTFail("Expected serverError for 599")
        }
    }

    func testFromHTTPStatus200ReturnsUnknown() {
        let error = APIError.fromHTTPStatus(200, body: nil)

        if case .unknown(let statusCode, _) = error {
            XCTAssertEqual(statusCode, 200)
        } else {
            XCTFail("Expected unknown, got \(error)")
        }
    }

    func testFromHTTPStatus418ReturnsUnknown() {
        let body = "I'm a teapot".data(using: .utf8)
        let error = APIError.fromHTTPStatus(418, body: body)

        if case .unknown(let statusCode, let message) = error {
            XCTAssertEqual(statusCode, 418)
            XCTAssertEqual(message, "I'm a teapot")
        } else {
            XCTFail("Expected unknown, got \(error)")
        }
    }

    func testFromHTTPStatusNilBodyUsesDefault() {
        let error = APIError.fromHTTPStatus(401, body: nil)

        if case .unauthorized(let message) = error {
            XCTAssertEqual(message, "No response body")
        } else {
            XCTFail("Expected unauthorized, got \(error)")
        }
    }

    // MARK: - Error Descriptions

    func testUnauthorizedDescription() {
        let error = APIError.unauthorized(message: "expired")
        XCTAssertEqual(error.errorDescription, "Unauthorized: expired")
    }

    func testForbiddenDescription() {
        let error = APIError.forbidden(message: "no access")
        XCTAssertEqual(error.errorDescription, "Forbidden: no access")
    }

    func testNotFoundDescription() {
        let error = APIError.notFound(message: "missing")
        XCTAssertEqual(error.errorDescription, "Not Found: missing")
    }

    func testRateLimitedWithRetryAfterDescription() {
        let error = APIError.rateLimited(retryAfter: 30)
        XCTAssertEqual(error.errorDescription, "Rate limited. Retry after 30s.")
    }

    func testRateLimitedWithoutRetryAfterDescription() {
        let error = APIError.rateLimited(retryAfter: nil)
        XCTAssertEqual(error.errorDescription, "Rate limited.")
    }

    func testServerErrorDescription() {
        let error = APIError.serverError(statusCode: 500, message: "fail")
        XCTAssertEqual(error.errorDescription, "Server error (500): fail")
    }

    func testNetworkErrorDescription() {
        let error = APIError.networkError(underlying: "timeout")
        XCTAssertEqual(error.errorDescription, "Network error: timeout")
    }

    func testDecodingErrorDescription() {
        let error = APIError.decodingError(underlying: "bad json")
        XCTAssertEqual(error.errorDescription, "Decoding error: bad json")
    }

    func testCancelledDescription() {
        let error = APIError.cancelled
        XCTAssertEqual(error.errorDescription, "Request cancelled.")
    }

    func testUnknownWithStatusCodeDescription() {
        let error = APIError.unknown(statusCode: 418, message: "teapot")
        XCTAssertEqual(error.errorDescription, "Error (418): teapot")
    }

    func testUnknownWithoutStatusCodeDescription() {
        let error = APIError.unknown(statusCode: nil, message: "something")
        XCTAssertEqual(error.errorDescription, "Error: something")
    }

    // MARK: - Equatable

    func testEquatableSameCases() {
        XCTAssertEqual(
            APIError.unauthorized(message: "a"),
            APIError.unauthorized(message: "a")
        )
        XCTAssertEqual(APIError.cancelled, APIError.cancelled)
    }

    func testEquatableDifferentCases() {
        XCTAssertNotEqual(
            APIError.unauthorized(message: "a"),
            APIError.forbidden(message: "a")
        )
    }
}
