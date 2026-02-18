package tv.bayit.plus.core.data.repository.impl

import retrofit2.http.GET
import retrofit2.http.Query
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.runCatchingResult
import tv.bayit.plus.core.data.repository.LocationRepository
import tv.bayit.plus.core.model.ReverseGeocodeResult
import tv.bayit.plus.core.network.api.BayitApiClient

/**
 * Production implementation of LocationRepository backed by Retrofit.
 */
class ApiLocationRepository(
    private val client: BayitApiClient,
) : LocationRepository {

    private val service: LocationService = client.createService()

    override suspend fun reverseGeocode(
        latitude: Double,
        longitude: Double,
    ): BayitResult<ReverseGeocodeResult> = runCatchingResult {
        val response = client.safeApiCall {
            service.reverseGeocode(latitude, longitude)
        }
        ReverseGeocodeResult(
            city = response.city,
            state = response.state,
            county = response.county,
            latitude = response.latitude,
            longitude = response.longitude,
        )
    }
}

private interface LocationService {

    @GET("api/v1/location/reverse-geocode")
    suspend fun reverseGeocode(
        @Query("latitude") latitude: Double,
        @Query("longitude") longitude: Double,
    ): ReverseGeocodeResponse
}

@kotlinx.serialization.Serializable
private data class ReverseGeocodeResponse(
    val city: String,
    val state: String,
    val county: String?,
    val latitude: Double,
    val longitude: Double,
)
