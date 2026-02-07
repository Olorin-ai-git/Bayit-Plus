import Foundation

/// Log severity levels for structured networking logs.
public enum APILogLevel: Int, Sendable, Comparable {
    case debug = 0
    case info = 1
    case warning = 2
    case error = 3

    public static func < (lhs: APILogLevel, rhs: APILogLevel) -> Bool {
        lhs.rawValue < rhs.rawValue
    }
}

/// Protocol for structured logging from the networking layer.
///
/// Consumers inject their own implementation (e.g. OSLog, Sentry, custom)
/// so the networking package never calls `print` or `NSLog` directly.
public protocol APILogger: Sendable {

    /// Log a message with structured metadata.
    ///
    /// - Parameters:
    ///   - level: Severity of the log entry.
    ///   - message: Human-readable description.
    ///   - metadata: Key-value pairs for structured context (correlation IDs, URLs, status codes).
    ///   - file: Source file originating the log (auto-filled).
    ///   - function: Source function originating the log (auto-filled).
    ///   - line: Source line originating the log (auto-filled).
    func log(
        level: APILogLevel,
        message: String,
        metadata: [String: String],
        file: String,
        function: String,
        line: UInt
    )
}

// MARK: - Convenience Extensions

public extension APILogger {

    func debug(
        _ message: String,
        metadata: [String: String] = [:],
        file: String = #file,
        function: String = #function,
        line: UInt = #line
    ) {
        log(level: .debug, message: message, metadata: metadata, file: file, function: function, line: line)
    }

    func info(
        _ message: String,
        metadata: [String: String] = [:],
        file: String = #file,
        function: String = #function,
        line: UInt = #line
    ) {
        log(level: .info, message: message, metadata: metadata, file: file, function: function, line: line)
    }

    func warning(
        _ message: String,
        metadata: [String: String] = [:],
        file: String = #file,
        function: String = #function,
        line: UInt = #line
    ) {
        log(level: .warning, message: message, metadata: metadata, file: file, function: function, line: line)
    }

    func error(
        _ message: String,
        metadata: [String: String] = [:],
        file: String = #file,
        function: String = #function,
        line: UInt = #line
    ) {
        log(level: .error, message: message, metadata: metadata, file: file, function: function, line: line)
    }
}
