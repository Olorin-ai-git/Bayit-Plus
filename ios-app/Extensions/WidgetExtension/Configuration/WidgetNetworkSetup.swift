import Foundation
import BayitCore

/// Lightweight network client for widget data fetching.
///
/// Uses URLSession directly rather than the full APIClient,
/// which depends on Firebase. Resolves the base URL from Bundle
/// info or environment following the same pattern as
/// `AppConfiguration` in BayitCore.
enum WidgetNetworkClient {

    // MARK: - Error Types

    enum NetworkError: Error, LocalizedError {
        case invalidURL(path: String)
        case httpError(statusCode: Int)
        case noData
        case decodingFailed(underlying: Error)
        case notAuthenticated

        var errorDescription: String? {
            switch self {
            case .invalidURL(let path):
                return "Invalid URL for path: \(path)"
            case .httpError(let statusCode):
                return "HTTP error with status code: \(statusCode)"
            case .noData:
                return "No data received from server"
            case .decodingFailed(let underlying):
                return "Decoding failed: \(underlying.localizedDescription)"
            case .notAuthenticated:
                return "No auth token available for authenticated request"
            }
        }
    }

    // MARK: - Configuration

    private static var baseURL: URL {
        let info = Bundle.main.infoDictionary ?? [:]

        guard let urlString = info["API_BASE_URL"] as? String
            ?? ProcessInfo.processInfo.environment["API_BASE_URL"] else {
            fatalError("""
                API_BASE_URL not configured for widget extension.
                Add to Info.plist or set API_BASE_URL environment variable.
                """)
        }

        guard let url = URL(string: urlString) else {
            fatalError("Invalid API_BASE_URL for widget: \(urlString)")
        }
        return url
    }

    private static let logger = BayitLogger(category: "WidgetNetwork")

    private static let session: URLSession = {
        let info = Bundle.main.infoDictionary ?? [:]

        guard let requestTimeout = (info["WIDGET_REQUEST_TIMEOUT"] as? TimeInterval)
            ?? (ProcessInfo.processInfo.environment["WIDGET_REQUEST_TIMEOUT"].flatMap { TimeInterval($0) }) else {
            fatalError("WIDGET_REQUEST_TIMEOUT not configured. Add to Info.plist.")
        }

        guard let resourceTimeout = (info["WIDGET_RESOURCE_TIMEOUT"] as? TimeInterval)
            ?? (ProcessInfo.processInfo.environment["WIDGET_RESOURCE_TIMEOUT"].flatMap { TimeInterval($0) }) else {
            fatalError("WIDGET_RESOURCE_TIMEOUT not configured. Add to Info.plist.")
        }

        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = requestTimeout
        config.timeoutIntervalForResource = resourceTimeout
        return URLSession(configuration: config)
    }()

    // MARK: - Public API

    /// Fetches and decodes JSON from the API.
    ///
    /// - Parameters:
    ///   - path: The API path relative to the base URL (e.g. `/content/trending`).
    ///   - authenticated: Whether to include the auth token header.
    /// - Returns: The decoded response of type `T`.
    static func fetchJSON<T: Decodable>(
        path: String,
        authenticated: Bool = false
    ) async throws -> T {
        guard let url = URL(string: path, relativeTo: baseURL) else {
            throw NetworkError.invalidURL(path: path)
        }

        var request = URLRequest(url: url)
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.setValue(
            CorrelationID.generate(),
            forHTTPHeaderField: "X-Correlation-ID"
        )

        if authenticated {
            guard let token = WidgetAuthTokenProvider.authToken() else {
                throw NetworkError.notAuthenticated
            }
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        logger.debug(
            "Widget network request",
            context: [
                "path": path,
                "authenticated": String(authenticated),
            ]
        )

        let (data, response) = try await session.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw NetworkError.noData
        }

        guard (200..<300).contains(httpResponse.statusCode) else {
            logger.error(
                "Widget network request failed",
                context: [
                    "path": path,
                    "statusCode": String(httpResponse.statusCode),
                ]
            )
            throw NetworkError.httpError(statusCode: httpResponse.statusCode)
        }

        do {
            let decoder = JSONDecoder()
            decoder.dateDecodingStrategy = .iso8601
            return try decoder.decode(T.self, from: data)
        } catch {
            throw NetworkError.decodingFailed(underlying: error)
        }
    }
}
