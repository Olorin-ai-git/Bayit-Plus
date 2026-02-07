import Foundation
import OSLog

/// Structured logging service for Bayit+
/// All logging goes through this system - no direct print/console usage
public struct BayitLogger: Sendable {
    private let logger: os.Logger
    private let subsystem: String
    private let category: String

    public init(category: String) {
        let subsystem = Bundle.main.bundleIdentifier ?? "tv.bayit.plus"
        self.subsystem = subsystem
        self.category = category
        self.logger = os.Logger(subsystem: subsystem, category: category)
    }

    public func debug(
        _ message: String,
        context: [String: String] = [:],
        file: String = #file,
        function: String = #function,
        line: Int = #line
    ) {
        let formatted = Self.format(
            message, context: context,
            file: file, function: function, line: line
        )
        logger.debug("\(formatted, privacy: .public)")
    }

    public func info(
        _ message: String,
        context: [String: String] = [:],
        file: String = #file,
        function: String = #function,
        line: Int = #line
    ) {
        let formatted = Self.format(
            message, context: context,
            file: file, function: function, line: line
        )
        logger.info("\(formatted, privacy: .public)")
    }

    public func warning(
        _ message: String,
        context: [String: String] = [:],
        file: String = #file,
        function: String = #function,
        line: Int = #line
    ) {
        let formatted = Self.format(
            message, context: context,
            file: file, function: function, line: line
        )
        logger.warning("\(formatted, privacy: .public)")
    }

    public func error(
        _ message: String,
        error: Error? = nil,
        context: [String: String] = [:],
        file: String = #file,
        function: String = #function,
        line: Int = #line
    ) {
        var ctx = context
        if let error {
            ctx["error"] = error.localizedDescription
            ctx["errorType"] = String(describing: type(of: error))
        }
        let formatted = Self.format(
            message, context: ctx,
            file: file, function: function, line: line
        )
        logger.error("\(formatted, privacy: .public)")
    }

    public func critical(
        _ message: String,
        error: Error? = nil,
        context: [String: String] = [:],
        file: String = #file,
        function: String = #function,
        line: Int = #line
    ) {
        var ctx = context
        if let error {
            ctx["error"] = error.localizedDescription
            ctx["errorType"] = String(describing: type(of: error))
        }
        let formatted = Self.format(
            message, context: ctx,
            file: file, function: function, line: line
        )
        logger.critical("\(formatted, privacy: .public)")
    }

    private static func format(
        _ message: String,
        context: [String: String],
        file: String,
        function: String,
        line: Int
    ) -> String {
        let fileName = URL(fileURLWithPath: file).lastPathComponent
        var parts = ["\(fileName):\(line) \(function) - \(message)"]

        if !context.isEmpty {
            let contextStr = context
                .sorted(by: { $0.key < $1.key })
                .map { "\($0.key)=\($0.value)" }
                .joined(separator: ", ")
            parts.append("[\(contextStr)]")
        }

        return parts.joined(separator: " ")
    }
}
