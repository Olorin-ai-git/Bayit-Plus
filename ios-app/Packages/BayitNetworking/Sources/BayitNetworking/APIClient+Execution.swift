import Foundation

// MARK: - Core Execution Engine (retry loop, error handling)

extension APIClient {

    func executeWithRetry<Body: Encodable & Sendable, Response: Decodable & Sendable>(
        apiRequest: APIRequest<Body>,
        responseType: Response.Type,
        correlationID: String,
        attempt: Int
    ) async throws -> Response {
        do {
            try Task.checkCancellation()

            let urlRequest = try await buildURLRequest(from: apiRequest, correlationID: correlationID)
            let (data, response) = try await session.data(for: urlRequest)

            guard let httpResponse = response as? HTTPURLResponse else {
                throw APIError.networkError(underlying: "Invalid response type")
            }

            let statusCode = httpResponse.statusCode

            logger.debug(
                "Response: \(statusCode) \(apiRequest.path)",
                metadata: [
                    "correlationId": correlationID,
                    "statusCode": "\(statusCode)",
                    "path": apiRequest.path
                ]
            )

            logRateLimitWarningIfNeeded(httpResponse)

            if (200...299).contains(statusCode) {
                return try decodeResponse(data: data, responseType: responseType, correlationID: correlationID)
            }

            if retryPolicy.isRetryable(statusCode: statusCode) && retryPolicy.shouldRetry(attempt: attempt) {
                try await performRetry(
                    statusCode: statusCode, httpResponse: httpResponse,
                    correlationID: correlationID, attempt: attempt, path: apiRequest.path
                )
                return try await executeWithRetry(
                    apiRequest: apiRequest, responseType: responseType,
                    correlationID: correlationID, attempt: attempt + 1
                )
            }

            throw buildTerminalError(
                statusCode: statusCode, data: data, httpResponse: httpResponse,
                correlationID: correlationID, path: apiRequest.path
            )

        } catch is CancellationError {
            throw APIError.cancelled
        } catch let apiError as APIError {
            throw apiError
        } catch let urlError as URLError {
            return try await handleURLError(
                urlError, apiRequest: apiRequest, responseType: responseType,
                correlationID: correlationID, attempt: attempt
            )
        } catch {
            throw APIError.unknown(statusCode: nil, message: error.localizedDescription)
        }
    }

    // MARK: - Retry Helpers

    private func performRetry(
        statusCode: Int, httpResponse: HTTPURLResponse,
        correlationID: String, attempt: Int, path: String
    ) async throws {
        let retryAfterHeader = httpResponse.value(forHTTPHeaderField: "Retry-After")
        let retryDelay = retryPolicy.delay(forAttempt: attempt, retryAfterHeader: retryAfterHeader)

        if statusCode == 429 {
            logger.warning("Rate limited - retry after \(retryDelay)s", metadata: [
                "correlationId": correlationID, "retryCount": "\(attempt + 1)",
                "retryAfter": retryAfterHeader ?? "none"
            ])
        } else {
            logger.info("Retrying request (\(attempt + 1)/\(configuration.maxRetries))", metadata: [
                "correlationId": correlationID, "path": path, "delay": "\(retryDelay)"
            ])
        }

        try await Task.sleep(nanoseconds: UInt64(retryDelay * 1_000_000_000))
    }

    private func buildTerminalError(
        statusCode: Int, data: Data, httpResponse: HTTPURLResponse,
        correlationID: String, path: String
    ) -> APIError {
        var apiError = APIError.fromHTTPStatus(statusCode, body: data)
        if statusCode == 429,
           let header = httpResponse.value(forHTTPHeaderField: "Retry-After"),
           let seconds = TimeInterval(header) {
            apiError = .rateLimited(retryAfter: seconds)
        }
        logger.error("Request failed: \(path)", metadata: [
            "correlationId": correlationID, "statusCode": "\(statusCode)",
            "error": apiError.localizedDescription
        ])
        return apiError
    }

    private func handleURLError<Body: Encodable & Sendable, Response: Decodable & Sendable>(
        _ urlError: URLError, apiRequest: APIRequest<Body>, responseType: Response.Type,
        correlationID: String, attempt: Int
    ) async throws -> Response {
        if isRetryableURLError(urlError) && retryPolicy.shouldRetry(attempt: attempt) {
            let retryDelay = retryPolicy.delay(forAttempt: attempt, retryAfterHeader: nil)
            logger.info("Retrying after network error (\(attempt + 1)/\(configuration.maxRetries))", metadata: [
                "correlationId": correlationID, "path": apiRequest.path,
                "delay": "\(retryDelay)", "error": urlError.localizedDescription
            ])
            try await Task.sleep(nanoseconds: UInt64(retryDelay * 1_000_000_000))
            return try await executeWithRetry(
                apiRequest: apiRequest, responseType: responseType,
                correlationID: correlationID, attempt: attempt + 1
            )
        }
        throw APIError.networkError(underlying: urlError.localizedDescription)
    }

    /// URLError codes that are transient and worth retrying.
    /// Mirrors the web RETRYABLE_ERROR_CODES: ECONNABORTED, ENOTFOUND, ENETUNREACH, ETIMEDOUT
    private func isRetryableURLError(_ error: URLError) -> Bool {
        let retryableCodes: Set<URLError.Code> = [
            .timedOut, .cannotFindHost, .cannotConnectToHost,
            .networkConnectionLost, .notConnectedToInternet
        ]
        return retryableCodes.contains(error.code)
    }
}
