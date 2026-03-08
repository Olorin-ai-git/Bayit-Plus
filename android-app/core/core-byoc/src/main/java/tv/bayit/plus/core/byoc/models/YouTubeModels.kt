package tv.bayit.plus.core.byoc.models

data class YouTubeVideo(
    val id: String,
    val title: String,
    val description: String?,
    val thumbnailUrl: String?,
    val channelTitle: String?,
    val publishedAt: String?,
    val duration: String?,
    val liveBroadcastContent: String?,
)

data class GoogleDeviceCode(
    val deviceCode: String,
    val userCode: String,
    val verificationUrl: String,
    val expiresIn: Int,
    val interval: Int,
)
