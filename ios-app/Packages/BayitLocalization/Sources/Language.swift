import Foundation
import SwiftUI

/// Supported languages in the Bayit+ application.
///
/// Matches the 10-language set from `@bayit/shared-i18n` to ensure
/// parity between web, mobile, and native iOS platforms.
public enum Language: String, CaseIterable, Codable, Sendable {
    case english = "en"
    case hebrew = "he"
    case spanish = "es"
    case french = "fr"
    case chinese = "zh"
    case italian = "it"
    case hindi = "hi"
    case tamil = "ta"
    case bengali = "bn"
    case japanese = "ja"
    case arabic = "ar"
    case german = "de"
    case portuguese = "pt"

    /// Whether this language is written right-to-left.
    public var isRTL: Bool {
        self == .hebrew || self == .arabic
    }

    /// Human-readable name of the language in its own script.
    public var displayName: String {
        switch self {
        case .english: return "English"
        case .hebrew: return "\u{05E2}\u{05D1}\u{05E8}\u{05D9}\u{05EA}"
        case .spanish: return "Espa\u{00F1}ol"
        case .french: return "Fran\u{00E7}ais"
        case .chinese: return "\u{4E2D}\u{6587}"
        case .italian: return "Italiano"
        case .hindi: return "\u{0939}\u{093F}\u{0928}\u{094D}\u{0926}\u{0940}"
        case .tamil: return "\u{0BA4}\u{0BAE}\u{0BBF}\u{0BB4}\u{0BCD}"
        case .bengali: return "\u{09AC}\u{09BE}\u{0982}\u{09B2}\u{09BE}"
        case .japanese: return "\u{65E5}\u{672C}\u{8A9E}"
        case .arabic: return "\u{0627}\u{0644}\u{0639}\u{0631}\u{0628}\u{064A}\u{0629}"
        case .german: return "Deutsch"
        case .portuguese: return "Portugu\u{00EA}s"
        }
    }

    /// BCP 47 locale identifier for system APIs.
    public var localeIdentifier: String {
        switch self {
        case .english: return "en-US"
        case .hebrew: return "he-IL"
        case .spanish: return "es-ES"
        case .french: return "fr-FR"
        case .chinese: return "zh-CN"
        case .italian: return "it-IT"
        case .hindi: return "hi-IN"
        case .tamil: return "ta-IN"
        case .bengali: return "bn-BD"
        case .japanese: return "ja-JP"
        case .arabic: return "ar-SA"
        case .german: return "de-DE"
        case .portuguese: return "pt-BR"
        }
    }

    /// The Foundation `Locale` corresponding to this language.
    public var locale: Locale {
        Locale(identifier: localeIdentifier)
    }

    /// Emoji flag representing the primary country for this language.
    public var flagEmoji: String {
        switch self {
        case .english: return "\u{1F1FA}\u{1F1F8}"
        case .hebrew: return "\u{1F1EE}\u{1F1F1}"
        case .spanish: return "\u{1F1EA}\u{1F1F8}"
        case .french: return "\u{1F1EB}\u{1F1F7}"
        case .chinese: return "\u{1F1E8}\u{1F1F3}"
        case .italian: return "\u{1F1EE}\u{1F1F9}"
        case .hindi: return "\u{1F1EE}\u{1F1F3}"
        case .tamil: return "\u{1F1EE}\u{1F1F3}"
        case .bengali: return "\u{1F1E7}\u{1F1E9}"
        case .japanese: return "\u{1F1EF}\u{1F1F5}"
        case .arabic: return "\u{1F1F8}\u{1F1E6}"
        case .german: return "\u{1F1E9}\u{1F1EA}"
        case .portuguese: return "\u{1F1E7}\u{1F1F7}"
        }
    }

    /// Layout direction for SwiftUI environments.
    public var layoutDirection: LayoutDirection {
        isRTL ? .rightToLeft : .leftToRight
    }
}
