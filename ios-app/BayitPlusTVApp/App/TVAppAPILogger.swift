import BayitCore
import BayitNetworking
import Foundation

/// Bridges `BayitCore.BayitLogger` to `BayitNetworking.APILogger` for the tvOS app.
struct TVAppAPILogger: APILogger {

    private let logger = BayitLogger(category: "Networking")

    func log(
        level: APILogLevel,
        message: String,
        metadata: [String: String],
        file: String,
        function: String,
        line: UInt
    ) {
        let context = metadata.map { "\($0.key)=\($0.value)" }.joined(separator: " ")
        let formatted = context.isEmpty ? message : "\(message) [\(context)]"

        let intLine = Int(line)

        switch level {
        case .debug:
            logger.debug(formatted, file: file, function: function, line: intLine)
        case .info:
            logger.info(formatted, file: file, function: function, line: intLine)
        case .warning:
            logger.warning(formatted, file: file, function: function, line: intLine)
        case .error:
            logger.error(formatted, file: file, function: function, line: intLine)
        }
    }
}
