import Foundation

/// Language metadata for subtitle display.
/// Maps ISO 639-1 codes to display names, native names, badge labels, RTL status, and emoji flags.
/// Mirrors the web's `shared/types/subtitle.ts` SUBTITLE_LANGUAGES array.
struct SubtitleLanguageInfo: Sendable {
    let code: String
    let name: String
    let nativeName: String
    let badge: String
    let isRTL: Bool
    let emojiFlag: String
}

enum SubtitleLanguages {

    static let all: [SubtitleLanguageInfo] = [
        SubtitleLanguageInfo(code: "he", name: "Hebrew", nativeName: "\u{05E2}\u{05D1}\u{05E8}\u{05D9}\u{05EA}", badge: "HE", isRTL: true, emojiFlag: "🇮🇱"),
        SubtitleLanguageInfo(code: "en", name: "English", nativeName: "English", badge: "EN", isRTL: false, emojiFlag: "🇺🇸"),
        SubtitleLanguageInfo(code: "es", name: "Spanish", nativeName: "Espa\u{00F1}ol", badge: "ES", isRTL: false, emojiFlag: "🇪🇸"),
        SubtitleLanguageInfo(code: "ar", name: "Arabic", nativeName: "\u{0627}\u{0644}\u{0639}\u{0631}\u{0628}\u{064A}\u{0629}", badge: "AR", isRTL: true, emojiFlag: "🇸🇦"),
        SubtitleLanguageInfo(code: "ru", name: "Russian", nativeName: "\u{0420}\u{0443}\u{0441}\u{0441}\u{043A}\u{0438}\u{0439}", badge: "RU", isRTL: false, emojiFlag: "🇷🇺"),
        SubtitleLanguageInfo(code: "fr", name: "French", nativeName: "Fran\u{00E7}ais", badge: "FR", isRTL: false, emojiFlag: "🇫🇷"),
        SubtitleLanguageInfo(code: "de", name: "German", nativeName: "Deutsch", badge: "DE", isRTL: false, emojiFlag: "🇩🇪"),
        SubtitleLanguageInfo(code: "it", name: "Italian", nativeName: "Italiano", badge: "IT", isRTL: false, emojiFlag: "🇮🇹"),
        SubtitleLanguageInfo(code: "pt", name: "Portuguese", nativeName: "Portugu\u{00EA}s", badge: "PT", isRTL: false, emojiFlag: "🇧🇷"),
        SubtitleLanguageInfo(code: "yi", name: "Yiddish", nativeName: "\u{05D9}\u{05D9}\u{05B4}\u{05D3}\u{05D9}\u{05E9}", badge: "YI", isRTL: true, emojiFlag: "🕎"),
        SubtitleLanguageInfo(code: "zh", name: "Chinese", nativeName: "中文", badge: "ZH", isRTL: false, emojiFlag: "🇨🇳"),
        SubtitleLanguageInfo(code: "ja", name: "Japanese", nativeName: "日本語", badge: "JA", isRTL: false, emojiFlag: "🇯🇵"),
        SubtitleLanguageInfo(code: "ko", name: "Korean", nativeName: "한국어", badge: "KO", isRTL: false, emojiFlag: "🇰🇷"),
        SubtitleLanguageInfo(code: "hi", name: "Hindi", nativeName: "हिन्दी", badge: "HI", isRTL: false, emojiFlag: "🇮🇳"),
        SubtitleLanguageInfo(code: "tr", name: "Turkish", nativeName: "Türkçe", badge: "TR", isRTL: false, emojiFlag: "🇹🇷"),
        SubtitleLanguageInfo(code: "pl", name: "Polish", nativeName: "Polski", badge: "PL", isRTL: false, emojiFlag: "🇵🇱"),
        SubtitleLanguageInfo(code: "nl", name: "Dutch", nativeName: "Nederlands", badge: "NL", isRTL: false, emojiFlag: "🇳🇱"),
        SubtitleLanguageInfo(code: "sv", name: "Swedish", nativeName: "Svenska", badge: "SV", isRTL: false, emojiFlag: "🇸🇪"),
        SubtitleLanguageInfo(code: "no", name: "Norwegian", nativeName: "Norsk", badge: "NO", isRTL: false, emojiFlag: "🇳🇴"),
        SubtitleLanguageInfo(code: "da", name: "Danish", nativeName: "Dansk", badge: "DA", isRTL: false, emojiFlag: "🇩🇰"),
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

    /// Returns the emoji flag for a given language code, or a generic globe emoji as fallback.
    static func emojiFlag(for code: String) -> String {
        lookup[code]?.emojiFlag ?? "🌐"
    }
}
