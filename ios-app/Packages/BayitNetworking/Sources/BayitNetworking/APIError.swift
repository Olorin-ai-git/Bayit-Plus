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
    ///
    /// Parses JSON response bodies to extract the `detail` field for user-friendly
    /// error messages instead of showing raw JSON to the user.
    public static func fromHTTPStatus(_ statusCode: Int, body: Data?) -> APIError {
        let message = extractMessage(from: body)

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

    /// Extract a user-friendly message from the response body.
    /// Parses JSON to find `detail` field; falls back to raw string.
    private static func extractMessage(from body: Data?) -> String {
        guard let body, !body.isEmpty else { return "No response body" }

        // Try to parse JSON and extract "detail" field
        if let json = try? JSONSerialization.jsonObject(with: body) as? [String: Any],
           let detail = json["detail"] as? String {
            return detail
        }

        // Fall back to raw string but truncate if too long
        let raw = String(data: body, encoding: .utf8) ?? "No response body"
        if raw.count > 120 {
            return String(raw.prefix(120))
        }
        return raw
    }
}
