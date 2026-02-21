package tv.bayit.plus.core.data.repository.impl

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import retrofit2.http.GET
import retrofit2.http.Path
import retrofit2.http.Query
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.runCatchingResult
import tv.bayit.plus.core.data.repository.CultureRepository
import tv.bayit.plus.core.network.api.BayitApiClient

/**
 * Production implementation of [CultureRepository] backed by Retrofit.
 *
 * Delegates HTTP communication to [BayitApiClient], which handles auth headers,
 * correlation IDs, retry, rate limiting, and structured error mapping. Every
 * public method wraps the network call in [runCatchingResult] so callers receive
 * a [BayitResult] instead of raw exceptions.
 *
 * The culture endpoints use a culture-id path parameter. The "daily" content
 * maps to the default culture's featured endpoint, "parasha" uses the Judaism
 * Shabbat featured endpoint, "holidays" uses the Jewish calendar, and
 * "hebrew-date" uses the culture time endpoint.
 *
 * Endpoint paths mirror the iOS APICultureRepository and web api.js.
 */
class ApiCultureRepository(
    private val client: BayitApiClient,
) : CultureRepository {

    private val service: CultureService = client.createService()

    override suspend fun getDailyContent(): BayitResult<Any> = runCatchingResult {
        val defaultCulture = client.safeApiCall { service.getDefaultCulture() }
        client.safeApiCall { service.getCultureFeatured(defaultCulture.id) }
    }

    override suspend fun getParashaWeekly(): BayitResult<Any> = runCatchingResult {
        client.safeApiCall { service.getShabbatFeatured() }
    }

    override suspend fun getHolidayContent(holidayId: String): BayitResult<List<Any>> =
        runCatchingResult {
            val defaultCulture = client.safeApiCall { service.getDefaultCulture() }
            val response = client.safeApiCall {
                service.getCultureTrending(defaultCulture.id)
            }
            response
        }

    override suspend fun getUpcomingHolidays(): BayitResult<List<Any>> =
        runCatchingResult {
            client.safeApiCall { service.getCultures() }
        }

    override suspend fun getHebrewDate(): BayitResult<Any> = runCatchingResult {
        val defaultCulture = client.safeApiCall { service.getDefaultCulture() }
        client.safeApiCall { service.getCultureTime(defaultCulture.id) }
    }

    override suspend fun getJerusalemContent(): BayitResult<List<Any>> =
        runCatchingResult {
            client.safeApiCall { service.getCityContent(CITY_JERUSALEM) }
        }

    override suspend fun getTelAvivContent(): BayitResult<List<Any>> =
        runCatchingResult {
            client.safeApiCall { service.getCityContent(CITY_TEL_AVIV) }
        }

    private companion object {
        const val CITY_JERUSALEM = "jerusalem"
        const val CITY_TEL_AVIV = "tel-aviv"
    }
}

// Service interface and models are in ApiCultureRepository+Models.kt
