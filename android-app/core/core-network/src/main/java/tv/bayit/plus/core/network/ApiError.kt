package tv.bayit.plus.core.network

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

/**
 * Response body shape returned by the Bayit+ backend on error.
 * Used internally by interceptors and the API client to extract
 * user-friendly messages from error responses.
 */
@Serializable
data class ApiErrorResponse(
    val detail: String? = null,
    val message: String? = null,
    val code: String? = null,
)

/**
 * Sealed hierarchy of API exceptions mirroring iOS [APIError].
 *
 * Provides pattern-matchable error types for the UI layer to
 * display context-appropriate messages and recovery actions.
 */
sealed class ApiException(
    message: String,
    cause: Throwable? = null,
) : Exception(message, cause) {

    /** 401 -- token missing, expired, or invalid. */
    class Unauthorized(message: String) : ApiException(message)

    /** 402 -- insufficient credits or payment required. */
    class PaymentRequired(message: String) : ApiException(message)

    /** 403 -- authenticated but insufficient permissions. */
    class Forbidden(message: String) : ApiException(message)

    /** 404 -- the requested resource does not exist. */
    class NotFound(message: String) : ApiException(message)

    /** 429 -- rate limit exceeded; retryAfterSeconds from Retry-After header. */
    class RateLimited(
        val retryAfterSeconds: Long,
        message: String,
    ) : ApiException(message)

    /** 5xx -- server error with the HTTP status code. */
    class ServerError(
        val statusCode: Int,
        message: String,
    ) : ApiException(message)

    /** Request could not be sent or response could not be received. */
    class NetworkError(cause: Throwable) : ApiException(
        "Network error: ${cause.message}",
        cause,
    )

    /** Response body could not be decoded into the expected type. */
    class DecodingError(message: String, cause: Throwable? = null) : ApiException(
        "Decoding error: $message",
        cause,
    )

    /** Request was cancelled (coroutine cancellation). */
    class Cancelled : ApiException("Request cancelled")

    /** An error not covered by other cases. */
    class Unknown(
        val statusCode: Int?,
        message: String,
    ) : ApiException(message)

    companion object {

        /**
         * Creates the appropriate [ApiException] from an HTTP status code and
         * optional response body bytes.
         *
         * Parses JSON response bodies to extract the "detail" field for
         * user-friendly error messages, mirroring iOS APIError.fromHTTPStatus.
         */
        fun fromHttpStatus(statusCode: Int, body: ByteArray?, json: Json): ApiException {
            val message = extractMessage(body, json)
            return when (statusCode) {
                401 -> Unauthorized(message)
                402 -> PaymentRequired(message)
                403 -> Forbidden(message)
                404 -> NotFound(message)
                429 -> RateLimited(retryAfterSeconds = 0, message)
                in 500..599 -> ServerError(statusCode, message)
                else -> Unknown(statusCode, message)
            }
        }

        private fun extractMessage(body: ByteArray?, json: Json): String {
            if (body == null || body.isEmpty()) return "No response body"
            return try {
                val errorResponse = json.decodeFromString<ApiErrorResponse>(
                    body.decodeToString(),
                )
                errorResponse.detail
                    ?: errorResponse.message
                    ?: "No response body"
            } catch (_: Exception) {
                val raw = body.decodeToString()
                if (raw.length > 120) raw.take(120) else raw
            }
        }
    }
}
