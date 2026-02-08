import Foundation

/// Language metadata for subtitle display.
/// Maps ISO 639-1 codes to display names, native names, country flag strings, and RTL status.
/// Mirrors the web's `shared/types/subtitle.ts` SUBTITLE_LANGUAGES array.
struct SubtitleLanguageInfo: Sendable {
    let code: String
    let name: String
    let nativeName: String
    let flag: String
    let isRTL: Bool
}

enum SubtitleLanguages {

    static let all: [SubtitleLanguageInfo] = [
        SubtitleLanguageInfo(code: "he", name: "Hebrew", nativeName: "\u{05E2}\u{05D1}\u{05E8}\u{05D9}\u{05EA}", flag: "\u{1F1EE}\u{1F1F1}", isRTL: true),
        SubtitleLanguageInfo(code: "en", name: "English", nativeName: "English", flag: "\u{1F1FA}\u{1F1F8}", isRTL: false),
        SubtitleLanguageInfo(code: "es", name: "Spanish", nativeName: "Espa\u{00F1}ol", flag: "\u{1F1EA}\u{1F1F8}", isRTL: false),
        SubtitleLanguageInfo(code: "ar", name: "Arabic", nativeName: "\u{0627}\u{0644}\u{0639}\u{0631}\u{0628}\u{064A}\u{0629}", flag: "\u{1F1F8}\u{1F1E6}", isRTL: true),
        SubtitleLanguageInfo(code: "ru", name: "Russian", nativeName: "\u{0420}\u{0443}\u{0441}\u{0441}\u{043A}\u{0438}\u{0439}", flag: "\u{1F1F7}\u{1F1FA}", isRTL: false),
        SubtitleLanguageInfo(code: "fr", name: "French", nativeName: "Fran\u{00E7}ais", flag: "\u{1F1EB}\u{1F1F7}", isRTL: false),
        SubtitleLanguageInfo(code: "de", name: "German", nativeName: "Deutsch", flag: "\u{1F1E9}\u{1F1EA}", isRTL: false),
        SubtitleLanguageInfo(code: "it", name: "Italian", nativeName: "Italiano", flag: "\u{1F1EE}\u{1F1F9}", isRTL: false),
        SubtitleLanguageInfo(code: "pt", name: "Portuguese", nativeName: "Portugu\u{00EA}s", flag: "\u{1F1F5}\u{1F1F9}", isRTL: false),
        SubtitleLanguageInfo(code: "yi", name: "Yiddish", nativeName: "\u{05D9}\u{05D9}\u{05B4}\u{05D3}\u{05D9}\u{05E9}", flag: "\u{1F54D}", isRTL: true),
    ]

    private static let lookup: [String: SubtitleLanguageInfo] = {
        Dictionary(uniqueKeysWithValues: all.map { ($0.code, $0) })
    }()

    /// Returns language info for a given ISO 639-1 code, or nil if unknown.
    static func info(for code: String) -> SubtitleLanguageInfo? {
        lookup[code]
    }

    /// Returns the flag string for a given language code, or the code itself as fallback.
    static func flag(for code: String) -> String {
        lookup[code]?.flag ?? code.uppercased()
    }
}
