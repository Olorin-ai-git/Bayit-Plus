package tv.bayit.plus.core.network.interceptor

import okhttp3.Interceptor
import okhttp3.Response
import tv.bayit.plus.core.common.logging.BayitLogger
import java.util.Locale
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Injects the Accept-Language header from the device's current locale.
 *
 * Uses the IETF BCP 47 language tag (e.g. "he-IL", "en-US") so the backend
 * can serve localized content. Mirrors the iOS applyLocaleHeader pattern.
 */
@Singleton
class LocaleInterceptor @Inject constructor(
    private val logger: BayitLogger,
) : Interceptor {

    override fun intercept(chain: Interceptor.Chain): Response {
        val languageTag = Locale.getDefault().toLanguageTag()
        val request = chain.request().newBuilder()
            .header(ACCEPT_LANGUAGE_HEADER, languageTag)
            .build()

        logger.debug(
            "Locale header attached",
            mapOf("locale" to languageTag),
        )

        return chain.proceed(request)
    }

    companion object {
        private const val ACCEPT_LANGUAGE_HEADER = "Accept-Language"
    }
}
