import Foundation
import UIKit

// MARK: - String Extensions

extension String {
    /// Truncate string to maximum length
    func truncated(to length: Int, trailing: String = "...") -> String {
        if self.count > length {
            return String(self.prefix(length)) + trailing
        }
        return self
    }

    /// Convert string to Data using UTF-8 encoding
    var data: Data? {
        self.data(using: .utf8)
    }
}

// MARK: - Data Extensions

extension Data {
    /// Convert Data to base64-encoded string
    func toBase64() -> String {
        self.base64EncodedString()
    }

    /// Create Data from base64-encoded string
    init?(base64: String) {
        guard let data = Data(base64Encoded: base64) else {
            return nil
        }
        self = data
    }
}

// MARK: - Bundle Extensions

extension Bundle {
    /// Read API key from Info.plist
    func apiKey(for key: String) -> String? {
        object(forInfoDictionaryKey: key) as? String
    }

    /// OpenAI API Key
    var openAIAPIKey: String? {
        apiKey(for: "OPENAI_API_KEY")
    }

    /// ElevenLabs API Key
    var elevenLabsAPIKey: String? {
        apiKey(for: "ELEVENLABS_API_KEY")
    }
}

// MARK: - UIDevice Extensions

extension UIDevice {
    /// Get device model identifier
    var modelIdentifier: String {
        var systemInfo = utsname()
        uname(&systemInfo)
        let machineMirror = Mirror(reflecting: systemInfo.machine)
        let identifier = machineMirror.children.reduce("") { identifier, element in
            guard let value = element.value as? Int8, value != 0 else { return identifier }
            return identifier + String(UnicodeScalar(UInt8(value)))
        }
        return identifier
    }

    /// Check if device supports Action Button
    var supportsActionButton: Bool {
        let proModels = [
            "iPhone15,2",  // iPhone 15 Pro
            "iPhone15,3",  // iPhone 15 Pro Max
            "iPhone16,1",  // iPhone 16 Pro
            "iPhone16,2"   // iPhone 16 Pro Max
        ]
        return proModels.contains(modelIdentifier)
    }

    /// Get user-friendly device name
    var modelName: String {
        switch modelIdentifier {
        case "iPhone15,2": return "iPhone 15 Pro"
        case "iPhone15,3": return "iPhone 15 Pro Max"
        case "iPhone16,1": return "iPhone 16 Pro"
        case "iPhone16,2": return "iPhone 16 Pro Max"
        default: return "iPhone"
        }
    }
}

// MARK: - Color Extensions

extension UIColor {
    /// Hex string to UIColor
    convenience init?(hex: String) {
        let r, g, b, a: CGFloat

        var hexSanitized = hex.trimmingCharacters(in: .whitespacesAndNewlines)
        hexSanitized = hexSanitized.replacingOccurrences(of: "#", with: "")

        var hexValue: UInt64 = 0
        guard Scanner(string: hexSanitized).scanHexInt64(&hexValue) else {
            return nil
        }

        switch hexSanitized.count {
        case 6:
            r = CGFloat((hexValue & 0xFF0000) >> 16) / 255.0
            g = CGFloat((hexValue & 0x00FF00) >> 8) / 255.0
            b = CGFloat(hexValue & 0x0000FF) / 255.0
            a = 1.0
        case 8:
            r = CGFloat((hexValue & 0xFF000000) >> 24) / 255.0
            g = CGFloat((hexValue & 0x00FF0000) >> 16) / 255.0
            b = CGFloat((hexValue & 0x0000FF00) >> 8) / 255.0
            a = CGFloat(hexValue & 0x000000FF) / 255.0
        default:
            return nil
        }

        self.init(red: r, green: g, blue: b, alpha: a)
    }
}
