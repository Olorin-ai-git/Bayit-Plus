package tv.bayit.plus.feature.culture.shabbat.models

data class ShabbatZmanData(
    val candleLightingTimeMs: Long,
    val havdalahTimeMs: Long,
    val parasha: String,
    val isShabbatActive: Boolean,
    val locationName: String,
    val latitude: Double,
    val longitude: Double,
    val lastUpdatedMs: Long,
)
