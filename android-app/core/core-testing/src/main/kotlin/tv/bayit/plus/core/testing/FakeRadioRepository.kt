package tv.bayit.plus.core.testing

import tv.bayit.plus.core.common.BayitResult

/**
 * Fake implementation of RadioRepository for testing.
 *
 * Provides controllable radio station data and streaming functionality for tests.
 */
class FakeRadioRepository {

    private val stations = mutableListOf<Any>()
    private val favoriteStationIds = mutableSetOf<String>()
    private val nowPlaying = mutableMapOf<String, Any>()

    var shouldReturnError = false
    var errorMessage = "Radio repository error"

    /**
     * Get all radio stations.
     */
    suspend fun getStations(): BayitResult<List<Any>> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            BayitResult.Success(stations.toList())
        }
    }

    /**
     * Get radio station by ID.
     */
    suspend fun getStation(stationId: String): BayitResult<Any> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            val station = stations.find {
                (it as? Map<*, *>)?.get("id") == stationId
            }
            if (station != null) {
                BayitResult.Success(station)
            } else {
                BayitResult.Error(Exception("Station not found: $stationId"))
            }
        }
    }

    /**
     * Get stream URL for a radio station.
     */
    suspend fun getStreamUrl(stationId: String): BayitResult<String> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            BayitResult.Success("https://stream.example.com/radio/$stationId")
        }
    }

    /**
     * Get currently playing information for a station.
     */
    suspend fun getNowPlaying(stationId: String): BayitResult<Any> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            val playing = nowPlaying[stationId] ?: mapOf(
                "title" to "Unknown",
                "artist" to "Unknown"
            )
            BayitResult.Success(playing)
        }
    }

    /**
     * Get favorite radio stations.
     */
    suspend fun getFavoriteStations(): BayitResult<List<Any>> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            val favorites = stations.filter { station ->
                (station as? Map<*, *>)?.get("id")?.toString() in favoriteStationIds
            }
            BayitResult.Success(favorites)
        }
    }

    /**
     * Toggle favorite status for a station.
     */
    suspend fun toggleFavorite(stationId: String): BayitResult<Boolean> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            val isFavorite = if (stationId in favoriteStationIds) {
                favoriteStationIds.remove(stationId)
                false
            } else {
                favoriteStationIds.add(stationId)
                true
            }
            BayitResult.Success(isFavorite)
        }
    }

    // Test utility methods

    fun setStations(stationsList: List<Any>) {
        stations.clear()
        stations.addAll(stationsList)
    }

    fun addStation(station: Any) {
        stations.add(station)
    }

    fun setNowPlaying(stationId: String, nowPlayingData: Any) {
        nowPlaying[stationId] = nowPlayingData
    }

    fun setFavorites(stationIds: Set<String>) {
        favoriteStationIds.clear()
        favoriteStationIds.addAll(stationIds)
    }

    fun clear() {
        stations.clear()
        favoriteStationIds.clear()
        nowPlaying.clear()
        shouldReturnError = false
    }
}
