package tv.bayit.plus.core.location

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.location.Location
import androidx.core.content.ContextCompat
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import com.google.android.gms.tasks.CancellationTokenSource
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withTimeout
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.model.ReverseGeocodeResult
import tv.bayit.plus.core.model.UserLocation
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.coroutines.resume

/**
 * Manages device location access and reverse geocoding.
 * Caches location for 24 hours to minimize permission prompts.
 */
@Singleton
class LocationManager @Inject constructor(
    @ApplicationContext private val context: Context,
    internal val logger: BayitLogger,
) {
    private val fusedLocationClient: FusedLocationProviderClient =
        LocationServices.getFusedLocationProviderClient(context)

    internal val preferences = context.getSharedPreferences(
        "bayit_location_cache",
        Context.MODE_PRIVATE,
    )

    private val cacheExpirationMs = 24 * 60 * 60 * 1000L

    /**
     * Checks if location permission is granted.
     */
    fun hasLocationPermission(): Boolean {
        return ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.ACCESS_FINE_LOCATION,
        ) == PackageManager.PERMISSION_GRANTED ||
            ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.ACCESS_COARSE_LOCATION,
            ) == PackageManager.PERMISSION_GRANTED
    }

    /**
     * Gets cached location if available and not expired.
     */
    fun getCachedLocation(): UserLocation? {
        val timestamp = preferences.getLong("timestamp", 0L)
        if (timestamp == 0L || System.currentTimeMillis() - timestamp > cacheExpirationMs) {
            return null
        }

        val city = preferences.getString("city", null) ?: return null
        val state = preferences.getString("state", null) ?: return null
        val county = preferences.getString("county", null)
        val latitude = preferences.getFloat("latitude", 0f).toDouble()
        val longitude = preferences.getFloat("longitude", 0f).toDouble()

        return UserLocation(
            city = city,
            state = state,
            county = county,
            latitude = latitude,
            longitude = longitude,
            timestamp = timestamp,
        )
    }

    /**
     * Gets the last known location (fast, may be stale).
     * Returns null if permission denied or no prior fix exists.
     */
    suspend fun getLastKnownLocation(): Location? {
        if (!hasLocationPermission()) return null

        return try {
            suspendCancellableCoroutine { continuation ->
                fusedLocationClient.lastLocation
                    .addOnSuccessListener { location -> continuation.resume(location) }
                    .addOnFailureListener { continuation.resume(null) }
            }
        } catch (e: Exception) {
            logger.error("Last location fetch failed", e)
            null
        }
    }

    /**
     * Gets device location with timeout.
     * Returns null if permission denied or location unavailable.
     */
    suspend fun getCurrentLocation(): Location? {
        if (!hasLocationPermission()) {
            logger.debug("Location permission not granted")
            return null
        }

        return try {
            withTimeout(10000L) {
                suspendCancellableCoroutine { continuation ->
                    val cancellationTokenSource = CancellationTokenSource()

                    continuation.invokeOnCancellation {
                        cancellationTokenSource.cancel()
                    }

                    fusedLocationClient.getCurrentLocation(
                        Priority.PRIORITY_BALANCED_POWER_ACCURACY,
                        cancellationTokenSource.token,
                    ).addOnSuccessListener { location ->
                        continuation.resume(location)
                    }.addOnFailureListener { exception ->
                        logger.error(
                            "Location fetch failed",
                            exception,
                            mapOf("error" to exception.message.orEmpty()),
                        )
                        continuation.resume(null)
                    }
                }
            }
        } catch (e: Exception) {
            logger.error("Location timeout or error", e)
            null
        }
    }

    /**
     * Reverse geocodes coordinates to city/state using backend API.
     */
    suspend fun reverseGeocode(
        latitude: Double,
        longitude: Double,
        reverseGeocodeCall: suspend (Double, Double) -> ReverseGeocodeResult?,
    ): UserLocation? {
        return try {
            val result = reverseGeocodeCall(latitude, longitude) ?: return null

            UserLocation(
                city = result.city,
                state = result.state,
                county = result.county,
                latitude = result.latitude,
                longitude = result.longitude,
                timestamp = System.currentTimeMillis(),
            )
        } catch (e: Exception) {
            logger.error("Reverse geocode failed", e)
            null
        }
    }

    // cacheLocation, wasPermissionRequested, markPermissionRequested, clearCache are in LocationManager+Cache.kt
}
