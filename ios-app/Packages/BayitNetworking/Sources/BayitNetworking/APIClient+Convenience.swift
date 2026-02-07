import Foundation

// MARK: - Convenience HTTP Methods

extension APIClient {

    /// GET request returning decoded model.
    public func get<Response: Decodable & Sendable>(
        _ path: String,
        queryItems: [URLQueryItem] = [],
        headers: [String: String] = [:],
        as responseType: Response.Type
    ) async throws -> Response {
        let apiRequest = EmptyRequest(
            path: path,
            method: .get,
            queryItems: queryItems,
            headers: headers
        )
        return try await self.request(apiRequest, as: responseType)
    }

    /// POST request with body, returning decoded model.
    public func post<Body: Encodable & Sendable, Response: Decodable & Sendable>(
        _ path: String,
        body: Body,
        queryItems: [URLQueryItem] = [],
        headers: [String: String] = [:],
        as responseType: Response.Type
    ) async throws -> Response {
        let apiRequest = APIRequest(
            path: path,
            method: .post,
            queryItems: queryItems,
            body: body,
            headers: headers
        )
        return try await self.request(apiRequest, as: responseType)
    }

    /// PUT request with body, returning decoded model.
    public func put<Body: Encodable & Sendable, Response: Decodable & Sendable>(
        _ path: String,
        body: Body,
        queryItems: [URLQueryItem] = [],
        headers: [String: String] = [:],
        as responseType: Response.Type
    ) async throws -> Response {
        let apiRequest = APIRequest(
            path: path,
            method: .put,
            queryItems: queryItems,
            body: body,
            headers: headers
        )
        return try await self.request(apiRequest, as: responseType)
    }

    /// DELETE request returning decoded model.
    public func delete<Response: Decodable & Sendable>(
        _ path: String,
        queryItems: [URLQueryItem] = [],
        headers: [String: String] = [:],
        as responseType: Response.Type
    ) async throws -> Response {
        let apiRequest = EmptyRequest(
            path: path,
            method: .delete,
            queryItems: queryItems,
            headers: headers
        )
        return try await self.request(apiRequest, as: responseType)
    }

    /// PATCH request with body, returning decoded model.
    public func patch<Body: Encodable & Sendable, Response: Decodable & Sendable>(
        _ path: String,
        body: Body,
        queryItems: [URLQueryItem] = [],
        headers: [String: String] = [:],
        as responseType: Response.Type
    ) async throws -> Response {
        let apiRequest = APIRequest(
            path: path,
            method: .patch,
            queryItems: queryItems,
            body: body,
            headers: headers
        )
        return try await self.request(apiRequest, as: responseType)
    }
}
