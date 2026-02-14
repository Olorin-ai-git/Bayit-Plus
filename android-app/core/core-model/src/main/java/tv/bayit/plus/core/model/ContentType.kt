package tv.bayit.plus.core.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * Content types for player navigation and content classification.
 * Maps to backend content_type / type fields across all API responses.
 */
@Serializable
enum class ContentType {
    @SerialName("live")
    LIVE,

    @SerialName("live_tv")
    LIVE_TV,

    @SerialName("movie")
    MOVIE,

    @SerialName("series")
    SERIES,

    @SerialName("episode")
    EPISODE,

    @SerialName("radio")
    RADIO,

    @SerialName("podcast")
    PODCAST,

    @SerialName("audiobook")
    AUDIOBOOK,

    @SerialName("collection")
    COLLECTION;

    companion object {
        /**
         * Safely parse a content type string, returning null for unknown values.
         * Handles both snake_case backend values and enum name variants.
         */
        fun fromValue(value: String?): ContentType? {
            if (value == null) return null
            return entries.firstOrNull { entry ->
                entry.name.equals(value, ignoreCase = true) ||
                    entry.serialName == value
            }
        }

        private val ContentType.serialName: String
            get() = when (this) {
                LIVE -> "live"
                LIVE_TV -> "live_tv"
                MOVIE -> "movie"
                SERIES -> "series"
                EPISODE -> "episode"
                RADIO -> "radio"
                PODCAST -> "podcast"
                AUDIOBOOK -> "audiobook"
                COLLECTION -> "collection"
            }
    }
}
