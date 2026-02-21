import Foundation

/// Actor-based HTTP client that ports the Bayit+ web `api.js` interceptor
/// pattern to native Swift.
///
/// Features (matching api.js):
/// - Bearer token injection from `AuthTokenProvider`
/// - `X-Correlation-ID` UUID per request
/// - `Accept-Language` from device locale
/// - `X-User-City` / `X-User-State` from `LocationProvider`
/// - Exponential-backoff retry for transient failures
/// - 429 rate-limit handling with `Retry-After` header support
/// - Returns decoded model directly (like api.js returns `response.data`)
/// - Posts `unauthorizedNotification` on 401 so the app can redirect to login
public actor APIClient {
    /// Posted on the main thread when a 401 response is received.
    /// The app layer should observe this to trigger re-authentication.
    public static let unauthorizedNotification = Notification.Name("BayitAPIClientUnauthorized")

    // MARK: - Dependencies

    public let configuration: NetworkConfiguration
    let authTokenProvider: AuthTokenProvider
    let locationProvider: LocationProvider
    let logger: APILogger
    let retryPolicy: RetryPolicy
    let session: URLSession
    let jsonEncoder: JSONEncoder
    let jsonDecoder: JSONDecoder

    // MARK: - Init

    public init(
        configuration: NetworkConfiguration,
        authTokenProvider: AuthTokenProvider,
        locationProvider: LocationProvider,
        logger: APILogger,
        session: URLSession? = nil
    ) {
        self.configuration = configuration
        self.authTokenProvider = authTokenProvider
        self.locationProvider = locationProvider
        self.logger = logger
        retryPolicy = RetryPolicy(configuration: configuration)

        let sessionConfig = URLSessionConfiguration.default
        sessionConfig.timeoutIntervalForRequest = configuration.timeout
        sessionConfig.urlCache = URLCache(
            memoryCapacity: configuration.urlCacheMemoryCapacity,
            diskCapacity: configuration.urlCacheDiskCapacity
        )
        sessionConfig.requestCachePolicy = .useProtocolCachePolicy
        self.session = session ?? URLSession(configuration: sessionConfig)

        let encoder = JSONEncoder()
        encoder.keyEncodingStrategy = .convertToSnakeCase
        encoder.dateEncodingStrategy = .iso8601
        jsonEncoder = encoder

        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        decoder.dateDecodingStrategy = .iso8601
        jsonDecoder = decoder
    }

    // MARK: - Public API

    /// Execute a request and return the decoded response model.
    ///
    /// This is the primary entry point -- equivalent to `api.get()`, `api.post()`, etc.
    /// in the web codebase. The caller receives the decoded model directly,
    /// mirroring how api.js returns `response.data`.
    public func request<Body: Encodable & Sendable, Response: Decodable & Sendable>(
        _ apiRequest: APIRequest<Body>,
        as responseType: Response.Type
    ) async throws -> Response {
        let correlationID = UUID().uuidString

        logger.debug(
            "Request: \(apiRequest.method.rawValue) \(apiRequest.path)",
            metadata: [
                "correlationId": correlationID,
                "method": apiRequest.method.rawValue,
                "path": apiRequest.path,
            ]
        )

        return try await executeWithRetry(
            apiRequest: apiRequest,
            responseType: responseType,
            correlationID: correlationID,
            attempt: 0
        )
    }

    /// Convenience: Execute a body-less request (GET, DELETE) and decode the response.
    public func request<Response: Decodable & Sendable>(
        _ apiRequest: EmptyRequest,
        as responseType: Response.Type
    ) async throws -> Response {
        let correlationID = UUID().uuidString

        logger.debug(
            "Request: \(apiRequest.method.rawValue) \(apiRequest.path)",
            metadata: [
                "correlationId": correlationID,
                "method": apiRequest.method.rawValue,
                "path": apiRequest.path,
            ]
        )

        return try await executeWithRetry(
            apiRequest: apiRequest,
            responseType: responseType,
            correlationID: correlationID,
            attempt: 0
        )
    }

    /// Execute a request that returns no meaningful body (e.g. 204 No Content).
    public func requestVoid<Body: Encodable & Sendable>(
        _ apiRequest: APIRequest<Body>
    ) async throws {
        let _: EmptyResponse = try await request(apiRequest, as: EmptyResponse.self)
    }
}

/// Sentinel type for endpoints that return no meaningful body.
public struct EmptyResponse: Decodable, Sendable {}
