package tv.bayit.plus.feature.player.live.ui

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Error
import androidx.compose.material.icons.filled.HourglassEmpty
import androidx.compose.material.icons.filled.NetworkCheck
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.theme.DesignTokens
import tv.bayit.plus.designsystem.theme.glassMorphism

/**
 * Error states for AI features
 */
sealed class LiveAIError {
    data class ConnectionFailed(val retryCount: Int = 0) : LiveAIError()
    data object QuotaExceeded : LiveAIError()
    data class ServerError(val message: String) : LiveAIError()
    data class Reconnecting(val attempt: Int) : LiveAIError()
}

/**
 * Error overlay for Live AI features showing connection issues, quota errors, and reconnection attempts
 */
@Composable
fun LiveAIErrorOverlay(
    error: LiveAIError?,
    onDismiss: () -> Unit,
    onRetry: () -> Unit,
    modifier: Modifier = Modifier
) {
    AnimatedVisibility(
        visible = error != null,
        enter = fadeIn(),
        exit = fadeOut(),
        modifier = modifier
    ) {
        error?.let { currentError ->
            Column(
                modifier = Modifier
                    .padding(DesignTokens.Spacing.base)
                    .glassMorphism(
                        cornerRadius = DesignTokens.Radius.lg,
                        alpha = 0.95f,
                        borderAlpha = 0.3f
                    )
                    .padding(DesignTokens.Spacing.base),
                verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm)
            ) {
                Row(
                    modifier = Modifier.align(Alignment.End),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.weight(1f)
                    ) {
                        Icon(
                            imageVector = when (currentError) {
                                is LiveAIError.ConnectionFailed -> Icons.Default.NetworkCheck
                                is LiveAIError.QuotaExceeded -> Icons.Default.HourglassEmpty
                                is LiveAIError.ServerError -> Icons.Default.Error
                                is LiveAIError.Reconnecting -> Icons.Default.NetworkCheck
                            },
                            contentDescription = null,
                            tint = when (currentError) {
                                is LiveAIError.ConnectionFailed -> DesignTokens.Colors.Semantic.error
                                is LiveAIError.QuotaExceeded -> DesignTokens.Colors.Semantic.warning
                                is LiveAIError.ServerError -> DesignTokens.Colors.Semantic.error
                                is LiveAIError.Reconnecting -> DesignTokens.Colors.Semantic.info
                            },
                            modifier = Modifier.size(20.dp)
                        )
                        Spacer(modifier = Modifier.width(DesignTokens.Spacing.sm))
                        Text(
                            text = when (currentError) {
                                is LiveAIError.ConnectionFailed -> bayitString("errors.connection_failed")
                                is LiveAIError.QuotaExceeded -> bayitString("errors.quota_exceeded")
                                is LiveAIError.ServerError -> bayitString("errors.server_error")
                                is LiveAIError.Reconnecting -> "Reconnecting..."
                            },
                            style = MaterialTheme.typography.labelMedium,
                            fontWeight = FontWeight.Bold,
                            color = DesignTokens.Colors.Text.primary
                        )
                    }

                    IconButton(
                        onClick = onDismiss,
                        modifier = Modifier.size(DesignTokens.TouchTarget.minimum)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Close,
                            contentDescription = "Dismiss error message",
                            tint = DesignTokens.Colors.Text.secondary,
                            modifier = Modifier.size(20.dp)
                        )
                    }
                }

                Text(
                    text = when (currentError) {
                        is LiveAIError.ConnectionFailed -> {
                            if (currentError.retryCount > 0) {
                                "Failed to connect after ${currentError.retryCount} attempts. Please check your connection."
                            } else {
                                "Failed to connect to AI services. Please try again."
                            }
                        }
                        is LiveAIError.QuotaExceeded -> {
                            "You've reached your AI feature usage limit. Upgrade to continue using AI features."
                        }
                        is LiveAIError.ServerError -> {
                            currentError.message.ifEmpty { "An unexpected error occurred. Please try again." }
                        }
                        is LiveAIError.Reconnecting -> {
                            "Attempting to reconnect (${currentError.attempt}/3)..."
                        }
                    },
                    style = MaterialTheme.typography.bodySmall,
                    color = DesignTokens.Colors.Text.secondary
                )

                when (currentError) {
                    is LiveAIError.ConnectionFailed,
                    is LiveAIError.ServerError -> {
                        TextButton(
                            onClick = onRetry,
                            modifier = Modifier.align(Alignment.End)
                        ) {
                            Text(
                                text = "Retry",
                                style = MaterialTheme.typography.labelMedium,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                    is LiveAIError.QuotaExceeded -> {
                        TextButton(
                            onClick = {},
                            modifier = Modifier.align(Alignment.End)
                        ) {
                            Text(
                                text = "Upgrade",
                                style = MaterialTheme.typography.labelMedium,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                    is LiveAIError.Reconnecting -> {
                    }
                }
            }
        }
    }
}
