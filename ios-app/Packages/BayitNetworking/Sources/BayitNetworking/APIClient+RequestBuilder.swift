import Foundation

// MARK: - Request Building, Header Injection, Response Decoding

extension APIClient {
    func buildURLRequest<Body: Encodable & Sendable>(
        from apiRequest: APIRequest<Body>,
        correlationID: String
    ) async throws -> URLRequest {
        var components = URLComponents()
        components.path = apiRequest.path
        if !apiRequest.queryItems.isEmpty {
            components.queryItems = apiRequest.queryItems
        }

        guard let relativeURL = components.url(relativeTo: configuration.baseURL),
              let fullURL = URL(string: relativeURL.absoluteString)
        else {
            throw APIError.networkError(
                underlying: "Failed to construct URL for path: \(apiRequest.path)"
            )
        }

        var urlRequest = URLRequest(url: fullURL)
        urlRequest.httpMethod = apiRequest.method.rawValue
        urlRequest.timeoutInterval = configuration.timeout

        // Headers applied in same order as api.js interceptor
        applyDefaultHeaders(to: &urlRequest)
        urlRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")
        try await applyAuthHeader(to: &urlRequest, correlationID: correlationID, requiresAuth: apiRequest.requiresAuth)
        applyLocaleHeader(to: &urlRequest)
        urlRequest.setValue(correlationID, forHTTPHeaderField: "X-Correlation-ID")
        await applyLocationHeaders(to: &urlRequest)
        applyPerRequestHeaders(apiRequest.headers, to: &urlRequest)

        if let rawProvider = apiRequest.body as? RawBodyProvider {
            urlRequest.httpBody = rawProvider.rawData
        } else if let body = apiRequest.body {
            urlRequest.httpBody = try jsonEncoder.encode(body)
        }

        return urlRequest
    }

    // MARK: - Header Helpers

    private func applyDefaultHeaders(to request: inout URLRequest) {
        for (key, value) in configuration.defaultHeaders {
            request.setValue(value, forHTTPHeaderField: key)
        }
    }

    private func applyAuthHeader(
        to request: inout URLRequest, correlationID: String, requiresAuth: Bool
    ) async throws {
        if let token = try await authTokenProvider.currentToken() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            logger.debug(
                "Auth token attached",
                metadata: ["correlationId": correlationID, "hasToken": "true"]
            )
        } else if requiresAuth {
            // Token provider returned nil for an authenticated endpoint.
            // Throw locally so no unauthenticated request reaches the backend.
            // This prevents background/non-critical callers (e.g. progress tracking)
            // from inadvertently triggering the global unauthorizedNotification and
            // signing the user out on a transient refresh failure.
            // Genuine server-side revocation is still caught correctly: requests that
            // carry a valid token but are rejected by the server still return HTTP 401,
            // which posts the notification through the normal execution path.
            logger.warning(
                "No auth token available, aborting request",
                metadata: ["correlationId": correlationID, "path": request.url?.path ?? ""]
            )
            throw APIError.unauthorized(message: "No token available; refresh failed or session not established")
        }
        // requiresAuth == false: proceed without Authorization header (public endpoint)
    }

    private func applyLocaleHeader(to request: inout URLRequest) {
        let preferredLanguage = Locale.preferredLanguages.first ?? "he"
        request.setValue(preferredLanguage, forHTTPHeaderField: "Accept-Language")
    }

    private func applyLocationHeaders(to request: inout URLRequest) async {
        if let location = await locationProvider.currentLocation() {
            if let city = location.city {
                request.setValue(city, forHTTPHeaderField: "X-User-City")
            }
            if let state = location.state {
                request.setValue(state, forHTTPHeaderField: "X-User-State")
            }
        }
    }

    private func applyPerRequestHeaders(
        _ headers: [String: String], to request: inout URLRequest
    ) {
        for (key, value) in headers {
            request.setValue(value, forHTTPHeaderField: key)
        }
    }

    // MARK: - Response Decoding

    func decodeResponse<Response: Decodable>(
        data: Data, responseType: Response.Type, correlationID: String
    ) throws -> Response {
        if responseType == EmptyResponse.self, let empty = EmptyResponse() as? Response {
            return empty
        }
        do {
            return try jsonDecoder.decode(responseType, from: data)
        } catch {
            logger.error("Decoding failed", metadata: [
                "correlationId": correlationID,
                "type": String(describing: responseType),
                "error": error.localizedDescription,
                "bodyPreview": String(data: data.prefix(512), encoding: .utf8) ?? "<non-utf8>",
            ])
            throw APIError.decodingError(underlying: error.localizedDescription)
        }
    }

    func logRateLimitWarningIfNeeded(_ response: HTTPURLResponse) {
        if let remaining = response.value(forHTTPHeaderField: "X-RateLimit-Remaining")
            .flatMap(Int.init), remaining < 10
        {
            let reset = response.value(forHTTPHeaderField: "X-RateLimit-Reset") ?? "unknown"
            logger.warning(
                "API rate limit approaching",
                metadata: ["remaining": "\(remaining)", "reset": reset]
            )
        }
    }
}
