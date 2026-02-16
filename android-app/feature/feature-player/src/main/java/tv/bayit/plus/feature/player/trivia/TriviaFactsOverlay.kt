package tv.bayit.plus.feature.player.trivia

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
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
import androidx.compose.foundation.layout.widthIn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.NavigateNext
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import tv.bayit.plus.core.model.TriviaFact
import tv.bayit.plus.designsystem.component.GlassBadge
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.modifier.glassMorphism
import tv.bayit.plus.designsystem.theme.DesignTokens

/**
 * Glassmorphic trivia fact banner displayed in the upper-right of the player.
 *
 * Shows a category badge, fact text (in the selected language), related person
 * info, and a follow-up button when chain facts are available.
 */
@Composable
fun TriviaFactsOverlay(
    activeFact: TriviaFact?,
    language: String,
    onDismiss: () -> Unit,
    onFollowUp: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Box(
        modifier = modifier
            .fillMaxWidth()
            .padding(DesignTokens.Spacing.md),
        contentAlignment = Alignment.TopEnd,
    ) {
        AnimatedVisibility(
            visible = activeFact != null,
            enter = slideInHorizontally { it },
            exit = slideOutHorizontally { it },
        ) {
            activeFact?.let { fact ->
                FactBanner(
                    fact = fact,
                    language = language,
                    onDismiss = onDismiss,
                    onFollowUp = onFollowUp,
                )
            }
        }
    }
}

@Composable
private fun FactBanner(
    fact: TriviaFact,
    language: String,
    onDismiss: () -> Unit,
    onFollowUp: () -> Unit,
) {
    Column(
        modifier = Modifier
            .widthIn(max = 320.dp)
            .glassMorphism(
                cornerRadius = DesignTokens.Radius.md,
                backgroundColor = DesignTokens.Colors.Glass.purpleStrong,
            )
            .padding(DesignTokens.Spacing.md),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
            ) {
                Icon(
                    imageVector = Icons.Default.AutoAwesome,
                    contentDescription = null,
                    tint = DesignTokens.Colors.gold,
                    modifier = Modifier.size(16.dp),
                )
                fact.category?.let { category ->
                    Text(
                        text = category,
                        color = DesignTokens.Colors.Text.secondary
                    )
                }
            }
            IconButton(onClick = onDismiss, modifier = Modifier.size(24.dp)) {
                Icon(
                    imageVector = Icons.Default.Close,
                    contentDescription = bayitString("player.dismiss"),
                    tint = DesignTokens.Colors.Text.secondary,
                    modifier = Modifier.size(16.dp),
                )
            }
        }

        Spacer(modifier = Modifier.height(DesignTokens.Spacing.sm))

        val factText = fact.textForLanguage(language)
        factText?.let { text ->
            Text(
                text = text,
                color = DesignTokens.Colors.Text.primary,
                fontSize = DesignTokens.FontSize.sm,
            )
        }

        fact.relatedPerson?.let { person ->
            Spacer(modifier = Modifier.height(DesignTokens.Spacing.xs))
            Text(
                text = person,
                color = DesignTokens.Colors.Primary.light,
                fontSize = DesignTokens.FontSize.xs,
                fontWeight = FontWeight.Medium,
            )
        }

        if (fact.hasFollowUp == true) {
            Spacer(modifier = Modifier.height(DesignTokens.Spacing.sm))
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.align(Alignment.End),
            ) {
                Text(
                    text = bayitString("trivia.more"),
                    color = DesignTokens.Colors.Primary.light,
                    fontSize = DesignTokens.FontSize.xs,
                    fontWeight = FontWeight.SemiBold,
                )
                IconButton(onClick = onFollowUp, modifier = Modifier.size(20.dp)) {
                    Icon(
                        imageVector = Icons.Default.NavigateNext,
                        contentDescription = bayitString("trivia.follow_up"),
                        tint = DesignTokens.Colors.Primary.light,
                        modifier = Modifier.size(16.dp),
                    )
                }
            }
        }
    }
}
