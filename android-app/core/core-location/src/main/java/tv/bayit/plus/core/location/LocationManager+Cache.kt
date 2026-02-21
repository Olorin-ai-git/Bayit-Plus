package tv.bayit.plus.core.location

import tv.bayit.plus.core.model.UserLocation

fun LocationManager.cacheLocation(location: UserLocation) {
    preferences.edit()
        .putString("city", location.city)
        .putString("state", location.state)
        .putString("county", location.county)
        .putFloat("latitude", location.latitude.toFloat())
        .putFloat("longitude", location.longitude.toFloat())
        .putLong("timestamp", location.timestamp)
        .apply()

    logger.info(
        "Location cached",
        mapOf(
            "city" to location.city,
            "state" to location.state,
        ),
    )
}

fun LocationManager.wasPermissionRequested(): Boolean =
    preferences.getBoolean("permission_requested", false)

fun LocationManager.markPermissionRequested() {
    preferences.edit().putBoolean("permission_requested", true).apply()
}

fun LocationManager.clearCache() {
    preferences.edit().clear().apply()
}
