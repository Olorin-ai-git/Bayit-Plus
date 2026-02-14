package tv.bayit.plus.core.data.repository.impl

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.PUT
import retrofit2.http.Query
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.runCatchingResult
import tv.bayit.plus.core.data.repository.ShabbatRepository
import tv.bayit.plus.core.model.MessageResponse
import tv.bayit.plus.core.network.api.BayitApiClient

/**
 * Production implementation of [ShabbatRepository] backed by Retrofit.
 *
 * Delegates HTTP communication to [BayitApiClient], which handles auth headers,
 * correlation IDs, retry, rate limiting, and structured error mapping. Every
 * public method wraps the network call in [runCatchingResult] so callers receive
 * a [BayitResult] instead of raw exceptions.
 *
 * Shabbat times come from GET /api/v1/zman/shabbat. Shabbat mode and auto-
 * schedule preferences are managed through the zman preferences endpoint
 * (POST /api/v1/zman/preferences) and the zman time endpoint
 * (GET /api/v1/zman/time) which includes Shabbat status.
 *
 * Endpoint paths mirror the iOS APIShabbatRepository and web api.js.
 */
class ApiShabbatRepository(
    private val client: BayitApiClient,
) : ShabbatRepository {

    private val service: ShabbatService = client.createService()

    override suspend fun getShabbatTimes(
        latitude: Double,
        longitude: Double,
    ): BayitResult<Any> = runCatchingResult {
        client.safeApiCall { service.getShabbatTimes(latitude, longitude) }
    }

    override suspend fun getShabbatMode(): BayitResult<Boolean> = runCatchingResult {
        val response = client.safeApiCall { service.getZmanTime() }
        response.shabbat?.isShabbat ?: false
    }

    override suspend fun setShabbatMode(enabled: Boolean): BayitResult<Unit> =
        runCatchingResult {
            val request = ZmanPreferencesBody(shabbatModeEnabled = enabled)
            client.safeApiCall { service.updateZmanPreferences(request) }
            Unit
        }

    override suspend fun getShabbatSchedule(): BayitResult<Any> = runCatchingResult {
        client.safeApiCall { service.getShabbatContent() }
    }

    override suspend fun getAutoScheduleEnabled(): BayitResult<Boolean> =
        runCatchingResult {
            val response = client.safeApiCall { service.getZmanTime() }
            response.shabbat?.isErevShabbat ?: false
        }

    override suspend fun setAutoScheduleEnabled(enabled: Boolean): BayitResult<Unit> =
        runCatchingResult {
            val request = ZmanPreferencesBody(shabbatModeEnabled = enabled)
            client.safeApiCall { service.updateZmanPreferences(request) }
            Unit
        }
}

private interface ShabbatService {

    @GET("api/v1/zman/shabbat")
    suspend fun getShabbatTimes(
        @Query("latitude") latitude: Double,
        @Query("longitude") longitude: Double,
    ): ShabbatTimesResponse

    @GET("api/v1/zman/time")
    suspend fun getZmanTime(): ZmanTimeResponse

    @GET("api/v1/zman/shabbat-content")
    suspend fun getShabbatContent(): ShabbatContentResponse

    @PUT("api/v1/zman/preferences")
    suspend fun updateZmanPreferences(
        @Body request: ZmanPreferencesBody,
    ): ZmanPreferencesUpdateResponse
}

/** Response from GET /api/v1/zman/shabbat. */
@Serializable
private data class ShabbatTimesResponse(
    @SerialName("candle_lighting") val candleLighting: String? = null,
    @SerialName("candle_lighting_datetime") val candleLightingDatetime: String? = null,
    val havdalah: String? = null,
    @SerialName("havdalah_datetime") val havdalahDatetime: String? = null,
    val parasha: String? = null,
    @SerialName("parasha_hebrew") val parashaHebrew: String? = null,
)

/** Response from GET /api/v1/zman/time. */
@Serializable
private data class ZmanTimeResponse(
    val israel: ZmanIsraelTime? = null,
    val local: ZmanLocalTime? = null,
    val shabbat: ZmanShabbatStatus? = null,
)

/** Israel time information within the zman response. */
@Serializable
private data class ZmanIsraelTime(
    val time: String? = null,
    val datetime: String? = null,
    val day: String? = null,
)

/** Local time information within the zman response. */
@Serializable
private data class ZmanLocalTime(
    val time: String? = null,
    val datetime: String? = null,
    val timezone: String? = null,
)

/** Shabbat status within the zman response. */
@Serializable
private data class ZmanShabbatStatus(
    @SerialName("is_shabbat") val isShabbat: Boolean? = null,
    @SerialName("is_erev_shabbat") val isErevShabbat: Boolean? = null,
    val countdown: String? = null,
    @SerialName("countdown_label") val countdownLabel: String? = null,
    @SerialName("candle_lighting") val candleLighting: String? = null,
    val havdalah: String? = null,
    val parasha: String? = null,
    @SerialName("parasha_hebrew") val parashaHebrew: String? = null,
)

/** Curated Shabbat content sections. */
@Serializable
private data class ShabbatContentResponse(
    val featured: ShabbatContentSection? = null,
    val family: ShabbatContentSection? = null,
    val music: ShabbatContentSection? = null,
    val atmosphere: ShabbatAtmosphere? = null,
)

/** A section of Shabbat content with a title and items. */
@Serializable
private data class ShabbatContentSection(
    val title: String? = null,
    @SerialName("title_en") val titleEn: String? = null,
    val items: List<ShabbatServiceContentItem> = emptyList(),
)

/** A content item within a Shabbat content section. */
@Serializable
private data class ShabbatServiceContentItem(
    val id: String? = null,
    val title: String? = null,
    val name: String? = null,
    val description: String? = null,
    val thumbnail: String? = null,
    val logo: String? = null,
    val type: String? = null,
    val duration: String? = null,
)

/** Shabbat atmosphere/theme information. */
@Serializable
private data class ShabbatAtmosphere(
    val message: String? = null,
    @SerialName("message_en") val messageEn: String? = null,
    val theme: String? = null,
    @SerialName("background_color") val backgroundColor: String? = null,
    @SerialName("accent_color") val accentColor: String? = null,
)

/** Request body for updating zman preferences. */
@Serializable
private data class ZmanPreferencesBody(
    @SerialName("shabbat_mode_enabled") val shabbatModeEnabled: Boolean? = null,
    @SerialName("show_israel_time") val showIsraelTime: Boolean? = null,
    @SerialName("local_timezone") val localTimezone: String? = null,
)

/** Response from POST /api/v1/zman/preferences. */
@Serializable
private data class ZmanPreferencesUpdateResponse(
    val status: String? = null,
    val preferences: ZmanPreferencesValues? = null,
)

/** Preferences values within the update response. */
@Serializable
private data class ZmanPreferencesValues(
    @SerialName("show_israel_time") val showIsraelTime: Boolean? = null,
    @SerialName("shabbat_mode_enabled") val shabbatModeEnabled: Boolean? = null,
    @SerialName("local_timezone") val localTimezone: String? = null,
)
