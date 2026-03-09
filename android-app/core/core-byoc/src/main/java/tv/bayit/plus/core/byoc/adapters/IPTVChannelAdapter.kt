package tv.bayit.plus.core.byoc.adapters

import tv.bayit.plus.core.byoc.models.BYOCCapabilities
import tv.bayit.plus.core.byoc.models.BYOCChannel
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class IPTVChannelAdapter @Inject constructor() {

    fun filterPlayable(channels: List<BYOCChannel>): List<BYOCChannel> {
        return channels.filter { it.streamUrl.isNotBlank() }
    }

    fun getCapabilities(): BYOCCapabilities {
        return BYOCCapabilities(
            dubbing = true,
            liveSubtitles = false,
            trivia = false,
            audioOverlay = false,
        )
    }

    fun isIPTVStream(streamUrl: String): Boolean {
        return streamUrl.endsWith(".m3u8") ||
            streamUrl.endsWith(".ts") ||
            streamUrl.contains("/live/")
    }
}
