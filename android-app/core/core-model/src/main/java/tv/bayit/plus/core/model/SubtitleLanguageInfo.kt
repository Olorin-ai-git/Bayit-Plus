package tv.bayit.plus.core.model

/**
 * Language metadata for subtitle display.
 * Maps ISO 639-1 codes to display names, native names, badge labels, and RTL status.
 * Mirrors the web's shared/types/subtitle.ts SUBTITLE_LANGUAGES array.
 */
data class SubtitleLanguageInfo(
    val code: String,
    val name: String,
    val nativeName: String,
    val badge: String,
    val isRTL: Boolean,
)

object SubtitleLanguages {

    val all: List<SubtitleLanguageInfo> = listOf(
        SubtitleLanguageInfo("he", "Hebrew", "\u05E2\u05D1\u05E8\u05D9\u05EA", "HE", true),
        SubtitleLanguageInfo("en", "English", "English", "EN", false),
        SubtitleLanguageInfo("es", "Spanish", "Espa\u00F1ol", "ES", false),
        SubtitleLanguageInfo("ar", "Arabic", "\u0627\u0644\u0639\u0631\u0628\u064A\u0629", "AR", true),
        SubtitleLanguageInfo("ru", "Russian", "\u0420\u0443\u0441\u0441\u043A\u0438\u0439", "RU", false),
        SubtitleLanguageInfo("fr", "French", "Fran\u00E7ais", "FR", false),
        SubtitleLanguageInfo("de", "German", "Deutsch", "DE", false),
        SubtitleLanguageInfo("it", "Italian", "Italiano", "IT", false),
        SubtitleLanguageInfo("pt", "Portuguese", "Portugu\u00EAs", "PT", false),
        SubtitleLanguageInfo("yi", "Yiddish", "\u05D9\u05D9\u05B4\u05D3\u05D9\u05E9", "YI", true),
        SubtitleLanguageInfo("zh", "Chinese", "\u4E2D\u6587", "ZH", false),
        SubtitleLanguageInfo("ja", "Japanese", "\u65E5\u672C\u8A9E", "JA", false),
        SubtitleLanguageInfo("ko", "Korean", "\uD55C\uAD6D\uC5B4", "KO", false),
        SubtitleLanguageInfo("hi", "Hindi", "\u0939\u093F\u0928\u094D\u0926\u0940", "HI", false),
        SubtitleLanguageInfo("tr", "Turkish", "T\u00FCrk\u00E7e", "TR", false),
        SubtitleLanguageInfo("pl", "Polish", "Polski", "PL", false),
        SubtitleLanguageInfo("nl", "Dutch", "Nederlands", "NL", false),
        SubtitleLanguageInfo("sv", "Swedish", "Svenska", "SV", false),
        SubtitleLanguageInfo("no", "Norwegian", "Norsk", "NO", false),
        SubtitleLanguageInfo("da", "Danish", "Dansk", "DA", false),
    )

    private val lookup: Map<String, SubtitleLanguageInfo> by lazy {
        all.associateBy { it.code }
    }

    /** Returns language info for a given ISO 639-1 code, or null if unknown. */
    fun info(code: String): SubtitleLanguageInfo? = lookup[code]

    /** Returns the badge label for a given language code, or the code uppercased as fallback. */
    fun badge(code: String): String = lookup[code]?.badge ?: code.uppercase()
}
