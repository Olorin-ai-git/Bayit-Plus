package tv.bayit.plus.core.data.repository

import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.model.ReverseGeocodeResult

interface LocationRepository {
    suspend fun reverseGeocode(latitude: Double, longitude: Double): BayitResult<ReverseGeocodeResult>
}
