package tv.bayit.plus.core.model

import kotlinx.serialization.ExperimentalSerializationApi
import kotlinx.serialization.KSerializer
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.descriptors.PrimitiveKind
import kotlinx.serialization.descriptors.PrimitiveSerialDescriptor
import kotlinx.serialization.descriptors.SerialDescriptor
import kotlinx.serialization.encoding.Decoder
import kotlinx.serialization.encoding.Encoder
import kotlinx.serialization.json.JsonDecoder
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.doubleOrNull

/** Item from GET /api/v1/history or /api/v1/history/continue */
@Serializable
data class WatchHistoryItem(
    val id: String,
    val title: String? = null,
    val thumbnail: String? = null,
    @Serializable(with = FlexibleDurationSerializer::class)
    val duration: Double? = null,
    val type: String? = null,
    val progress: Double? = null,
    val position: Double? = null,
    val completed: Boolean? = null,
    @SerialName("last_watched") val lastWatched: String? = null,
)

/** Response from GET /api/v1/history */
@Serializable
data class WatchHistoryResponse(
    val items: List<WatchHistoryItem> = emptyList(),
    val total: Int? = null,
    val page: Int? = null,
    val pages: Int? = null,
)

/** Response from GET /api/v1/history/continue */
@Serializable
data class ContinueWatchingResponse(
    val items: List<WatchHistoryItem> = emptyList(),
)

/** Request body for POST /api/v1/history/progress */
@Serializable
data class WatchProgressRequest(
    @SerialName("content_id") val contentId: String,
    @SerialName("content_type") val contentType: String,
    val position: Double,
    val duration: Double,
)

/** Response from POST /api/v1/history/progress */
@Serializable
data class WatchProgressResponse(
    val message: String? = null,
    val progress: Double? = null,
    val completed: Boolean? = null,
)

/** Response from PATCH /api/v1/history/{id}/restart */
@Serializable
data class RestartResponse(
    val message: String? = null,
    val position: Double? = null,
    val progress: Double? = null,
)

/**
 * Handles duration as either a numeric value (seconds) or
 * a formatted string ("H:MM:SS", "MM:SS", or "SS").
 */
internal object FlexibleDurationSerializer : KSerializer<Double?> {

    override val descriptor: SerialDescriptor =
        PrimitiveSerialDescriptor("FlexibleDuration", PrimitiveKind.DOUBLE)

    @OptIn(ExperimentalSerializationApi::class)
    override fun serialize(encoder: Encoder, value: Double?) {
        if (value != null) encoder.encodeDouble(value) else encoder.encodeNull()
    }

    override fun deserialize(decoder: Decoder): Double? {
        val jsonDecoder = decoder as? JsonDecoder ?: return decoder.decodeDouble()
        val element = jsonDecoder.decodeJsonElement()
        if (element !is JsonPrimitive) return null

        element.doubleOrNull?.let { return it }

        return parseFormattedDuration(element.content)
    }

    private fun parseFormattedDuration(value: String): Double? {
        val parts = value.split(":").mapNotNull { it.toDoubleOrNull() }
        return when (parts.size) {
            3 -> parts[0] * 3600 + parts[1] * 60 + parts[2]
            2 -> parts[0] * 60 + parts[1]
            1 -> parts[0]
            else -> null
        }
    }
}
