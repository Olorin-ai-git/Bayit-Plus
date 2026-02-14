package tv.bayit.plus.core.data.repository

import tv.bayit.plus.core.common.BayitResult

interface SeriesRepository {
    suspend fun getSeries(): BayitResult<List<Any>>
    suspend fun getSeriesById(seriesId: String): BayitResult<Any>
    suspend fun getSeasons(seriesId: String): BayitResult<List<Any>>
    suspend fun getEpisodes(seriesId: String, seasonNumber: Int): BayitResult<List<Any>>
    suspend fun getNextEpisode(seriesId: String): BayitResult<Any>
}
