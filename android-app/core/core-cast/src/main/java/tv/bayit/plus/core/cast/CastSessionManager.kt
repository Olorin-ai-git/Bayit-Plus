package tv.bayit.plus.core.cast

import kotlinx.coroutines.flow.StateFlow
import tv.bayit.plus.core.cast.models.CastDeviceInfo
import tv.bayit.plus.core.cast.models.CastMedia
import tv.bayit.plus.core.cast.models.CastPlaybackState
import tv.bayit.plus.core.cast.models.CastSessionState

interface CastSessionManager {
    val sessionState: StateFlow<CastSessionState>
    val deviceInfo: StateFlow<CastDeviceInfo?>

    fun initialize()
    fun presentDevicePicker()
    fun endSession()
    suspend fun loadMedia(media: CastMedia)
    suspend fun syncPlaybackState(state: CastPlaybackState)
}
