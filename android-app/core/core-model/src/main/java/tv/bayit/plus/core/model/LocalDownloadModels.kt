package tv.bayit.plus.core.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/** Status of a local on-device download. */
@Serializable
enum class DownloadStatus {
    @SerialName("queued") QUEUED,
    @SerialName("downloading") DOWNLOADING,
    @SerialName("paused") PAUSED,
    @SerialName("completed") COMPLETED,
    @SerialName("failed") FAILED,
}

/** A download tracked locally on the device with file persistence. */
@Serializable
data class LocalDownload(
    val id: String,
    @SerialName("content_id") val contentId: String,
    val title: String,
    val thumbnail: String? = null,
    @SerialName("content_type") val contentType: String,
    val status: DownloadStatus = DownloadStatus.QUEUED,
    val progress: Float = 0f,
    @SerialName("file_path") val filePath: String? = null,
    @SerialName("file_size") val fileSize: Long = 0L,
    @SerialName("server_download_id") val serverDownloadId: String? = null,
    @SerialName("created_at") val createdAt: Long = 0L,
    val error: String? = null,
    @SerialName("source_url") val sourceUrl: String,
)

/** Request to start a local download. */
data class LocalDownloadRequest(
    val contentId: String,
    val title: String,
    val thumbnail: String?,
    val contentType: String,
    val streamUrl: String,
)
