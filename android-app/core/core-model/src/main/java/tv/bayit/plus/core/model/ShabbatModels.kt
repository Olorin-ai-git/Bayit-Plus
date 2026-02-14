package tv.bayit.plus.core.model

import kotlinx.serialization.Serializable

@Serializable
data class ShabbatInfo(
    val candleLighting: String,
    val havdalah: String,
    val parashat: String? = null,
    val isShabbat: Boolean = false,
    val location: String? = null,
)
