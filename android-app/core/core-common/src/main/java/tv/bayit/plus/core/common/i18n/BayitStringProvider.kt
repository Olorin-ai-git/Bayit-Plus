package tv.bayit.plus.core.common.i18n

import kotlinx.coroutines.flow.StateFlow

/** Provides localized strings from the @olorin/shared-i18n JSON locale files. */
interface BayitStringProvider {

    /** Returns the localized string for [key] (dot-separated, e.g. "player.loading"). */
    fun string(key: String): String

    /** Returns the localized string with parameter interpolation ({{param}} syntax). */
    fun string(key: String, params: Map<String, String>): String

    /** Returns the current language code (e.g. "en", "he"). */
    val currentLanguage: String

    /**
     * Observable language code. Emits a new value every time [setLanguage] succeeds.
     * Compose can collect this to trigger recomposition when the locale changes.
     */
    val languageState: StateFlow<String>

    /** Changes the active language. Reloads locale data. */
    suspend fun setLanguage(languageCode: String)

    /** Returns all supported language codes. */
    val supportedLanguages: List<String>
}
