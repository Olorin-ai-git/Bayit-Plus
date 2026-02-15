package tv.bayit.plus.core.data.repository.impl

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.runCatchingResult
import tv.bayit.plus.core.data.repository.ZehAniRepository
import tv.bayit.plus.core.model.MessageResponse
import tv.bayit.plus.core.network.api.BayitApiClient

/**
 * Production implementation of [ZehAniRepository] backed by Retrofit.
 *
 * Delegates HTTP communication to [BayitApiClient], which handles auth headers,
 * correlation IDs, retry, rate limiting, and structured error mapping. Every
 * public method wraps the network call in [runCatchingResult] so callers receive
 * a [BayitResult] instead of raw exceptions.
 *
 * Endpoint paths mirror the iOS APIZehAniRepository and web api.js.
 */
class ApiZehAniRepository(
    private val client: BayitApiClient,
) : ZehAniRepository {

    private val service: ZehAniService = client.createService()

    override suspend fun identifyPerson(imageData: ByteArray): BayitResult<Any> =
        runCatchingResult {
            val body = imageData.toRequestBody(OCTET_STREAM_TYPE)
            client.safeApiCall { service.identify(body) }
        }

    override suspend fun getPersonDetails(personId: String): BayitResult<Any> =
        runCatchingResult {
            client.safeApiCall { service.getPersonDetails(personId) }
        }

    override suspend fun getPersonFilmography(personId: String): BayitResult<List<Any>> =
        runCatchingResult {
            val response = client.safeApiCall {
                service.getPersonFilmography(personId)
            }
            response.items
        }

    override suspend fun identifyFromTimestamp(
        mediaId: String,
        timestampMs: Long,
    ): BayitResult<List<Any>> = runCatchingResult {
        val request = TimestampIdentifyRequest(
            mediaId = mediaId,
            timestampMs = timestampMs,
        )
        val response = client.safeApiCall {
            service.identifyFromTimestamp(request)
        }
        response.matches
    }

    override suspend fun getRecognitionHistory(): BayitResult<List<Any>> =
        runCatchingResult {
            val response = client.safeApiCall { service.getHistory() }
            response.items
        }

    override suspend fun addContact(name: String, photoUri: String?): BayitResult<Unit> =
        runCatchingResult {
            val request = AddContactRequest(name = name, photoUri = photoUri)
            client.safeApiCall { service.addContact(request) }
            Unit
        }

    override suspend fun deleteContact(contactId: String): BayitResult<Unit> =
        runCatchingResult {
            client.safeApiCall { service.deleteContact(contactId) }
            Unit
        }

    override suspend fun getContacts(): BayitResult<List<Any>> =
        runCatchingResult {
            val response = client.safeApiCall { service.getContacts() }
            response.items
        }

    override suspend fun submitFeedback(feedback: String, rating: Int): BayitResult<Unit> =
        runCatchingResult {
            val request = FeedbackRequest(feedback = feedback, rating = rating)
            client.safeApiCall { service.submitFeedback(request) }
            Unit
        }

    override suspend fun shareIdentification(identificationId: String): BayitResult<Unit> =
        runCatchingResult {
            client.safeApiCall { service.shareIdentification(identificationId) }
            Unit
        }

    override suspend fun getIdentificationHistory(): BayitResult<List<Any>> =
        runCatchingResult {
            val response = client.safeApiCall { service.getIdentificationHistory() }
            response.items
        }
}

private interface ZehAniService {

    @POST("api/v1/zehani/identify")
    suspend fun identify(
        @Body imageData: okhttp3.RequestBody,
    ): ZehAniIdentifyResponse

    @GET("api/v1/zehani/person/{id}")
    suspend fun getPersonDetails(
        @Path("id") personId: String,
    ): ZehAniPersonResponse

    @GET("api/v1/zehani/person/{id}/filmography")
    suspend fun getPersonFilmography(
        @Path("id") personId: String,
    ): ZehAniFilmographyResponse

    @POST("api/v1/zehani/identify/timestamp")
    suspend fun identifyFromTimestamp(
        @Body request: TimestampIdentifyRequest,
    ): ZehAniTimestampResponse

    @GET("api/v1/zehani/history")
    suspend fun getHistory(): ZehAniHistoryResponse

    @POST("api/v1/zehani/contacts")
    suspend fun addContact(@Body request: AddContactRequest): MessageResponse

