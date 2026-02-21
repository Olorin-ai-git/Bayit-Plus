package tv.bayit.plus.feature.home

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import kotlinx.coroutines.delay
import tv.bayit.plus.designsystem.modifier.glassMorphism
import tv.bayit.plus.designsystem.theme.DesignTokens
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale
import java.util.TimeZone

@Composable
internal fun CultureClock(
    flagText: String,
    locationLabel: String,
    timezoneId: String,
    isIsraeli: Boolean,
    modifier: Modifier = Modifier,
) {
    var currentTime by remember { mutableStateOf(getCurrentTime(timezoneId)) }

    LaunchedEffect(timezoneId) {
        while (true) {
            delay(1000L)
            currentTime = getCurrentTime(timezoneId)
        }
    }

    Column(
        modifier = modifier
            .glassMorphism()
            .padding(DesignTokens.Spacing.sm),
        horizontalAlignment = Alignment.Start,
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.xs),
        ) {
            Text(
                text = flagText,
                style = MaterialTheme.typography.titleMedium,
            )
            Text(
                text = currentTime.time,
                style = MaterialTheme.typography.headlineSmall,
                color = if (isIsraeli) DesignTokens.Colors.Primary.p400
                else DesignTokens.Colors.Text.primary,
                fontWeight = FontWeight.Bold,
            )
        }
        Spacer(modifier = Modifier.height(DesignTokens.Spacing.xxs))
        Text(
            text = locationLabel,
            style = MaterialTheme.typography.bodySmall,
            color = DesignTokens.Colors.Text.secondary,
        )
        Text(
            text = currentTime.date,
            style = MaterialTheme.typography.bodySmall,
            color = DesignTokens.Colors.Text.muted,
        )
    }
}

private data class TimeDisplay(
    val time: String,
    val date: String,
)

private fun getCurrentTime(timezoneId: String): TimeDisplay {
    val calendar = Calendar.getInstance(TimeZone.getTimeZone(timezoneId))
    val timeFormat = SimpleDateFormat("h:mm a", Locale.getDefault())
    val dateFormat = SimpleDateFormat("EEE, MMM d", Locale.getDefault())

    timeFormat.timeZone = TimeZone.getTimeZone(timezoneId)
    dateFormat.timeZone = TimeZone.getTimeZone(timezoneId)

    return TimeDisplay(
        time = timeFormat.format(calendar.time),
        date = dateFormat.format(calendar.time),
    )
}
