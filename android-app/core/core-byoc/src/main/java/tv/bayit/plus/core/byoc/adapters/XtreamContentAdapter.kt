package tv.bayit.plus.core.byoc.adapters

import tv.bayit.plus.core.byoc.models.BYOCCapabilities
import tv.bayit.plus.core.byoc.models.BYOCChannel
import tv.bayit.plus.core.byoc.models.BYOCContentItem
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class XtreamContentAdapter @Inject constructor() {

    fun filterPlayableChannels(channels: List<BYOCChannel>): List<BYOCChannel> {
        return channels.filter { it.streamUrl.isNotBlank() }
    }

    fun filterPlayableItems(items: List<BYOCContentItem>): List<BYOCContentItem> {
        return items.filter { it.streamUrl != null }
    }

    fun getCapabilities(): BYOCCapabilities {
        return BYOCCapabilities(
            dubbing = true,
            liveSubtitles = false,
            trivia = false,
            audioOverlay = false,
        )
    }

    fun isXtreamStream(streamUrl: String): Boolean {
        return streamUrl.contains("/player_api.php") ||
            streamUrl.contains("/live/") ||
            streamUrl.contains("/movie/") ||
            streamUrl.contains("/series/")
    }
}
