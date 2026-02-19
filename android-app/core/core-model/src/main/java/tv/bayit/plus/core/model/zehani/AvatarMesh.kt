package tv.bayit.plus.core.model.zehani

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * Represents a 3D avatar mesh with blend shapes and metadata.
 *
 * Maps to the backend AvatarMesh model returned from
 * `/api/v1/zeh-ani/mesh/` endpoints.
 */
@Serializable
data class AvatarMesh(
    val id: String = "",
    @SerialName("avatar_id") val avatarId: String,
    @SerialName("user_id") val userId: String,
    val status: String,
    val source: String? = null,
    @SerialName("has_glb") val hasGlb: Boolean = false,
    @SerialName("has_thumbnail") val hasThumbnail: Boolean = false,
    @SerialName("avatar_image_url") val avatarImageUrl: String? = null,
    @SerialName("blend_shapes") val blendShapes: List<BlendShape> = emptyList(),
    @SerialName("bone_count") val boneCount: Int = 0,
    @SerialName("vertex_count") val vertexCount: Int = 0,
    @SerialName("credits_charged") val creditsCharged: Double = 0.0,
    @SerialName("error_message") val errorMessage: String? = null,
    @SerialName("created_at") val createdAt: String,
    @SerialName("updated_at") val updatedAt: String,
)

@Serializable
data class BlendShape(
    val name: String,
    @SerialName("default_weight") val defaultWeight: Double = 0.0,
)

@Serializable
data class MeshGlbUrl(
    @SerialName("avatar_id") val avatarId: String,
    @SerialName("signed_url") val signedUrl: String,
    @SerialName("expires_in_seconds") val expiresInSeconds: Int,
)

@Serializable
data class MeshGenerationRequest(
    @SerialName("profile_id") val profileId: String,
    val pin: String,
)
