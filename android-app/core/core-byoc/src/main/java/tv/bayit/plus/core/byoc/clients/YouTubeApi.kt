package tv.bayit.plus.core.byoc.clients

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class GoogleDeviceCodeResponse(
    @SerialName("device_code") val deviceCode: String,
    @SerialName("user_code") val userCode: String,
    @SerialName("verification_url") val verificationUrl: String,
    @SerialName("expires_in") val expiresIn: Int,
    val interval: Int,
)

@Serializable
data class GoogleTokenResponse(
    @SerialName("access_token") val accessToken: String? = null,
    @SerialName("refresh_token") val refreshToken: String? = null,
    @SerialName("token_type") val tokenType: String? = null,
    val error: String? = null,
)

@Serializable
data class YouTubeSubscriptionListResponse(
    val items: List<YouTubeSubscriptionItem> = emptyList(),
    val nextPageToken: String? = null,
)

@Serializable
data class YouTubeSubscriptionItem(
    val snippet: YouTubeSubscriptionSnippet? = null,
)

@Serializable
data class YouTubeSubscriptionSnippet(
    val title: String? = null,
    val resourceId: YouTubeResourceId? = null,
    val thumbnails: YouTubeThumbnails? = null,
)

@Serializable
data class YouTubeResourceId(
    val channelId: String? = null,
)

@Serializable
data class YouTubeVideoListResponse(
    val items: List<YouTubeVideoItem> = emptyList(),
    val nextPageToken: String? = null,
)

@Serializable
data class YouTubeVideoItem(
    val id: YouTubeVideoId? = null,
    val snippet: YouTubeVideoSnippet? = null,
    val contentDetails: YouTubeContentDetails? = null,
)

@Serializable
data class YouTubeVideoId(
    val videoId: String? = null,
)

@Serializable
data class YouTubeVideoSnippet(
    val title: String? = null,
    val description: String? = null,
    val channelTitle: String? = null,
    val publishedAt: String? = null,
    val thumbnails: YouTubeThumbnails? = null,
    val liveBroadcastContent: String? = null,
)

@Serializable
data class YouTubeContentDetails(
    val duration: String? = null,
)

@Serializable
data class YouTubeThumbnails(
    val high: YouTubeThumbnail? = null,
    val medium: YouTubeThumbnail? = null,
    val default: YouTubeThumbnail? = null,
)

@Serializable
data class YouTubeThumbnail(
    val url: String? = null,
)

class YouTubeAuthExpiredException : Exception("YouTube authentication expired")
