package tv.bayit.plus.core.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/** Response from GET /api/v1/live/channels */
@Serializable
data class ChannelsResponse(
    val channels: List<LiveChannelItem> = emptyList(),
    val total: Int,
)

/** A live TV channel. */
@Serializable
data class LiveChannelItem(
    val id: String,
    val name: String? = null,
    val description: String? = null,
    val thumbnail: String? = null,
    val logo: String? = null,
    val category: String? = null,
    @SerialName("culture_id") val cultureId: String? = null,
    @SerialName("current_show") val currentShow: String? = null,
    @SerialName("next_show") val nextShow: String? = null,
    @SerialName("stream_type") val streamType: String? = null,
    @SerialName("is_ai_enhanced") val isAiEnhanced: Boolean? = null,
    @SerialName("ai_features") val aiFeatures: List<String>? = null,
    @SerialName("supports_pip_widget") val supportsPipWidget: Boolean? = null,
    @SerialName("dubbing_enabled") val dubbingEnabled: Boolean? = null,
    @SerialName("subtitles_enabled") val subtitlesEnabled: Boolean? = null,
    @SerialName("trivia_enabled") val triviaEnabled: Boolean? = null,
    @SerialName("catchup_enabled") val catchupEnabled: Boolean? = null,
    @SerialName("catchup_days") val catchupDays: Int? = null,
    @SerialName("supported_subtitle_languages")
    val supportedSubtitleLanguages: List<String>? = null,
    @SerialName("supported_dubbing_languages")
    val supportedDubbingLanguages: List<String>? = null,
)

/** Response from GET /api/v1/live/{channel_id} */
@Serializable
data class ChannelDetail(
    val id: String,
    val name: String? = null,
    val description: String? = null,
    val thumbnail: String? = null,
    val logo: String? = null,
    @SerialName("stream_url") val streamUrl: String? = null,
    @SerialName("stream_type") val streamType: String? = null,
    @SerialName("current_show") val currentShow: String? = null,
    @SerialName("next_show") val nextShow: String? = null,
    @SerialName("supports_live_subtitles") val supportsLiveSubtitles: Boolean? = null,
    @SerialName("primary_language") val primaryLanguage: String? = null,
    @SerialName("available_translation_languages")
    val availableTranslationLanguages: List<String>? = null,
    val schedule: List<ScheduleEntry>? = null,
)

/** A schedule entry in the EPG. */
@Serializable
data class ScheduleEntry(
    val title: String? = null,
    val description: String? = null,
    val time: String? = null,
    @SerialName("end_time") val endTime: String? = null,
    @SerialName("is_now") val isNow: Boolean? = null,
) {
    /** Stable identifier derived from title and time. */
    val stableId: String get() = "${title.orEmpty()}-${time.orEmpty()}"
}

/** Response from GET /api/v1/live/{channel_id}/epg */
@Serializable
data class ChannelEPGResponse(
    @SerialName("channel_id") val channelId: String,
    val date: String,
    val entries: List<EPGEntry> = emptyList(),
)

/** An EPG entry. */
@Serializable
data class EPGEntry(
    val title: String? = null,
    val description: String? = null,
    val start: String? = null,
    val end: String? = null,
    val category: String? = null,
    val thumbnail: String? = null,
    @SerialName("is_now") val isNow: Boolean? = null,
    @SerialName("has_catch_up") val hasCatchUp: Boolean? = null,
    @SerialName("has_dubbing") val hasDubbing: Boolean? = null,
    @SerialName("has_subtitles") val hasSubtitles: Boolean? = null,
    val rating: String? = null,
) {
    /** Stable identifier derived from title and start time. */
    val stableId: String get() = "${title.orEmpty()}-${start.orEmpty()}"
}

/** Response from GET /api/v1/live/{channel_id}/stream */
@Serializable
data class LiveStreamResponse(
    val url: String? = null,
    @SerialName("stream_url") val streamUrl: String? = null,
    val type: String? = null,
    @SerialName("stream_type") val streamType: String? = null,
    @SerialName("is_drm_protected") val isDrmProtected: Boolean? = null,
    @SerialName("is_ai_enhanced") val isAiEnhanced: Boolean? = null,
    @SerialName("ai_features") val aiFeatures: List<String>? = null,
    @SerialName("supports_pip_widget") val supportsPipWidget: Boolean? = null,
) {
    /** Resolved stream URL - checks all possible fields. */
    val resolvedUrl: String? get() = url ?: streamUrl
}
