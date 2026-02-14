package tv.bayit.plus.core.data.repository

import tv.bayit.plus.core.common.BayitResult

interface RadioRepository {
    suspend fun getStations(): BayitResult<List<Any>>
    suspend fun getStation(stationId: String): BayitResult<Any>
    suspend fun getStreamUrl(stationId: String): BayitResult<String>
    suspend fun getNowPlaying(stationId: String): BayitResult<Any>
    suspend fun getFavoriteStations(): BayitResult<List<Any>>
    suspend fun toggleFavorite(stationId: String): BayitResult<Boolean>
}
