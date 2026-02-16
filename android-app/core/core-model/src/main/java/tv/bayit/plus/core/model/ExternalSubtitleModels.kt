package tv.bayit.plus.core.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/** Response from POST /api/v1/subtitles/{contentId}/fetch-external */
@Serializable
data class ExternalSubtitleImportResponse(
    val tracks: List<ImportedTrack> = emptyList(),
    val provider: String? = null,
    val message: String? = null,
)

/** A single external subtitle track from OpenSubtitles or other providers. */
@Serializable
data class ImportedTrack(
    val id: String,
    val language: String,
    @SerialName("language_name") val languageName: String? = null,
    val provider: String? = null,
    @SerialName("file_id") val fileId: String? = null,
    @SerialName("download_count") val downloadCount: Int? = null,
    val rating: Double? = null,
    @SerialName("machine_translated") val machineTranslated: Boolean? = null,
    @SerialName("hearing_impaired") val hearingImpaired: Boolean? = null,
    val fps: Double? = null,
)
