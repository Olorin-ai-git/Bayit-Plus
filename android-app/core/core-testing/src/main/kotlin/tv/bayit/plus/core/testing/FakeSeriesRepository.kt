package tv.bayit.plus.core.testing

import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.model.SeriesDetail
import tv.bayit.plus.core.model.SeasonSummary
import tv.bayit.plus.core.model.EpisodeItem
import tv.bayit.plus.core.model.ContentItem

/**
 * Fake implementation of SeriesRepository for testing.
 *
 * Provides controllable TV series data with seasons and episodes.
 */
class FakeSeriesRepository {

    private val seriesList = mutableListOf<ContentItem>()
    private val seriesDetails = mutableMapOf<String, SeriesDetail>()
    private val episodes = mutableMapOf<String, MutableMap<Int, List<EpisodeItem>>>()

    var shouldReturnError = false
    var errorMessage = "Series repository error"

    /**
     * Get all TV series.
     */
    suspend fun getSeries(): BayitResult<List<ContentItem>> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            BayitResult.Success(seriesList.toList())
        }
    }

    /**
     * Get series by ID.
     */
    suspend fun getSeriesById(seriesId: String): BayitResult<SeriesDetail> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            val series = seriesDetails[seriesId]
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
    suspend fun getSeasons(seriesId: String): BayitResult<List<SeasonSummary>> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            val series = seriesDetails[seriesId]
            BayitResult.Success(series?.seasons ?: emptyList())
        }
    }

    /**
     * Get episodes for a specific season.
     */
    suspend fun getEpisodes(seriesId: String, seasonNumber: Int): BayitResult<List<EpisodeItem>> {
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
    suspend fun getNextEpisode(seriesId: String): BayitResult<EpisodeItem> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            val allEpisodes = episodes[seriesId]?.values?.flatten() ?: emptyList()
            val nextEpisode = allEpisodes.firstOrNull() ?: EpisodeItem(
                id = "next-episode-$seriesId",
                title = "Next Episode",
                episodeNumber = 1
            )
            BayitResult.Success(nextEpisode)
        }
    }

    // Test utility methods

    fun setSeries(series: List<ContentItem>) {
        seriesList.clear()
        seriesList.addAll(series)
    }

    fun addSeries(series: ContentItem) {
        seriesList.add(series)
    }

    fun setSeriesDetail(seriesId: String, detail: SeriesDetail) {
        seriesDetails[seriesId] = detail
    }

    fun setEpisodes(seriesId: String, seasonNumber: Int, episodesList: List<EpisodeItem>) {
        episodes.getOrPut(seriesId) { mutableMapOf() }[seasonNumber] = episodesList
    }

    fun clear() {
        seriesList.clear()
        seriesDetails.clear()
        episodes.clear()
        shouldReturnError = false
    }
}
