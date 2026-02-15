package tv.bayit.plus.core.testing

import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.flowOf
import tv.bayit.plus.core.model.PodcastModels

/**
 * Fake implementation of PodcastRepository for testing.
 */
class FakePodcastRepository {

    private val _podcasts = MutableStateFlow<List<PodcastModels.Podcast>>(emptyList())
    private val _episodes = MutableStateFlow<Map<String, List<PodcastModels.Episode>>>(emptyMap())

    var shouldThrowError = false
    var errorMessage = "Test error"

    /**
     * Get all podcasts.
     */
    fun getPodcasts(): Flow<List<PodcastModels.Podcast>> {
        if (shouldThrowError) throw Exception(errorMessage)
        return _podcasts
    }

    /**
     * Get podcast by ID.
     */
    fun getPodcastById(id: String): Flow<PodcastModels.Podcast?> {
        if (shouldThrowError) throw Exception(errorMessage)
        return flowOf(_podcasts.value.find { it.id == id })
    }

    /**
     * Get episodes for a podcast.
     */
    fun getPodcastEpisodes(podcastId: String): Flow<List<PodcastModels.Episode>> {
        if (shouldThrowError) throw Exception(errorMessage)
        return flowOf(_episodes.value[podcastId] ?: emptyList())
    }

    /**
     * Get episode by ID.
     */
    fun getEpisodeById(episodeId: String): Flow<PodcastModels.Episode?> {
        if (shouldThrowError) throw Exception(errorMessage)
        val allEpisodes = _episodes.value.values.flatten()
        return flowOf(allEpisodes.find { it.id == episodeId })
    }

    /**
     * Search podcasts.
     */
    fun searchPodcasts(query: String): Flow<List<PodcastModels.Podcast>> {
        if (shouldThrowError) throw Exception(errorMessage)
        return flowOf(
            _podcasts.value.filter {
                it.title.contains(query, ignoreCase = true) ||
                it.description.contains(query, ignoreCase = true)
            }
        )
    }

    // Test utility methods

    fun setPodcasts(podcasts: List<PodcastModels.Podcast>) {
        _podcasts.value = podcasts
    }

    fun addPodcast(podcast: PodcastModels.Podcast) {
        _podcasts.value = _podcasts.value + podcast
    }

    fun setEpisodes(podcastId: String, episodes: List<PodcastModels.Episode>) {
        _episodes.value = _episodes.value + (podcastId to episodes)
    }

    fun addEpisode(podcastId: String, episode: PodcastModels.Episode) {
        val current = _episodes.value[podcastId] ?: emptyList()
        _episodes.value = _episodes.value + (podcastId to (current + episode))
    }

    fun clear() {
        _podcasts.value = emptyList()
        _episodes.value = emptyMap()
        shouldThrowError = false
    }
}
