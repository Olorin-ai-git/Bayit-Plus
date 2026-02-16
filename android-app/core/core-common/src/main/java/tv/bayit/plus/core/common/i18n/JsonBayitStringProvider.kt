package tv.bayit.plus.core.common.i18n

import android.content.Context
import android.content.SharedPreferences
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import tv.bayit.plus.core.common.logging.BayitLogger

/**
 * Loads translations from @olorin/shared-i18n JSON locale files bundled in assets/locales/.
 *
 * Supports dot-separated keys (e.g. "player.subtitles.loading") resolved by walking
 * the nested JSON structure. Falls back to the English locale, then to the raw key.
 */
class JsonBayitStringProvider(
    private val context: Context,
    private val logger: BayitLogger,
    private val prefs: SharedPreferences,
) : BayitStringProvider {

    private val json = Json { ignoreUnknownKeys = true; isLenient = true }

    private var activeLocale: JsonObject = JsonObject(emptyMap())
    private var fallbackLocale: JsonObject = JsonObject(emptyMap())
    private var _currentLanguage: String = prefs.getString(PREF_KEY, DEFAULT_LANGUAGE) ?: DEFAULT_LANGUAGE

    override val currentLanguage: String get() = _currentLanguage

    override val supportedLanguages: List<String> = SUPPORTED_LANGUAGES

    init {
        fallbackLocale = loadLocaleFile(DEFAULT_LANGUAGE)
        activeLocale = if (_currentLanguage == DEFAULT_LANGUAGE) {
            fallbackLocale
        } else {
            loadLocaleFile(_currentLanguage)
        }
    }

    override fun string(key: String): String = resolve(key)

    override fun string(key: String, params: Map<String, String>): String {
        var result = resolve(key)
        params.forEach { (param, value) ->
            result = result.replace("{{$param}}", value)
        }
        return result
    }

    override suspend fun setLanguage(languageCode: String) {
        if (languageCode == _currentLanguage) return
        if (languageCode !in SUPPORTED_LANGUAGES) {
            logger.warning("Unsupported language: $languageCode", mapOf("supported" to SUPPORTED_LANGUAGES.toString()))
            return
        }
        _currentLanguage = languageCode
        prefs.edit().putString(PREF_KEY, languageCode).apply()
        activeLocale = if (languageCode == DEFAULT_LANGUAGE) {
            fallbackLocale
        } else {
            loadLocaleFile(languageCode)
        }
        logger.info("Language changed", mapOf("language" to languageCode))
    }

    private fun resolve(key: String): String {
        return resolveFromObject(activeLocale, key)
            ?: resolveFromObject(fallbackLocale, key)
            ?: key
    }

    private fun resolveFromObject(root: JsonObject, key: String): String? {
        val parts = key.split(".")
        var current: JsonElement = root
        for (part in parts) {
            current = (current as? JsonObject)?.get(part) ?: return null
        }
        return (current as? JsonPrimitive)?.content
    }

    private fun loadLocaleFile(languageCode: String): JsonObject {
        return try {
            val text = context.assets.open("locales/$languageCode.json")
                .bufferedReader().use { it.readText() }
            json.parseToJsonElement(text).jsonObject
        } catch (e: Exception) {
            logger.error("Failed to load locale: $languageCode", e)
            JsonObject(emptyMap())
        }
    }

    companion object {
        private const val PREF_KEY = "@olorin_language"
        private const val DEFAULT_LANGUAGE = "en"
        val SUPPORTED_LANGUAGES = listOf("he", "en", "es", "zh", "fr", "it", "hi", "ta", "bn", "ja")
    }
}
