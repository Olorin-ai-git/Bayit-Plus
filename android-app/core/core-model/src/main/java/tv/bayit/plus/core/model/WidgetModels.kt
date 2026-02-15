package tv.bayit.plus.core.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * Type of widget (system-provided or user-created)
 */
@Serializable
enum class WidgetType {
    @SerialName("system")
    SYSTEM,

    @SerialName("personal")
    PERSONAL
}

/**
 * Content type a widget can display
 */
@Serializable
enum class WidgetContentType {
    @SerialName("live_channel")
    LIVE_CHANNEL,

    @SerialName("iframe")
    IFRAME,

    @SerialName("podcast")
    PODCAST,

    @SerialName("vod")
    VOD,

    @SerialName("radio")
    RADIO,

    @SerialName("live")
    LIVE,

    @SerialName("custom")
    CUSTOM,

    @SerialName("audiobook")
    AUDIOBOOK;

    val iconName: String
        get() = when (this) {
            LIVE_CHANNEL, LIVE -> "tv"
            PODCAST -> "mic"
            RADIO -> "radio"
            VOD -> "film"
            AUDIOBOOK -> "book"
            IFRAME -> "globe"
            CUSTOM -> "grid_view"
        }

    val displayLabel: String
        get() = when (this) {
            LIVE_CHANNEL -> "Live Channel"
            IFRAME -> "Web"
            PODCAST -> "Podcast"
            VOD -> "VOD"
            RADIO -> "Radio"
            LIVE -> "Live"
            CUSTOM -> "Custom"
            AUDIOBOOK -> "Audiobook"
        }
}

/**
 * Position and sizing of a widget on the dock grid
 */
@Serializable
data class WidgetPosition(
    val x: Double,
    val y: Double,
    val width: Int,
    val height: Int,
    @SerialName("z_index")
    val zIndex: Int? = null,
)

/**
 * Content configuration within a widget
 */
@Serializable
data class WidgetContent(
    @SerialName("content_type")
    val contentType: WidgetContentType? = null,
    @SerialName("live_channel_id")
    val liveChannelId: String? = null,
    @SerialName("podcast_id")
    val podcastId: String? = null,
    @SerialName("content_id")
    val contentId: String? = null,
    @SerialName("station_id")
    val stationId: String? = null,
    @SerialName("audiobook_id")
    val audiobookId: String? = null,
    @SerialName("iframe_url")
    val iframeUrl: String? = null,
    @SerialName("iframe_title")
    val iframeTitle: String? = null,
    @SerialName("component_name")
    val componentName: String? = null,
)

/**
 * A single widget belonging to the user
 */
@Serializable
data class WidgetItem(
    val id: String,
    @SerialName("user_id")
    val userId: String? = null,
    val title: String,
    val description: String? = null,
    val type: WidgetType,
    @SerialName("system_widget_id")
    val systemWidgetId: String? = null,
    val icon: String? = null,
    val position: WidgetPosition? = null,
    val content: WidgetContent? = null,
    @SerialName("is_visible")
    val isVisible: Boolean? = null,
    @SerialName("is_minimized")
    val isMinimized: Boolean? = null,
    @SerialName("cover_url")
    val coverUrl: String? = null,
    @SerialName("created_at")
    val createdAt: String? = null,
    @SerialName("updated_at")
    val updatedAt: String? = null,
)

/**
 * Response from GET /api/v1/widgets
 */
@Serializable
data class WidgetsListResponse(
    val items: List<WidgetItem>,
    val total: Int,
)
