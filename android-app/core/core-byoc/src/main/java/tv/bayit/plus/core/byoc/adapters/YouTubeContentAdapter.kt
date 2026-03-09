package tv.bayit.plus.core.byoc.adapters

import tv.bayit.plus.core.byoc.models.BYOCCapabilities
import tv.bayit.plus.core.byoc.models.BYOCContentItem
import tv.bayit.plus.core.byoc.models.BYOCContentType
import tv.bayit.plus.core.byoc.models.BYOCSourceType
import tv.bayit.plus.core.byoc.models.YouTubeVideo
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class YouTubeContentAdapter @Inject constructor() {

    fun toContentItems(videos: List<YouTubeVideo>, sourceId: String): List<BYOCContentItem> {
        return videos.map { video ->
            BYOCContentItem(
                id = "${sourceId}_${video.id}",
                title = video.title,
                description = video.description,
                thumbnailUrl = video.thumbnailUrl,
                backdropUrl = null,
                duration = parseDuration(video.duration),
                year = null,
                genre = video.channelTitle,
                sourceType = BYOCSourceType.YOUTUBE,
                sourceId = sourceId,
                streamUrl = "https://www.youtube.com/watch?v=${video.id}",
                contentType = if (video.liveBroadcastContent == "live") {
                    BYOCContentType.LIVE_CHANNEL
                } else {
                    BYOCContentType.VIDEO
                },
            )
        }
    }

    fun getCapabilities(): BYOCCapabilities {
        return BYOCCapabilities(
            dubbing = true,
            liveSubtitles = true,
            trivia = false,
            audioOverlay = true,
        )
    }

    fun isYouTubeStream(streamUrl: String): Boolean {
        return streamUrl.contains("youtube.com/watch") ||
            streamUrl.contains("youtu.be/")
    }

    private fun parseDuration(isoDuration: String?): Int? {
        if (isoDuration == null) return null
        val regex = Regex("""PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?""")
        val match = regex.matchEntire(isoDuration) ?: return null
        val hours = match.groupValues[1].toIntOrNull() ?: 0
        val minutes = match.groupValues[2].toIntOrNull() ?: 0
        val seconds = match.groupValues[3].toIntOrNull() ?: 0
        return hours * SECONDS_PER_HOUR + minutes * SECONDS_PER_MINUTE + seconds
    }

    companion object {
        private const val SECONDS_PER_HOUR = 3600
        private const val SECONDS_PER_MINUTE = 60
    }
}
