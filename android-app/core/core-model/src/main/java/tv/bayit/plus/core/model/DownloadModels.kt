package tv.bayit.plus.core.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/** Response from GET /api/v1/downloads */
@Serializable
data class DownloadsResponse(
    val items: List<DownloadItem> = emptyList(),
    val total: Int? = null,
)

/** A downloaded content item. */
@Serializable
data class DownloadItem(
    val id: String,
    @SerialName("content_id") val contentId: String? = null,
    val title: String? = null,
    val thumbnail: String? = null,
    val type: String? = null,
    val duration: String? = null,
    @SerialName("file_size") val fileSize: Int? = null,
    @SerialName("download_date") val downloadDate: String? = null,
    val status: String? = null,
    val progress: Double? = null,
)

/** Response from POST /api/v1/downloads/start */
@Serializable
data class DownloadStartResponse(
    @SerialName("download_id") val downloadId: String? = null,
    val message: String? = null,
    @SerialName("stream_url") val streamUrl: String? = null,
)

/** Request body for POST /api/v1/downloads/start */
@Serializable
data class DownloadStartRequest(
    @SerialName("content_id") val contentId: String,
    val quality: String? = null,
)

/** Response from GET /api/v1/downloads/check/{content_id} */
@Serializable
data class DownloadCheckResponse(
    @SerialName("is_downloaded") val isDownloaded: Boolean? = null,
    @SerialName("download_id") val downloadId: String? = null,
)
