package tv.bayit.plus.core.data.repository.impl

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.PUT
import retrofit2.http.Path
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.runCatchingResult
import tv.bayit.plus.core.data.repository.WidgetRepository
import tv.bayit.plus.core.model.MessageResponse
import tv.bayit.plus.core.network.api.BayitApiClient
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Production implementation of [WidgetRepository] backed by Retrofit.
 *
 * Delegates HTTP communication to [BayitApiClient], which handles auth headers,
 * correlation IDs, retry, rate limiting, and structured error mapping. Every
 * public method wraps the network call in [runCatchingResult] so callers receive
 * a [BayitResult] instead of raw exceptions.
 *
 * Endpoint paths mirror the iOS APIWidgetRepository and web api.js.
 */
@Singleton
class ApiWidgetRepository @Inject constructor(
    private val client: BayitApiClient,
) : WidgetRepository {

    private val service: WidgetService = client.createService()

    override suspend fun getActiveWidgets(): BayitResult<List<Any>> =
        runCatchingResult {
            val response = client.safeApiCall { service.getActiveWidgets() }
            response.widgets
        }

    override suspend fun getWidgetData(widgetId: String): BayitResult<Any> =
        runCatchingResult {
            client.safeApiCall { service.getWidgetData(widgetId) }
        }

    override suspend fun updateWidgetConfig(
        widgetId: String,
        config: Map<String, Any>,
    ): BayitResult<Unit> = runCatchingResult {
        val request = WidgetConfigUpdateBody(
            config = config.mapValues { it.value.toString() },
        )
        client.safeApiCall { service.updateWidgetConfig(widgetId, request) }
        Unit
    }

    override suspend fun getAvailableWidgets(): BayitResult<List<Any>> =
        runCatchingResult {
            val response = client.safeApiCall { service.getAvailableWidgets() }
            response.widgets
        }

    override suspend fun enableWidget(widgetType: String): BayitResult<Any> =
        runCatchingResult {
            val request = EnableWidgetBody(type = widgetType)
            client.safeApiCall { service.enableWidget(request) }
        }

    override suspend fun disableWidget(widgetId: String): BayitResult<Unit> =
        runCatchingResult {
            client.safeApiCall { service.disableWidget(widgetId) }
            Unit
        }

    override suspend fun toggleMinimize(widgetId: String, isMinimized: Boolean): BayitResult<Unit> =
        runCatchingResult {
            client.safeApiCall { service.toggleMinimize(widgetId, isMinimized) }
            Unit
        }
}

private interface WidgetService {

    @GET("api/v1/widgets/active")
    suspend fun getActiveWidgets(): WidgetsListResponse

    @GET("api/v1/widget/{widgetId}/data")
    suspend fun getWidgetData(@Path("widgetId") widgetId: String): WidgetDataResponse

    @PUT("api/v1/widget/{widgetId}/config")
    suspend fun updateWidgetConfig(
        @Path("widgetId") widgetId: String,
        @Body request: WidgetConfigUpdateBody,
    ): MessageResponse

    @GET("api/v1/widgets/available")
    suspend fun getAvailableWidgets(): WidgetsListResponse

    @POST("api/v1/widget/enable")
    suspend fun enableWidget(@Body request: EnableWidgetBody): WidgetEnabledResponse

    @DELETE("api/v1/widget/{widgetId}")
    suspend fun disableWidget(@Path("widgetId") widgetId: String): MessageResponse

    @POST("api/v1/widgets/{widgetId}/minimize")
    suspend fun toggleMinimize(
        @Path("widgetId") widgetId: String,
        @retrofit2.http.Query("is_minimized") isMinimized: Boolean,
    ): MessageResponse
}

/** Response wrapper for widget list endpoints. */
@Serializable
private data class WidgetsListResponse(
    val widgets: List<WidgetItem> = emptyList(),
    val total: Int? = null,
)

/** Summary of a single widget. */
@Serializable
private data class WidgetItem(
    val id: String,
    val type: String,
    val title: String,
    @SerialName("is_active") val isActive: Boolean = false,
    @SerialName("icon_url") val iconUrl: String? = null,
)

/** Response containing widget-specific data for rendering. */
@Serializable
private data class WidgetDataResponse(
    val id: String,
    val type: String,
    val data: kotlinx.serialization.json.JsonObject? = null,
    @SerialName("last_updated") val lastUpdated: String? = null,
)

/** Request body for updating widget configuration. */
@Serializable
private data class WidgetConfigUpdateBody(
    val config: Map<String, String>,
)

/** Request body for enabling a widget by type. */
@Serializable
private data class EnableWidgetBody(
    val type: String,
)

/** Response returned after enabling a widget. */
@Serializable
private data class WidgetEnabledResponse(
    val id: String,
    val type: String,
    val message: String? = null,
)
