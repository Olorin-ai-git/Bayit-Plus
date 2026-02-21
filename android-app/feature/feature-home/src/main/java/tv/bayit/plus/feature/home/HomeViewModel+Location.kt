package tv.bayit.plus.feature.home

import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.location.cacheLocation
import tv.bayit.plus.core.location.markPermissionRequested
import tv.bayit.plus.core.model.IsraeliBusinessesResponse
import tv.bayit.plus.core.model.IsraelisInCityResponse

internal suspend fun HomeViewModel.loadIsraelisInCity(): IsraelisInCityResponse? {
    val userLocation = getUserLocation() ?: return null

    return try {
        when (val result = contentRepository.getIsraelisInCity(
            city = userLocation.city,
            state = userLocation.state,
            county = userLocation.county,
        )) {
            is BayitResult.Success -> result.data as? IsraelisInCityResponse
            else -> null
        }
    } catch (e: Exception) {
        logger.debug("Failed to load Israelis in city (non-blocking)", mapOf("error" to e.message.orEmpty()))
        null
    }
}

internal suspend fun HomeViewModel.loadIsraeliBusinesses(): IsraeliBusinessesResponse? {
    val userLocation = getUserLocation() ?: return null

    return try {
        when (val result = contentRepository.getIsraeliBusinesses(
            city = userLocation.city,
            state = userLocation.state,
            county = userLocation.county,
        )) {
            is BayitResult.Success -> result.data as? IsraeliBusinessesResponse
            else -> null
        }
    } catch (e: Exception) {
        logger.debug("Failed to load Israeli businesses (non-blocking)", mapOf("error" to e.message.orEmpty()))
        null
    }
}

internal suspend fun HomeViewModel.getUserLocation(): tv.bayit.plus.core.model.UserLocation? {
    locationManager.getCachedLocation()?.let { cached ->
        logger.debug("Using cached location", mapOf("city" to cached.city, "state" to cached.state))
        updateState { copy(localLocationLabel = "${cached.city}, ${cached.state}") }
        return cached
    }

    if (!locationManager.hasLocationPermission()) {
        logger.debug("Location permission not granted")
        return null
    }

    val deviceLocation = locationManager.getLastKnownLocation()
        ?: locationManager.getCurrentLocation()
        ?: run {
            logger.debug("Could not get device location")
            return null
        }

    val userLocation = locationManager.reverseGeocode(
        latitude = deviceLocation.latitude,
        longitude = deviceLocation.longitude,
    ) { lat, lon ->
        when (val result = locationRepository.reverseGeocode(lat, lon)) {
            is BayitResult.Success -> result.data
            else -> null
        }
    } ?: return null

    locationManager.cacheLocation(userLocation)
    updateState { copy(localLocationLabel = "${userLocation.city}, ${userLocation.state}") }

    return userLocation
}

fun HomeViewModel.markLocationPermissionRequested() {
    locationManager.markPermissionRequested()
}

fun HomeViewModel.onLocationPermissionGranted() {
    updateState { copy(locationPermissionNeeded = false, locationPermissionPreviouslyDenied = false) }
    launchSection { loadIsraelisInCity().let { data -> updateState { copy(israelisInCity = data) } } }
    launchSection { loadIsraeliBusinesses().let { data -> updateState { copy(israeliBusinesses = data) } } }
}

fun HomeViewModel.onLocationPermissionDenied() {
    locationManager.markPermissionRequested()
    updateState { copy(locationPermissionPreviouslyDenied = true) }
}

fun HomeViewModel.recheckLocationPermission() {
    if (locationManager.hasLocationPermission()) onLocationPermissionGranted()
}
