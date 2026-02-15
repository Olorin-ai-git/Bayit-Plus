package tv.bayit.plus.core.testing

import tv.bayit.plus.core.common.BayitResult

/**
 * Fake implementation of SettingsRepository for testing.
 */
class FakeSettingsRepository {

    private val settings = mutableMapOf<String, Any>()
    private var language = "en"
    private var streamingQuality = "auto"

    var shouldReturnError = false
    var errorMessage = "Settings repository error"

    suspend fun getSettings(): BayitResult<Any> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            BayitResult.Success(settings.toMap())
        }
    }

    suspend fun updateSetting(key: String, value: Any): BayitResult<Unit> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            settings[key] = value
            BayitResult.Success(Unit)
        }
    }

    suspend fun getLanguage(): BayitResult<String> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            BayitResult.Success(language)
        }
    }

    suspend fun setLanguage(languageCode: String): BayitResult<Unit> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            language = languageCode
            BayitResult.Success(Unit)
        }
    }

    suspend fun getStreamingQuality(): BayitResult<String> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            BayitResult.Success(streamingQuality)
        }
    }

    suspend fun setStreamingQuality(quality: String): BayitResult<Unit> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            streamingQuality = quality
            BayitResult.Success(Unit)
        }
    }

    fun setSetting(key: String, value: Any) {
        settings[key] = value
    }

    fun setInitialLanguage(lang: String) {
        language = lang
    }

    fun setInitialQuality(quality: String) {
        streamingQuality = quality
    }

    fun clear() {
        settings.clear()
        language = "en"
        streamingQuality = "auto"
        shouldReturnError = false
    }
}