    @DELETE("api/v1/zehani/contacts/{id}")
    suspend fun deleteContact(@Path("id") contactId: String): MessageResponse

    @GET("api/v1/zehani/contacts")
    suspend fun getContacts(): ContactListResponse

    @POST("api/v1/zehani/feedback")
    suspend fun submitFeedback(@Body request: FeedbackRequest): MessageResponse

    @POST("api/v1/zehani/share/{id}")
    suspend fun shareIdentification(@Path("id") identificationId: String): MessageResponse

    @GET("api/v1/zehani/identifications")
    suspend fun getIdentificationHistory(): IdentificationHistoryResponse
}

/** Response from the face identification endpoint. */
@Serializable
private data class ZehAniIdentifyResponse(
    val person: ZehAniPersonResponse? = null,
    val confidence: Double? = null,
)

/** Person detail returned from Zeh Ani endpoints. */
@Serializable
private data class ZehAniPersonResponse(
    val id: String,
    val name: String? = null,
    @SerialName("hebrew_name") val hebrewName: String? = null,
    @SerialName("image_url") val imageUrl: String? = null,
    val bio: String? = null,
    @SerialName("birth_date") val birthDate: String? = null,
    val nationality: String? = null,
)

/** Filmography list wrapper. */
@Serializable
private data class ZehAniFilmographyResponse(
    val items: List<ZehAniFilmographyItem> = emptyList(),
)

/** A single filmography credit. */
@Serializable
private data class ZehAniFilmographyItem(
    val id: String,
    val title: String? = null,
    val role: String? = null,
    val year: Int? = null,
    @SerialName("thumbnail_url") val thumbnailUrl: String? = null,
    @SerialName("content_type") val contentType: String? = null,
)

/** Request body for timestamp-based identification. */
@Serializable
private data class TimestampIdentifyRequest(
    @SerialName("media_id") val mediaId: String,
    @SerialName("timestamp_ms") val timestampMs: Long,
)

/** Response from timestamp-based identification. */
@Serializable
private data class ZehAniTimestampResponse(
    val matches: List<ZehAniMatchItem> = emptyList(),
)

/** A single recognition match from timestamp identification. */
@Serializable
private data class ZehAniMatchItem(
    @SerialName("person_id") val personId: String,
    val name: String? = null,
    val confidence: Double? = null,
    @SerialName("bounding_box") val boundingBox: ZehAniBoundingBox? = null,
)

/** Bounding box coordinates for a detected face. */
@Serializable
private data class ZehAniBoundingBox(
    val x: Double = 0.0,
    val y: Double = 0.0,
    val width: Double = 0.0,
    val height: Double = 0.0,
)

/** Recognition history response wrapper. */
@Serializable
private data class ZehAniHistoryResponse(
    val items: List<ZehAniHistoryItem> = emptyList(),
)

/** A single recognition history entry. */
@Serializable
private data class ZehAniHistoryItem(
    val id: String,
    @SerialName("person_id") val personId: String,
    @SerialName("person_name") val personName: String? = null,
    @SerialName("media_id") val mediaId: String? = null,
    @SerialName("recognized_at") val recognizedAt: String? = null,
    val confidence: Double? = null,
)

/** Request body for adding a contact. */
@Serializable
private data class AddContactRequest(
    val name: String,
    @SerialName("photo_uri") val photoUri: String? = null,
)

/** Contact list response wrapper. */
@Serializable
private data class ContactListResponse(
    val items: List<ContactItem> = emptyList(),
)

/** A single contact item. */
@Serializable
private data class ContactItem(
    val id: String,
    val name: String? = null,
    @SerialName("photo_uri") val photoUri: String? = null,
    @SerialName("created_at") val createdAt: String? = null,
)

/** Request body for submitting feedback. */
@Serializable
private data class FeedbackRequest(
    val feedback: String,
    val rating: Int,
)

/** Identification history response wrapper. */
@Serializable
private data class IdentificationHistoryResponse(
    val items: List<IdentificationItem> = emptyList(),
)

/** A single identification history item. */
@Serializable
private data class IdentificationItem(
    val id: String,
    @SerialName("person_id") val personId: String,
    @SerialName("person_name") val personName: String? = null,
    @SerialName("identified_at") val identifiedAt: String? = null,
    @SerialName("thumbnail_url") val thumbnailUrl: String? = null,
)

private val OCTET_STREAM_TYPE = "application/octet-stream".toMediaType()
