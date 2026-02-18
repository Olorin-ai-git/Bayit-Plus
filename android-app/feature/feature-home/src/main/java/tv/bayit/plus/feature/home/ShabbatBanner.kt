package tv.bayit.plus.feature.home

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
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
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.delay
import tv.bayit.plus.core.model.ShabbatInfo
import tv.bayit.plus.designsystem.theme.DesignTokens
import java.time.Duration
import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter

/**
 * Shabbat Mode Banner component.
 * Displays during Shabbat with countdown timer and dismissible UI.
 */
@Composable
fun ShabbatBanner(
    shabbatInfo: ShabbatInfo,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier,
) {
    var currentTime by remember { mutableStateOf(ZonedDateTime.now()) }

    LaunchedEffect(Unit) {
        while (true) {
            delay(1000)
            currentTime = ZonedDateTime.now()
        }
    }

    val timeRemaining = calculateTimeRemaining(shabbatInfo, currentTime)
    val statusText = if (shabbatInfo.isShabbat) {
        "Shabbat ends in"
    } else {
        "Shabbat begins in"
    }

    AnimatedVisibility(
        visible = true,
        enter = fadeIn(),
        exit = fadeOut(),
    ) {
        Column(
            modifier = modifier
                .fillMaxWidth()
                .background(
                    Brush.horizontalGradient(
                        colors = listOf(
                            DesignTokens.Colors.Primary.p600.copy(alpha = 0.3f),
                            DesignTokens.Colors.Primary.p400.copy(alpha = 0.2f),
                        ),
                    ),
                    RoundedCornerShape(DesignTokens.Radius.lg),
                )
                .padding(DesignTokens.Spacing.md),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top,
            ) {
                Row(
                    modifier = Modifier.weight(1f),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        text = "🕯️",
                        style = MaterialTheme.typography.headlineMedium,
                    )
                    Spacer(modifier = Modifier.width(DesignTokens.Spacing.md))
                    Column {
                        Text(
                            text = "Shabbat Shalom",
                            style = MaterialTheme.typography.titleLarge,
                            color = DesignTokens.Colors.Text.primary,
                            fontWeight = FontWeight.Bold,
                        )
                        if (shabbatInfo.parashat != null) {
                            Text(
                                text = "Parashat ${shabbatInfo.parashat}",
                                style = MaterialTheme.typography.bodyMedium,
                                color = DesignTokens.Colors.Text.secondary,
                            )
                        }
                    }
                }
                IconButton(
                    onClick = onDismiss,
                    modifier = Modifier.size(DesignTokens.Spacing.xl),
                ) {
                    Icon(
                        imageVector = Icons.Default.Close,
                        contentDescription = "Dismiss Shabbat banner",
                        tint = DesignTokens.Colors.Text.secondary,
                    )
                }
            }

            Spacer(modifier = Modifier.padding(vertical = DesignTokens.Spacing.xs))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column {
                    Text(
                        text = statusText,
                        style = MaterialTheme.typography.bodySmall,
                        color = DesignTokens.Colors.Text.secondary,
                    )
                    Text(
                        text = timeRemaining,
                        style = MaterialTheme.typography.titleMedium,
                        color = DesignTokens.Colors.Text.primary,
                        fontWeight = FontWeight.SemiBold,
                    )
                }

                if (shabbatInfo.location != null) {
                    Text(
                        text = shabbatInfo.location ?: "",
                        style = MaterialTheme.typography.bodySmall,
                        color = DesignTokens.Colors.Text.secondary,
                    )
                }
            }
        }
    }
}

/**
 * Calculates time remaining until candle lighting or havdalah.
 */
private fun calculateTimeRemaining(
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
