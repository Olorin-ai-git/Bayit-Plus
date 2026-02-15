package tv.bayit.plus.core.testing

import tv.bayit.plus.core.common.BayitResult

/**
 * Fake implementation of SeriesRepository for testing.
 *
 * Provides controllable TV series data with seasons and episodes.
 */
class FakeSeriesRepository {

    private val seriesList = mutableListOf<Any>()
    private val seasons = mutableMapOf<String, List<Any>>()
    private val episodes = mutableMapOf<String, MutableMap<Int, List<Any>>>()

    var shouldReturnError = false
    var errorMessage = "Series repository error"

    /**
     * Get all TV series.
     */
    suspend fun getSeries(): BayitResult<List<Any>> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            BayitResult.Success(seriesList.toList())
        }
    }

    /**
     * Get series by ID.
     */
    suspend fun getSeriesById(seriesId: String): BayitResult<Any> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            val series = seriesList.find {
                (it as? Map<*, *>)?.get("id") == seriesId
            }
            if (series != null) {
                BayitResult.Success(series)
            } else {
                BayitResult.Error(Exception("Series not found: $seriesId"))
            }
        }
    }

    /**
     * Get seasons for a series.
     */
    suspend fun getSeasons(seriesId: String): BayitResult<List<Any>> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            BayitResult.Success(seasons[seriesId] ?: emptyList())
        }
    }

    /**
     * Get episodes for a specific season.
     */
    suspend fun getEpisodes(seriesId: String, seasonNumber: Int): BayitResult<List<Any>> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            val seasonEpisodes = episodes[seriesId]?.get(seasonNumber) ?: emptyList()
            BayitResult.Success(seasonEpisodes)
        }
    }

    /**
     * Get next episode to watch for a series.
     */
    suspend fun getNextEpisode(seriesId: String): BayitResult<Any> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            val allEpisodes = episodes[seriesId]?.values?.flatten() ?: emptyList()
            val nextEpisode = allEpisodes.firstOrNull() ?: mapOf(
                "id" to "next-episode-$seriesId",
                "title" to "Next Episode",
                "seasonNumber" to 1,
                "episodeNumber" to 1
            )
            BayitResult.Success(nextEpisode)
        }
    }

    // Test utility methods

    fun setSeries(series: List<Any>) {
        seriesList.clear()
        seriesList.addAll(series)
    }

    fun addSeries(series: Any) {
        seriesList.add(series)
    }

    fun setSeasons(seriesId: String, seasonsList: List<Any>) {
        seasons[seriesId] = seasonsList
    }

    fun setEpisodes(seriesId: String, seasonNumber: Int, episodesList: List<Any>) {
        episodes.getOrPut(seriesId) { mutableMapOf() }[seasonNumber] = episodesList
    }

    fun clear() {
        seriesList.clear()
        seasons.clear()
        episodes.clear()
        shouldReturnError = false
    }
}
