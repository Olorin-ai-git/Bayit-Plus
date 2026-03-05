import Foundation

// MARK: - Dynamic JSON Support

private struct DynamicJSON: Encodable {
    let dict: [String: Any]
    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: DynamicKey.self)
        for (key, value) in dict {
            guard let dynamicKey = DynamicKey(stringValue: key) else { continue }
            if let string = value as? String {
                try container.encode(string, forKey: dynamicKey)
            } else if let int = value as? Int {
                try container.encode(int, forKey: dynamicKey)
            } else if let double = value as? Double {
                try container.encode(double, forKey: dynamicKey)
            } else if let bool = value as? Bool {
                try container.encode(bool, forKey: dynamicKey)
            } else if let dict = value as? [String: Any] {
                try container.encode(DynamicJSON(dict: dict), forKey: dynamicKey)
            } else if let array = value as? [Any] {
                try container.encode(DynamicArray(array: array), forKey: dynamicKey)
            }
        }
    }
}

private struct DynamicArray: Encodable {
    let array: [Any]
    func encode(to encoder: Encoder) throws {
        var container = encoder.unkeyedContainer()
        for value in array {
            if let string = value as? String {
                try container.encode(string)
            } else if let int = value as? Int {
                try container.encode(int)
            } else if let double = value as? Double {
                try container.encode(double)
            } else if let bool = value as? Bool {
                try container.encode(bool)
            } else if let dict = value as? [String: Any] {
                try container.encode(DynamicJSON(dict: dict))
            } else if let array = value as? [Any] {
                try container.encode(DynamicArray(array: array))
            }
        }
    }
}

private struct DynamicKey: CodingKey {
    var stringValue: String
    var intValue: Int? {
        nil
    }

    init?(stringValue: String) {
        self.stringValue = stringValue
    }

    init?(intValue _: Int) {
        nil
    }
}

struct RawDataBody: Encodable, Sendable, RawBodyProvider {
    let data: Data
    var rawData: Data {
        data
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        try container.encode(data)
    }
}

protocol RawBodyProvider {
    var rawData: Data { get }
}

// MARK: - Convenience HTTP Methods

public extension APIClient {
    /// GET request returning decoded model.
    func get<Response: Decodable & Sendable>(
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
        return try await request(apiRequest, as: responseType)
    }

    /// POST request with body, returning decoded model.
    func post<Body: Encodable & Sendable, Response: Decodable & Sendable>(
        _ path: String,
        body: Body,
        queryItems: [URLQueryItem] = [],
        headers: [String: String] = [:],
        timeout: TimeInterval? = nil,
        as responseType: Response.Type
    ) async throws -> Response {
        let apiRequest = APIRequest(
            path: path,
            method: .post,
            queryItems: queryItems,
            body: body,
            headers: headers,
            timeoutInterval: timeout
        )
        return try await request(apiRequest, as: responseType)
    }

    /// PUT request with body, returning decoded model.
    func put<Body: Encodable & Sendable, Response: Decodable & Sendable>(
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
        return try await request(apiRequest, as: responseType)
    }

    /// DELETE request returning decoded model.
    func delete<Response: Decodable & Sendable>(
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
        return try await request(apiRequest, as: responseType)
    }

    /// PATCH request with body, returning decoded model.
    func patch<Body: Encodable & Sendable, Response: Decodable & Sendable>(
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
        return try await request(apiRequest, as: responseType)
    }

    /// POST request with raw JSON dictionary body, returning decoded model.
    /// Use this for dynamic payloads that can't be represented as Codable structs.
    func postJSON<Response: Decodable & Sendable>(
        _ path: String,
        body: [String: Any],
        queryItems: [URLQueryItem] = [],
        headers: [String: String] = [:],
        as responseType: Response.Type
    ) async throws -> Response {
        let apiRequest = APIRequest(
            path: path,
            method: .post,
            queryItems: queryItems,
            body: DynamicJSON(dict: body),
            headers: headers
        )
        return try await request(apiRequest, as: responseType)
    }

    /// POST request with raw Data body and custom content type.
    /// Use this for multipart/form-data or other binary uploads.
    func postRaw<Response: Decodable & Sendable>(
        _ path: String,
        body: Data,
        contentType: String,
        queryItems: [URLQueryItem] = [],
        headers: [String: String] = [:],
        as responseType: Response.Type
    ) async throws -> Response {
        var finalHeaders = headers
        finalHeaders["Content-Type"] = contentType
        let apiRequest = APIRequest(
            path: path,
            method: .post,
            queryItems: queryItems,
            body: RawDataBody(data: body),
            headers: finalHeaders
        )
        return try await request(apiRequest, as: responseType)
    }

    /// PATCH request with raw Data body and custom content type.
    /// Use this for multipart/form-data or other binary uploads.
    func patchRaw<Response: Decodable & Sendable>(
        _ path: String,
        body: Data,
        contentType: String,
        queryItems: [URLQueryItem] = [],
        headers: [String: String] = [:],
        as responseType: Response.Type
    ) async throws -> Response {
        var finalHeaders = headers
        finalHeaders["Content-Type"] = contentType
        let apiRequest = APIRequest(
            path: path,
            method: .patch,
            queryItems: queryItems,
            body: RawDataBody(data: body),
            headers: finalHeaders
        )
        return try await request(apiRequest, as: responseType)
    }
}
