package tv.bayit.plus.core.testing

import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.flowOf
import tv.bayit.plus.core.model.PodcastEpisodeItem
import tv.bayit.plus.core.model.PodcastShow

/**
 * Fake implementation of PodcastRepository for testing.
 */
class FakePodcastRepository {

    private val _podcasts = MutableStateFlow<List<PodcastShow>>(emptyList())
    private val _episodes = MutableStateFlow<Map<String, List<PodcastEpisodeItem>>>(emptyMap())

    var shouldThrowError = false
    var errorMessage = "Test error"

    /**
     * Get all podcasts.
     */
    fun getPodcasts(): Flow<List<PodcastShow>> {
        if (shouldThrowError) throw Exception(errorMessage)
        return _podcasts
    }

    /**
     * Get podcast by ID.
     */
    fun getPodcastById(id: String): Flow<PodcastShow?> {
        if (shouldThrowError) throw Exception(errorMessage)
        return flowOf(_podcasts.value.find { it.id == id })
    }

    /**
     * Get episodes for a podcast.
     */
    fun getPodcastEpisodes(podcastId: String): Flow<List<PodcastEpisodeItem>> {
        if (shouldThrowError) throw Exception(errorMessage)
        return flowOf(_episodes.value[podcastId] ?: emptyList())
    }

    /**
     * Get episode by ID.
     */
    fun getEpisodeById(episodeId: String): Flow<PodcastEpisodeItem?> {
        if (shouldThrowError) throw Exception(errorMessage)
        val allEpisodes = _episodes.value.values.flatten()
        return flowOf(allEpisodes.find { it.id == episodeId })
    }

    /**
     * Search podcasts.
     */
    fun searchPodcasts(query: String): Flow<List<PodcastShow>> {
        if (shouldThrowError) throw Exception(errorMessage)
        return flowOf(
            _podcasts.value.filter {
                it.title.orEmpty().contains(query, ignoreCase = true) ||
                it.author.orEmpty().contains(query, ignoreCase = true)
            }
        )
    }

    // Test utility methods

    fun setPodcasts(podcasts: List<PodcastShow>) {
        _podcasts.value = podcasts
    }

    fun addPodcast(podcast: PodcastShow) {
        _podcasts.value = _podcasts.value + podcast
    }

    fun setEpisodes(podcastId: String, episodes: List<PodcastEpisodeItem>) {
        _episodes.value = _episodes.value + (podcastId to episodes)
    }

    fun addEpisode(podcastId: String, episode: PodcastEpisodeItem) {
        val current = _episodes.value[podcastId] ?: emptyList()
        _episodes.value = _episodes.value + (podcastId to (current + episode))
    }

    fun clear() {
        _podcasts.value = emptyList()
        _episodes.value = emptyMap()
        shouldThrowError = false
    }
}
