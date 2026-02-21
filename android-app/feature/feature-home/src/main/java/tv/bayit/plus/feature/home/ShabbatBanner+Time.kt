package tv.bayit.plus.feature.home

import tv.bayit.plus.core.model.ShabbatInfo
import java.time.Duration
import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter

internal fun calculateTimeRemaining(
    shabbatInfo: ShabbatInfo,
    currentTime: ZonedDateTime,
): String {
    return try {
        val targetTimeString = if (shabbatInfo.isShabbat) {
            shabbatInfo.havdalah
        } else {
            shabbatInfo.candleLighting
        }

        val targetTime = ZonedDateTime.parse(
            targetTimeString,
            DateTimeFormatter.ISO_DATE_TIME,
        )

        val duration = Duration.between(currentTime, targetTime)

        when {
            duration.isNegative -> "Now"
            duration.toHours() >= 24 -> {
                val days = duration.toDays()
                "${days}d ${duration.toHours() % 24}h"
            }
            duration.toHours() >= 1 -> {
                val hours = duration.toHours()
                val minutes = duration.toMinutes() % 60
                "${hours}h ${minutes}m"
            }
            else -> {
                val minutes = duration.toMinutes()
                val seconds = duration.seconds % 60
                "${minutes}m ${seconds}s"
            }
        }
    } catch (e: Exception) {
        "Unknown"
    }
}
