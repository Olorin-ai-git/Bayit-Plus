import Foundation

/// Extensions for base64URL encoding/decoding as required by WebAuthn spec.
extension Data {
    /// Encodes Data to base64URL format (RFC 4648 section 5).
    ///
    /// Base64URL replaces + with - and / with _, and omits padding (=).
    func base64URLEncodedString() -> String {
        return base64EncodedString()
            .replacingOccurrences(of: "+", with: "-")
            .replacingOccurrences(of: "/", with: "_")
            .replacingOccurrences(of: "=", with: "")
    }

    /// Decodes a base64URL-encoded string to Data.
    ///
    /// - Parameter base64URLString: base64URL-encoded string
    /// - Returns: Decoded Data, or nil if invalid
    init?(base64URLEncoded base64URLString: String) {
        var base64 = base64URLString
            .replacingOccurrences(of: "-", with: "+")
            .replacingOccurrences(of: "_", with: "/")

        // Add padding if needed
        let remainder = base64.count % 4
        if remainder > 0 {
            base64.append(String(repeating: "=", count: 4 - remainder))
        }

        self.init(base64Encoded: base64)
    }
}
