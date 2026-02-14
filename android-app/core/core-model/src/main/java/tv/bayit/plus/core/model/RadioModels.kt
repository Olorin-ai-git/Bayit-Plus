package tv.bayit.plus.core.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/** Response from GET /api/v1/radio/stations */
@Serializable
data class StationsResponse(
    val stations: List<RadioStationItem> = emptyList(),
    val total: Int,
)

/** A radio station. */
@Serializable
data class RadioStationItem(
    val id: String,
    val name: String? = null,
    val description: String? = null,
    val logo: String? = null,
    val genre: String? = null,
    @SerialName("culture_id") val cultureId: String? = null,
    @SerialName("current_show") val currentShow: String? = null,
    @SerialName("current_song") val currentSong: String? = null,
)

/** Response from GET /api/v1/radio/{station_id} */
@Serializable
data class RadioStationDetail(
    val id: String,
    val name: String? = null,
    val description: String? = null,
    val logo: String? = null,
    val genre: String? = null,
    @SerialName("current_show") val currentShow: String? = null,
    @SerialName("current_song") val currentSong: String? = null,
)

/** Response from GET /api/v1/radio/{station_id}/stream */
@Serializable
data class RadioStreamResponse(
    val url: String,
    val type: String,
)
