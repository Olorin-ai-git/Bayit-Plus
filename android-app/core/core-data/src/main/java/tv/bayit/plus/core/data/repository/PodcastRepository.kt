package tv.bayit.plus.core.data.repository

import tv.bayit.plus.core.common.BayitResult

interface PodcastRepository {
    suspend fun getPodcasts(): BayitResult<List<Any>>
    suspend fun getPodcast(podcastId: String): BayitResult<Any>
    suspend fun getEpisodes(podcastId: String): BayitResult<List<Any>>
    suspend fun getEpisode(episodeId: String): BayitResult<Any>
    suspend fun getSubscriptions(): BayitResult<List<Any>>
    suspend fun subscribe(podcastId: String): BayitResult<Unit>
    suspend fun unsubscribe(podcastId: String): BayitResult<Unit>
}
