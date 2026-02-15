package tv.bayit.plus.data.model.zehani

import com.google.gson.annotations.SerializedName

data class AvatarMesh(
    @SerializedName("id")
    val id: String,

    @SerializedName("avatar_id")
    val avatarId: String,

    @SerializedName("user_id")
    val userId: String,

    @SerializedName("status")
    val status: MeshStatus,

    @SerializedName("source")
    val source: MeshSource,

    @SerializedName("has_glb")
    val hasGlb: Boolean,

    @SerializedName("has_thumbnail")
    val hasThumbnail: Boolean,

    @SerializedName("blend_shapes")
    val blendShapes: List<BlendShape> = emptyList(),

    @SerializedName("bone_count")
    val boneCount: Int? = null,

    @SerializedName("vertex_count")
    val vertexCount: Int? = null,

    @SerializedName("credits_charged")
    val creditsCharged: Int = 0,

    @SerializedName("error_message")
    val errorMessage: String? = null,

    @SerializedName("created_at")
    val createdAt: String,

    @SerializedName("updated_at")
    val updatedAt: String
)

data class BlendShape(
    @SerializedName("name")
    val name: String,

    @SerializedName("default_weight")
    val defaultWeight: Double
)

enum class MeshStatus {
    @SerializedName("pending") PENDING,
    @SerializedName("generating") GENERATING,
    @SerializedName("rigging") RIGGING,
    @SerializedName("ready") READY,
    @SerializedName("failed") FAILED
}

enum class MeshSource {
    @SerializedName("rpm") RPM,
    @SerializedName("arkit_on_device") ARKIT
}

data class MeshGlbUrl(
    @SerializedName("avatar_id")
    val avatarId: String,

    @SerializedName("signed_url")
    val signedUrl: String,

    @SerializedName("expires_in_seconds")
    val expiresInSeconds: Int
)

data class MeshGenerationRequest(
    @SerializedName("profile_id")
    val profileId: String,

    @SerializedName("pin")
    val pin: String
)
