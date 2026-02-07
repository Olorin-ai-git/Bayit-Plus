import Foundation

/// Comprehensive error types for the networking layer.
///
/// Maps to HTTP semantics while providing Swift-friendly cases
/// for pattern matching in the UI layer.
public enum APIError: Error, Sendable, Equatable {

    /// 401 Unauthorized -- token missing, expired, or invalid.
    case unauthorized(message: String)

    /// 403 Forbidden -- authenticated but insufficient permissions.
    case forbidden(message: String)

    /// 404 Not Found -- the requested resource does not exist.
    case notFound(message: String)

    /// 429 Too Many Requests -- rate limit exceeded.
    /// `retryAfter` is the server-suggested wait in seconds (from Retry-After header), if present.
    case rateLimited(retryAfter: TimeInterval?)

    /// 5xx Server Error -- includes the status code and server message.
    case serverError(statusCode: Int, message: String)

    /// The request could not be sent or the response could not be received.
    case networkError(underlying: String)

    /// The response body could not be decoded into the expected type.
    case decodingError(underlying: String)

    /// The request was cancelled (e.g. task cancellation).
    case cancelled

    /// An error not covered by other cases.
    case unknown(statusCode: Int?, message: String)
}

// MARK: - LocalizedError

extension APIError: LocalizedError {
    public var errorDescription: String? {
        switch self {
        case .unauthorized(let message):
            return "Unauthorized: \(message)"
        case .forbidden(let message):
            return "Forbidden: \(message)"
        case .notFound(let message):
            return "Not Found: \(message)"
        case .rateLimited(let retryAfter):
            if let retryAfter {
                return "Rate limited. Retry after \(Int(retryAfter))s."
            }
            return "Rate limited."
        case .serverError(let statusCode, let message):
            return "Server error (\(statusCode)): \(message)"
        case .networkError(let underlying):
            return "Network error: \(underlying)"
        case .decodingError(let underlying):
            return "Decoding error: \(underlying)"
        case .cancelled:
            return "Request cancelled."
        case .unknown(let statusCode, let message):
            if let statusCode {
                return "Error (\(statusCode)): \(message)"
            }
            return "Error: \(message)"
        }
    }
}

// MARK: - Factory

extension APIError {

    /// Creates the appropriate `APIError` from an HTTP status code and response body.
    static func fromHTTPStatus(_ statusCode: Int, body: Data?) -> APIError {
        let message = body.flatMap { String(data: $0, encoding: .utf8) } ?? "No response body"

        switch statusCode {
        case 401:
            return .unauthorized(message: message)
        case 403:
            return .forbidden(message: message)
        case 404:
            return .notFound(message: message)
        case 429:
            return .rateLimited(retryAfter: nil)
        case 500...599:
            return .serverError(statusCode: statusCode, message: message)
        default:
            return .unknown(statusCode: statusCode, message: message)
        }
    }
}
