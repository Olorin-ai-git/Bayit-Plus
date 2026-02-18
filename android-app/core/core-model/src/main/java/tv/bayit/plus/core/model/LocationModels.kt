package tv.bayit.plus.core.model

/** User's location with city/state information. */
data class UserLocation(
    val city: String,
    val state: String,
    val county: String?,
    val latitude: Double,
    val longitude: Double,
    val timestamp: Long,
)

/** Result from reverse geocoding API. */
data class ReverseGeocodeResult(
    val city: String,
    val state: String,
    val county: String?,
    val latitude: Double,
    val longitude: Double,
)
