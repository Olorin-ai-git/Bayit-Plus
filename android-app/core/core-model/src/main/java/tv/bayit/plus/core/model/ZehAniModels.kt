package tv.bayit.plus.core.model

import kotlinx.serialization.Serializable

@Serializable
data class ZehAniProfile(
    val profileId: String,
    val avatarId: String? = null,
    val avatarUrl: String? = null,
    val highlights: List<ZehAniHighlight> = emptyList(),
)

@Serializable
data class ZehAniHighlight(
    val id: String,
    val title: String,
    val thumbnailUrl: String? = null,
    val createdAt: String? = null,
)

@Serializable
data class ZehAniAvatar(
    val id: String,
    val meshUrl: String? = null,
    val textureUrl: String? = null,
    val outfitId: String? = null,
)
