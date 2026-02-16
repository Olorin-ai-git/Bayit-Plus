package tv.bayit.plus.feature.player

import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.data.repository.ContentRepository
import tv.bayit.plus.core.data.repository.LiveTVRepository
import tv.bayit.plus.core.data.repository.MediaRepository
import tv.bayit.plus.core.data.repository.PodcastRepository
import tv.bayit.plus.core.data.repository.RadioRepository
import tv.bayit.plus.core.model.ChannelDetail
import tv.bayit.plus.core.model.ContentDetail
import tv.bayit.plus.core.model.PodcastEpisodeItem
import javax.inject.Inject

/**
 * Resolves stream URLs and metadata for the player from multiple content sources.
 *
 * Delegates to the appropriate repository based on content type (live TV, radio,
 * podcast, or VOD) and returns a uniform result for the player to consume.
 */
class PlayerContentResolver @Inject constructor(
    private val mediaRepository: MediaRepository,
    private val contentRepository: ContentRepository,
    private val liveTVRepository: LiveTVRepository,
    private val radioRepository: RadioRepository,
    private val podcastRepository: PodcastRepository,
) {
    suspend fun resolveStreamUrl(
        contentId: String,
        contentType: String,
    ): BayitResult<String> = when {
        contentType in LIVE_CONTENT_TYPES -> liveTVRepository.getStreamUrl(contentId)
        contentType == CONTENT_TYPE_RADIO -> radioRepository.getStreamUrl(contentId)
        contentType in PODCAST_CONTENT_TYPES -> resolvePodcastAudioUrl(contentId)
        else -> mediaRepository.getPlaybackUrl(contentId)
    }

    suspend fun resolveMetadata(
        contentId: String,
        contentType: String,
    ): Pair<String, String?> = when {
        contentType in LIVE_CONTENT_TYPES -> resolveLiveMetadata(contentId)
        contentType == CONTENT_TYPE_RADIO -> resolveRadioMetadata(contentId)
        contentType in PODCAST_CONTENT_TYPES -> resolvePodcastMetadata(contentId)
        else -> resolveVodMetadata(contentId)
    }

    fun isLiveContent(contentType: String): Boolean =
        contentType in LIVE_CONTENT_TYPES || contentType == CONTENT_TYPE_RADIO

    private suspend fun resolvePodcastAudioUrl(episodeId: String): BayitResult<String> =
        when (val result = podcastRepository.getEpisode(episodeId)) {
            is BayitResult.Success -> {
                val url = (result.data as? PodcastEpisodeItem)?.audioUrl
                if (url.isNullOrEmpty()) {
                    BayitResult.Error(IllegalStateException("No audio URL for episode $episodeId"))
                } else {
                    BayitResult.Success(url)
                }
            }
            is BayitResult.Error -> result
            is BayitResult.Loading -> BayitResult.Loading
        }

    private suspend fun resolveLiveMetadata(contentId: String): Pair<String, String?> =
        when (val result = liveTVRepository.getChannel(contentId)) {
            is BayitResult.Success -> {
                val channel = result.data as? ChannelDetail
                (channel?.name.orEmpty()) to channel?.description
            }
            else -> "" to null
        }

    private suspend fun resolveRadioMetadata(contentId: String): Pair<String, String?> =
        when (val result = radioRepository.getStation(contentId)) {
            is BayitResult.Success -> {
                val name = (result.data as? Map<*, *>)?.get("name")?.toString().orEmpty()
                name to null
            }
            else -> "" to null
        }

    private suspend fun resolvePodcastMetadata(contentId: String): Pair<String, String?> =
        when (val result = podcastRepository.getEpisode(contentId)) {
            is BayitResult.Success -> {
                val episode = result.data as? PodcastEpisodeItem
                (episode?.title.orEmpty()) to episode?.description
            }
            else -> "" to null
        }

    private suspend fun resolveVodMetadata(contentId: String): Pair<String, String?> =
        when (val result = contentRepository.getContentById(contentId)) {
            is BayitResult.Success -> {
                val detail = result.data as? ContentDetail
                (detail?.title.orEmpty()) to detail?.description
            }
            else -> "" to null
        }

    companion object {
        val LIVE_CONTENT_TYPES = setOf("live", "live_tv", "channel")
        val PODCAST_CONTENT_TYPES = setOf("podcast", "podcast_episode")
        const val CONTENT_TYPE_RADIO = "radio"
    }
}
