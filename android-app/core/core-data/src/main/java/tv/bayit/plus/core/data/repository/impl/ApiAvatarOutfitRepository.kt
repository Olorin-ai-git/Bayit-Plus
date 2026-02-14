package tv.bayit.plus.core.data.repository.impl

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.PUT
import retrofit2.http.Path
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.runCatchingResult
import tv.bayit.plus.core.data.repository.AvatarOutfitRepository
import tv.bayit.plus.core.model.MessageResponse
import tv.bayit.plus.core.network.api.BayitApiClient

/**
 * Production implementation of [AvatarOutfitRepository] backed by Retrofit.
 *
 * Delegates HTTP communication to [BayitApiClient], which handles auth headers,
 * correlation IDs, retry, rate limiting, and structured error mapping. Every
 * public method wraps the network call in [runCatchingResult] so callers receive
 * a [BayitResult] instead of raw exceptions.
 *
 * Endpoint paths mirror the iOS APIAvatarOutfitRepository and web api.js.
 */
class ApiAvatarOutfitRepository(
    private val client: BayitApiClient,
) : AvatarOutfitRepository {

    private val service: AvatarOutfitService = client.createService()

    override suspend fun getAvailableOutfits(): BayitResult<List<Any>> =
        runCatchingResult {
            val response = client.safeApiCall { service.getOutfits() }
            response.items
        }

    override suspend fun getEquippedOutfit(): BayitResult<Any> =
        runCatchingResult {
            client.safeApiCall { service.getEquippedOutfit() }
        }

    override suspend fun equipOutfit(outfitId: String): BayitResult<Unit> =
        runCatchingResult {
            client.safeApiCall { service.equipOutfit(outfitId) }
            Unit
        }

    override suspend fun purchaseOutfit(outfitId: String): BayitResult<Any> =
        runCatchingResult {
            client.safeApiCall { service.purchaseOutfit(outfitId) }
        }

    override suspend fun getOwnedOutfits(): BayitResult<List<Any>> =
        runCatchingResult {
            val response = client.safeApiCall { service.getOwnedOutfits() }
            response.items
        }

    override suspend fun getOutfitsByCategory(category: String): BayitResult<List<Any>> =
        runCatchingResult {
            val response = client.safeApiCall {
                service.getOutfitsByCategory(category)
            }
            response.items
        }
}

private interface AvatarOutfitService {

    @GET("api/v1/avatar/outfits")
    suspend fun getOutfits(): OutfitListResponse

    @GET("api/v1/avatar/outfit/equipped")
    suspend fun getEquippedOutfit(): OutfitDetailResponse

    @PUT("api/v1/avatar/outfit/{id}/equip")
    suspend fun equipOutfit(@Path("id") outfitId: String): MessageResponse

    @POST("api/v1/avatar/outfit/{id}/purchase")
    suspend fun purchaseOutfit(@Path("id") outfitId: String): OutfitPurchaseResponse

    @GET("api/v1/avatar/outfits/owned")
    suspend fun getOwnedOutfits(): OutfitListResponse

    @GET("api/v1/avatar/outfits/category/{category}")
    suspend fun getOutfitsByCategory(
        @Path("category") category: String,
    ): OutfitListResponse
}

/** List wrapper for outfit endpoints. */
@Serializable
private data class OutfitListResponse(
    val items: List<OutfitDetailResponse> = emptyList(),
)

/** Detail response for a single avatar outfit. */
@Serializable
private data class OutfitDetailResponse(
    val id: String,
    val name: String? = null,
    val description: String? = null,
    @SerialName("thumbnail_url") val thumbnailUrl: String? = null,
    @SerialName("mesh_url") val meshUrl: String? = null,
    val category: String? = null,
    val price: Int? = null,
    val currency: String? = null,
    @SerialName("is_owned") val isOwned: Boolean = false,
    @SerialName("is_equipped") val isEquipped: Boolean = false,
    val rarity: String? = null,
)

/** Response from the purchase outfit endpoint. */
@Serializable
private data class OutfitPurchaseResponse(
    val outfit: OutfitDetailResponse? = null,
    @SerialName("remaining_balance") val remainingBalance: Int? = null,
    val message: String? = null,
)
