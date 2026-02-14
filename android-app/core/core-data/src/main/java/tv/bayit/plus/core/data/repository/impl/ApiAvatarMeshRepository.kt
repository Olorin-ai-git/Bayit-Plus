package tv.bayit.plus.core.data.repository.impl

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.PUT
import retrofit2.http.Path
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.runCatchingResult
import tv.bayit.plus.core.data.repository.AvatarMeshRepository
import tv.bayit.plus.core.network.api.BayitApiClient

/**
 * Production implementation of [AvatarMeshRepository] backed by Retrofit.
 *
 * Delegates HTTP communication to [BayitApiClient], which handles auth headers,
 * correlation IDs, retry, rate limiting, and structured error mapping. Every
 * public method wraps the network call in [runCatchingResult] so callers receive
 * a [BayitResult] instead of raw exceptions.
 *
 * Endpoint paths mirror the iOS APIAvatarMeshRepository and web api.js.
 */
class ApiAvatarMeshRepository(
    private val client: BayitApiClient,
) : AvatarMeshRepository {

    private val service: AvatarMeshService = client.createService()

    override suspend fun getAvatarMesh(avatarId: String): BayitResult<Any> =
        runCatchingResult {
            client.safeApiCall { service.getMesh(avatarId) }
        }

    override suspend fun getAvailableMeshes(): BayitResult<List<Any>> =
        runCatchingResult {
            val response = client.safeApiCall { service.getMeshes() }
            response.items
        }

    override suspend fun updateMesh(
        avatarId: String,
        meshConfig: Map<String, Any>,
    ): BayitResult<Any> = runCatchingResult {
        val request = MeshUpdateRequest(
            morphTargets = meshConfig.filterValues { it is Double }
                .mapValues { (it.value as Double) },
            textureId = meshConfig["texture_id"] as? String,
            colorHex = meshConfig["color_hex"] as? String,
        )
        client.safeApiCall { service.updateMesh(avatarId, request) }
    }

    override suspend fun getMeshAnimations(meshId: String): BayitResult<List<Any>> =
        runCatchingResult {
            val response = client.safeApiCall {
                service.getMeshAnimations(meshId)
            }
            response.items
        }

    override suspend fun getCustomizationOptions(): BayitResult<Any> =
        runCatchingResult {
            client.safeApiCall { service.getCustomizationOptions() }
        }
}

private interface AvatarMeshService {

    @GET("api/v1/avatar/mesh/{id}")
    suspend fun getMesh(@Path("id") avatarId: String): MeshDetailResponse

    @GET("api/v1/avatar/meshes")
    suspend fun getMeshes(): MeshListResponse

    @PUT("api/v1/avatar/mesh/{id}")
    suspend fun updateMesh(
        @Path("id") avatarId: String,
        @Body request: MeshUpdateRequest,
    ): MeshDetailResponse

    @GET("api/v1/avatar/mesh/{id}/animations")
    suspend fun getMeshAnimations(
        @Path("id") meshId: String,
    ): MeshAnimationListResponse

    @GET("api/v1/avatar/customization")
    suspend fun getCustomizationOptions(): MeshCustomizationResponse
}

/** Detail response for a single avatar mesh. */
@Serializable
private data class MeshDetailResponse(
    val id: String,
    val name: String? = null,
    @SerialName("mesh_url") val meshUrl: String? = null,
    @SerialName("texture_url") val textureUrl: String? = null,
    @SerialName("morph_targets") val morphTargets: Map<String, Double> = emptyMap(),
    @SerialName("vertex_count") val vertexCount: Int? = null,
    @SerialName("created_at") val createdAt: String? = null,
    @SerialName("updated_at") val updatedAt: String? = null,
)

/** List wrapper for mesh endpoints. */
@Serializable
private data class MeshListResponse(
    val items: List<MeshDetailResponse> = emptyList(),
)

/** Request body for updating mesh configuration. */
@Serializable
private data class MeshUpdateRequest(
    @SerialName("morph_targets") val morphTargets: Map<String, Double> = emptyMap(),
    @SerialName("texture_id") val textureId: String? = null,
    @SerialName("color_hex") val colorHex: String? = null,
)

/** List wrapper for mesh animation endpoints. */
@Serializable
private data class MeshAnimationListResponse(
    val items: List<MeshAnimationResponse> = emptyList(),
)

/** A single mesh animation clip. */
@Serializable
private data class MeshAnimationResponse(
    val id: String,
    val name: String? = null,
    @SerialName("animation_url") val animationUrl: String? = null,
    @SerialName("duration_ms") val durationMs: Long? = null,
    val loop: Boolean = false,
)

/** Available customization categories and options. */
@Serializable
private data class MeshCustomizationResponse(
    val categories: List<CustomizationCategory> = emptyList(),
)

/** A single customization category (e.g. hair, skin, eyes). */
@Serializable
private data class CustomizationCategory(
    val id: String,
    val name: String? = null,
    val options: List<CustomizationOption> = emptyList(),
)

/** A single customization option within a category. */
@Serializable
private data class CustomizationOption(
    val id: String,
    val label: String? = null,
    @SerialName("preview_url") val previewUrl: String? = null,
    @SerialName("is_premium") val isPremium: Boolean = false,
)
