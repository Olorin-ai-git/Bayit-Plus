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
}

private interface CultureService {

    @GET("api/v1/cultures")
    suspend fun getCultures(): List<CultureItem>

    @GET("api/v1/cultures/default")
    suspend fun getDefaultCulture(): CultureItem

    @GET("api/v1/cultures/{cultureId}/featured")
    suspend fun getCultureFeatured(
        @Path("cultureId") cultureId: String,
    ): CultureFeaturedResponse

    @GET("api/v1/cultures/{cultureId}/trending")
    suspend fun getCultureTrending(
        @Path("cultureId") cultureId: String,
        @Query("limit") limit: Int = 10,
    ): List<CultureContentItem>

    @GET("api/v1/cultures/{cultureId}/time")
    suspend fun getCultureTime(
        @Path("cultureId") cultureId: String,
    ): CultureTimeResponse

    @GET("api/v1/judaism/shabbat/featured")
    suspend fun getShabbatFeatured(): ShabbatFeaturedResponse
}

/** A culture entry from the cultures list or default endpoint. */
@Serializable
private data class CultureItem(
    val id: String,
    val name: String? = null,
    @SerialName("name_en") val nameEn: String? = null,
    @SerialName("name_he") val nameHe: String? = null,
    val description: String? = null,
    val timezone: String? = null,
    @SerialName("is_active") val isActive: Boolean? = null,
    @SerialName("display_order") val displayOrder: Int? = null,
)

/** Response from the culture featured endpoint. */
@Serializable
private data class CultureFeaturedResponse(
    val hero: CultureHeroItem? = null,
    val sections: List<CultureSection> = emptyList(),
)

/** Hero item within a culture featured response. */
@Serializable
private data class CultureHeroItem(
    val id: String? = null,
    val title: String? = null,
    val description: String? = null,
    val thumbnail: String? = null,
    val backdrop: String? = null,
)

/** A section grouping culture content. */
@Serializable
private data class CultureSection(
    val title: String? = null,
    @SerialName("title_en") val titleEn: String? = null,
    val items: List<CultureContentItem> = emptyList(),
)

/** A single culture content item. */
@Serializable
private data class CultureContentItem(
    val id: String? = null,
    val title: String? = null,
    val description: String? = null,
    val thumbnail: String? = null,
    val category: String? = null,
    val type: String? = null,
)

/** Response from the culture time endpoint. */
@Serializable
private data class CultureTimeResponse(
    @SerialName("formatted_time") val formattedTime: String? = null,
    @SerialName("formatted_date") val formattedDate: String? = null,
    @SerialName("day_of_week") val dayOfWeek: String? = null,
    val timezone: String? = null,
    @SerialName("is_weekend") val isWeekend: Boolean? = null,
    @SerialName("hebrew_date") val hebrewDate: String? = null,
)

/** Response from the Judaism Shabbat featured endpoint. */
@Serializable
private data class ShabbatFeaturedResponse(
    val parasha: String? = null,
    @SerialName("parasha_he") val parashaHe: String? = null,
    @SerialName("is_shabbat") val isShabbat: Boolean? = null,
    val sections: ShabbatSections? = null,
    @SerialName("all_content") val allContent: List<ShabbatContentItem> = emptyList(),
)

/** Section groupings within the Shabbat featured response. */
@Serializable
private data class ShabbatSections(
    @SerialName("parasha_content") val parashaContent: List<ShabbatContentItem> = emptyList(),
    @SerialName("shabbat_music") val shabbatMusic: List<ShabbatContentItem> = emptyList(),
    val preparation: List<ShabbatContentItem> = emptyList(),
    val featured: List<ShabbatContentItem> = emptyList(),
)

/** A content item within the Shabbat featured response. */
@Serializable
private data class ShabbatContentItem(
    val id: String? = null,
    val title: String? = null,
    @SerialName("title_en") val titleEn: String? = null,
    val description: String? = null,
    val thumbnail: String? = null,
    val duration: String? = null,
    val rabbi: String? = null,
    val category: String? = null,
    val type: String? = null,
)
