import Foundation

/// Generates unique correlation IDs for request tracing
public enum CorrelationID: Sendable {
    /// Generate a new correlation ID
    public static func generate() -> String {
        UUID().uuidString.lowercased()
    }
}
