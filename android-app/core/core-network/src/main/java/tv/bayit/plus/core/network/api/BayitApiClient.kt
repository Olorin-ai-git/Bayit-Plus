package tv.bayit.plus.core.network.api

import kotlinx.serialization.json.Json
import okhttp3.OkHttpClient
import retrofit2.HttpException
import retrofit2.Response
import retrofit2.Retrofit
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.network.ApiException
import java.io.IOException
import java.util.concurrent.CancellationException
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Main HTTP client that wraps Retrofit and returns decoded models directly.
 *
 * Mirrors the iOS APIClient pattern where callers receive `response.data`
 * rather than the full response wrapper -- matching the web api.js behavior
 * where the Axios interceptor returns `response.data`.
 *
 * Usage:
 * ```
 * interface ContentApi {
 *     @GET("/content/featured")
 *     suspend fun getFeatured(): List<ContentItem>
 * }
 *
 * val contentApi = apiClient.createService<ContentApi>()
 * val items: List<ContentItem> = contentApi.getFeatured()
 * ```
 *
 * Retrofit services created through [createService] already return decoded
 * models via the kotlinx.serialization converter. This class provides
 * additional [safeApiCall] for wrapping calls with structured error mapping.
 */
@Singleton
class BayitApiClient @Inject constructor(
    val retrofit: Retrofit,
    val okHttpClient: OkHttpClient,
    val json: Json,
    private val logger: BayitLogger,
) {

    /**
     * Creates a Retrofit service interface.
     *
     * The service methods should return the model directly (not Response<T>),
     * since the kotlinx.serialization converter handles deserialization
     * and OkHttp interceptors handle auth, correlation IDs, retry, etc.
     */
    inline fun <reified T> createService(): T = retrofit.create(T::class.java)

    /**
     * Wraps a suspend Retrofit call with structured error mapping.
     *
     * Converts HTTP errors, network errors, and serialization failures
     * into typed [ApiException] instances for the UI layer to pattern-match.
     *
     * Returns the decoded model directly, mirroring how the iOS APIClient
     * and web api.js return response.data.
     *
     * @param T The expected response model type.
     * @param block A suspend lambda invoking a Retrofit service method.
     * @return The decoded response model.
     * @throws ApiException on any failure.
     */
    suspend fun <T> safeApiCall(block: suspend () -> T): T {
        return try {
            block()
        } catch (e: CancellationException) {
            throw e
        } catch (e: HttpException) {
            val statusCode = e.code()
            val errorBody = e.response()?.errorBody()?.bytes()

            logger.error(
                "HTTP error $statusCode",
                error = e,
                metadata = mapOf(
                    "statusCode" to statusCode.toString(),
                    "url" to (e.response()?.raw()?.request?.url?.encodedPath ?: "unknown"),
                ),
            )

            throw ApiException.fromHttpStatus(statusCode, errorBody, json)
        } catch (e: IOException) {
            logger.error(
                "Network error",
                error = e,
                metadata = mapOf("error" to (e.message ?: "unknown")),
            )
            throw ApiException.NetworkError(e)
        } catch (e: kotlinx.serialization.SerializationException) {
            logger.error(
                "Deserialization error",
                error = e,
                metadata = mapOf("error" to (e.message ?: "unknown")),
            )
            throw ApiException.DecodingError(e.message ?: "Unknown deserialization error", e)
        } catch (e: Exception) {
            logger.error(
                "Unexpected API error",
                error = e,
                metadata = mapOf("error" to (e.message ?: "unknown")),
            )
            throw ApiException.Unknown(statusCode = null, e.message ?: "Unknown error")
        }
    }

    /**
     * Wraps a suspend Retrofit call returning [Response] and extracts the body.
     *
     * Use this when the Retrofit service returns `Response<T>` instead of `T`
     * directly, for cases where you need access to response headers or status.
     *
     * @param T The expected response model type.
     * @param block A suspend lambda invoking a Retrofit service method.
     * @return The decoded response body.
     * @throws ApiException on any failure.
     */
    suspend fun <T> safeApiCallWithResponse(
        block: suspend () -> Response<T>,
    ): T {
        return safeApiCall {
            val response = block()
            if (response.isSuccessful) {
                response.body() ?: throw ApiException.DecodingError("Response body was null")
            } else {
                throw HttpException(response)
            }
        }
    }
}
