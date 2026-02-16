package tv.bayit.plus.feature.player.live.ui

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import tv.bayit.plus.core.model.TriviaFact
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.theme.DesignTokens
import tv.bayit.plus.designsystem.theme.glassMorphism
import tv.bayit.plus.feature.player.live.LiveTriviaUiState

/**
 * Banner displaying trivia facts with progress tracking
 */
@Composable
fun TriviaFactBanner(
    state: LiveTriviaUiState,
    progressFraction: Float,
    currentLanguage: String,
    onDismiss: () -> Unit,
    onFollowUp: () -> Unit,
    modifier: Modifier = Modifier
) {
    AnimatedVisibility(
        visible = state.activeFact != null,
        enter = slideInHorizontally(initialOffsetX = { it }),
        exit = slideOutHorizontally(targetOffsetX = { it }),
        modifier = modifier
    ) {
        val fact = state.activeFact ?: return@AnimatedVisibility
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            contentAlignment = Alignment.TopEnd
        ) {
            Column(
                modifier = Modifier
                    .width(320.dp)
                    .glassMorphism(
                        cornerRadius = DesignTokens.Radius.lg,
                        alpha = 0.95f,
                        borderAlpha = 0.25f
                    )
            ) {
                LinearProgressIndicator(
                    progress = { progressFraction },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(3.dp)
                )

                Column(
                    modifier = Modifier.padding(16.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            val (icon, color) = TriviaCategoryStyle.getIconAndColor(
                                fact.category ?: "trivia"
                            )
                            Icon(
                                imageVector = icon,
                                contentDescription = null,
                                tint = color,
                                modifier = Modifier.size(20.dp)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = bayitString("trivia.aiTrivia"),
                                style = MaterialTheme.typography.labelMedium,
                                color = MaterialTheme.colorScheme.onSurface,
                                fontWeight = FontWeight.Bold
                            )
                        }

                        IconButton(
                            onClick = onDismiss,
                            modifier = Modifier.size(DesignTokens.TouchTarget.minimum)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Close,
                                contentDescription = bayitString("player.controls.dismiss"),
                                tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                                modifier = Modifier.size(20.dp)
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    Text(
                        text = fact.textForLanguage(currentLanguage) ?: fact.textEn ?: "",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurface
                    )

                    fact.relatedPerson?.let { person ->
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = person,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f),
                            fontWeight = FontWeight.Medium
                        )
                    }

                    if (fact.hasFollowUp == true) {
                        Spacer(modifier = Modifier.height(DesignTokens.Spacing.md))
                        TextButton(
                            onClick = onFollowUp,
                            modifier = Modifier
                                .align(Alignment.End)
                                .size(
                                    width = 120.dp,
                                    height = DesignTokens.TouchTarget.minimum
                                )
                        ) {
                            Text(
                                text = bayitString("trivia.tellMeMore"),
                                style = MaterialTheme.typography.labelMedium
                            )
                        }
                    }
                }
            }
        }
    }
}
