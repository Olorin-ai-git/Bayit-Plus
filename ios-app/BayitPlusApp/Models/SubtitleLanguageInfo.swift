import Foundation

/// Language metadata for subtitle display.
/// Maps ISO 639-1 codes to display names, native names, badge labels, and RTL status.
/// Mirrors the web's `shared/types/subtitle.ts` SUBTITLE_LANGUAGES array.
struct SubtitleLanguageInfo: Sendable {
    let code: String
    let name: String
    let nativeName: String
    let badge: String
    let isRTL: Bool
}

enum SubtitleLanguages {

    static let all: [SubtitleLanguageInfo] = [
        SubtitleLanguageInfo(code: "he", name: "Hebrew", nativeName: "\u{05E2}\u{05D1}\u{05E8}\u{05D9}\u{05EA}", badge: "HE", isRTL: true),
        SubtitleLanguageInfo(code: "en", name: "English", nativeName: "English", badge: "EN", isRTL: false),
        SubtitleLanguageInfo(code: "es", name: "Spanish", nativeName: "Espa\u{00F1}ol", badge: "ES", isRTL: false),
        SubtitleLanguageInfo(code: "ar", name: "Arabic", nativeName: "\u{0627}\u{0644}\u{0639}\u{0631}\u{0628}\u{064A}\u{0629}", badge: "AR", isRTL: true),
        SubtitleLanguageInfo(code: "ru", name: "Russian", nativeName: "\u{0420}\u{0443}\u{0441}\u{0441}\u{043A}\u{0438}\u{0439}", badge: "RU", isRTL: false),
        SubtitleLanguageInfo(code: "fr", name: "French", nativeName: "Fran\u{00E7}ais", badge: "FR", isRTL: false),
        SubtitleLanguageInfo(code: "de", name: "German", nativeName: "Deutsch", badge: "DE", isRTL: false),
        SubtitleLanguageInfo(code: "it", name: "Italian", nativeName: "Italiano", badge: "IT", isRTL: false),
        SubtitleLanguageInfo(code: "pt", name: "Portuguese", nativeName: "Portugu\u{00EA}s", badge: "PT", isRTL: false),
        SubtitleLanguageInfo(code: "yi", name: "Yiddish", nativeName: "\u{05D9}\u{05D9}\u{05B4}\u{05D3}\u{05D9}\u{05E9}", badge: "YI", isRTL: true),
    ]

    private static let lookup: [String: SubtitleLanguageInfo] = {
        Dictionary(uniqueKeysWithValues: all.map { ($0.code, $0) })
    }()

    /// Returns language info for a given ISO 639-1 code, or nil if unknown.
    static func info(for code: String) -> SubtitleLanguageInfo? {
        lookup[code]
    }

    /// Returns the badge label for a given language code, or the code itself as fallback.
    static func flag(for code: String) -> String {
        lookup[code]?.badge ?? code.uppercased()
    }
}
