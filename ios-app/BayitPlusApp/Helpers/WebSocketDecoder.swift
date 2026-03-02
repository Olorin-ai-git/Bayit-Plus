import Foundation

enum WebSocketDecoder {
    static let shared: JSONDecoder = {
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        decoder.dateDecodingStrategy = .custom(decodePythonDate)
        return decoder
    }()

    /// Handles all Python datetime formats: with/without Z, with/without fractional seconds.
    private static func decodePythonDate(from decoder: Decoder) throws -> Date {
        let container = try decoder.singleValueContainer()
        let raw = try container.decode(String.self)

        let withFractional = ISO8601DateFormatter()
        withFractional.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = withFractional.date(from: raw) { return date }

        let standard = ISO8601DateFormatter()
        standard.formatOptions = [.withInternetDateTime]
        if let date = standard.date(from: raw) { return date }

        var normalized = raw
        if let dotIndex = normalized.firstIndex(of: ".") {
            normalized = String(normalized[..<dotIndex])
        }
        if !normalized.hasSuffix("Z"), !normalized.contains("+") {
            normalized += "Z"
        }
        if let date = standard.date(from: normalized) { return date }

        throw DecodingError.dataCorruptedError(
            in: container, debugDescription: "Cannot decode date: \(raw)"
        )
    }
}
