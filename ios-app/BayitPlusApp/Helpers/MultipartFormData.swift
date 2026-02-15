import BayitNetworking
import Foundation

extension Data {
    mutating func appendMultipart(name: String, value: String, boundary: String) {
        let field = "--\(boundary)\r\nContent-Disposition: form-data; name=\"\(name)\"\r\n\r\n\(value)\r\n"
        guard let fieldData = field.data(using: .utf8) else { return }
        append(fieldData)
    }

    mutating func appendMultipartFile(name: String, filename: String, mimeType: String, data: Data, boundary: String) {
        let header = "--\(boundary)\r\nContent-Disposition: form-data; name=\"\(name)\"; filename=\"\(filename)\"\r\nContent-Type: \(mimeType)\r\n\r\n"
        guard let headerData = header.data(using: .utf8),
              let lineBreak = "\r\n".data(using: .utf8) else { return }
        append(headerData)
        append(data)
        append(lineBreak)
    }
}

/// Extension to provide user-friendly error handling for ViewModels
extension Error {

    /// Check if this error is a cancellation error (expected behavior, not a real error)
    var isCancellation: Bool {
        // Check for CancellationError (Swift concurrency)
        if self is CancellationError {
            return true
        }

        // Check for APIError.cancelled (networking layer wraps CancellationError)
        if let apiError = self as? APIError, apiError == .cancelled {
            return true
        }

        // Check for URLError.cancelled
        if let urlError = self as? URLError, urlError.code == .cancelled {
            return true
        }

        // Check for NSError with cancelled domain
        let nsError = self as NSError
        if nsError.domain == NSURLErrorDomain && nsError.code == NSURLErrorCancelled {
            return true
        }

        return false
    }

    /// Get a user-friendly error message, or nil if this is a cancellation error that shouldn't be shown
    var userFriendlyMessage: String? {
        // Don't show cancellation errors - they're expected when users navigate away
        guard !isCancellation else {
            return nil
        }

        // Return the localized description for real errors
        return localizedDescription
    }
}
