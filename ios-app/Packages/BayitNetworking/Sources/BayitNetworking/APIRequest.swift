import Foundation

/// A type-safe request builder for the API client.
///
/// Encapsulates path, method, query parameters, body, and per-request headers.
/// The `APIClient` resolves the full URL from its configuration's `baseURL` + this path.
public struct APIRequest<Body: Encodable & Sendable>: Sendable {

    /// The path component appended to `baseURL` (e.g. `/content/featured`).
    public let path: String

    /// HTTP method for this request.
    public let method: HTTPMethod

    /// URL query items (appended as `?key=value&...`).
    public let queryItems: [URLQueryItem]

    /// Optional request body, encoded as JSON.
    public let body: Body?

    /// Per-request headers that override or supplement the defaults.
    public let headers: [String: String]

    public init(
        path: String,
        method: HTTPMethod = .get,
        queryItems: [URLQueryItem] = [],
        body: Body? = nil,
        headers: [String: String] = [:]
    ) {
        self.path = path
        self.method = method
        self.queryItems = queryItems
        self.body = body
        self.headers = headers
    }
}

// MARK: - Convenience for Void Body

/// A type alias for requests that carry no body (GET, DELETE).
public typealias EmptyRequest = APIRequest<EmptyBody>

/// An empty `Encodable` sentinel for body-less requests.
public struct EmptyBody: Encodable, Sendable {
    public init() {}
}

public extension APIRequest where Body == EmptyBody {

    /// Creates a request with no body.
    init(
        path: String,
        method: HTTPMethod = .get,
        queryItems: [URLQueryItem] = [],
        headers: [String: String] = [:]
    ) {
        self.path = path
        self.method = method
        self.queryItems = queryItems
        self.body = nil
        self.headers = headers
    }
}
