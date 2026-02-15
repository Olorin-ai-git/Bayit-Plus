package tv.bayit.plus.core.testing

import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.data.repository.RadioRepository
import tv.bayit.plus.core.model.RadioStationItem
import tv.bayit.plus.core.model.RadioStationDetail

/**
 * Fake implementation of RadioRepository for testing.
 *
 * Provides controllable radio station data and streaming functionality for tests.
 */
class FakeRadioRepository : RadioRepository {

    private val stations = mutableListOf<RadioStationItem>()
    private val stationDetails = mutableMapOf<String, RadioStationDetail>()
    private val favoriteStationIds = mutableSetOf<String>()

    var shouldReturnError = false
    var errorMessage = "Radio repository error"

    override suspend fun getStations(): BayitResult<List<Any>> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            BayitResult.Success(stations.toList())
        }
    }

    override suspend fun getStation(stationId: String): BayitResult<Any> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            val detail = stationDetails[stationId]
            if (detail != null) {
                BayitResult.Success(detail)
            } else {
                BayitResult.Error(Exception("Station not found: $stationId"))
            }
        }
    }

    override suspend fun getStreamUrl(stationId: String): BayitResult<String> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            BayitResult.Success("https://stream.example.com/radio/$stationId")
        }
    }

    override suspend fun getNowPlaying(stationId: String): BayitResult<Any> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            val detail = stationDetails[stationId] ?: RadioStationDetail(
                id = stationId,
                name = "Unknown Station",
                currentSong = "Unknown"
            )
            BayitResult.Success(detail)
        }
    }

    override suspend fun getFavoriteStations(): BayitResult<List<Any>> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            val favorites = stations.filter { it.id in favoriteStationIds }
            BayitResult.Success(favorites)
        }
    }

    override suspend fun toggleFavorite(stationId: String): BayitResult<Boolean> {
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

    fun setStations(stationsList: List<RadioStationItem>) {
        stations.clear()
        stations.addAll(stationsList)
    }

    fun addStation(station: RadioStationItem) {
        stations.add(station)
    }

    fun setStationDetail(stationId: String, detail: RadioStationDetail) {
        stationDetails[stationId] = detail
    }

    fun setFavorites(stationIds: Set<String>) {
        favoriteStationIds.clear()
        favoriteStationIds.addAll(stationIds)
    }

    fun clear() {
        stations.clear()
        stationDetails.clear()
        favoriteStationIds.clear()
        shouldReturnError = false
    }
}
