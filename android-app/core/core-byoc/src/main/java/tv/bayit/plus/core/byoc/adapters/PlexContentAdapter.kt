package tv.bayit.plus.core.byoc.adapters

import tv.bayit.plus.core.byoc.models.BYOCCapabilities
import tv.bayit.plus.core.byoc.models.BYOCContentItem
import tv.bayit.plus.core.byoc.models.BYOCSourceType
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class PlexContentAdapter @Inject constructor() {

    fun filterPlayable(items: List<BYOCContentItem>): List<BYOCContentItem> {
        return items.filter { it.streamUrl != null }
    }

    fun getCapabilities(): BYOCCapabilities {
        return BYOCCapabilities(
            dubbing = true,
            liveSubtitles = true,
            trivia = false,
            audioOverlay = true,
        )
    }

    fun isPlexStream(streamUrl: String): Boolean {
        return streamUrl.contains("X-Plex-Token=") ||
            streamUrl.contains("/video/:/transcode/") ||
            streamUrl.contains(":$DEFAULT_PLEX_PORT/")
    }

    companion object {
        private const val DEFAULT_PLEX_PORT = 32400
    }
}
