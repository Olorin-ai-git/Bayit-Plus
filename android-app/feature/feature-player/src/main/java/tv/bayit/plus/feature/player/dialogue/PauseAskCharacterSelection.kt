package tv.bayit.plus.feature.player.dialogue

import androidx.compose.animation.core.InfiniteTransition
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import tv.bayit.plus.designsystem.component.CachedAsyncImage
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.theme.DesignTokens

/**
 * Character selection grid for the SELECTING phase of Pause-to-Ask.
 *
 * Displays each available character in a pulsing circular frame.
 * Tapping a character advances the flow to the INPUT phase.
 */
@Composable
internal fun PauseAskCharacterSelection(
    characters: List<ContentCharacter>,
    onCharacterSelected: (ContentCharacter) -> Unit,
    onResume: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val transition = rememberInfiniteTransition(label = "pulse")

    Column(
        modifier = modifier.padding(DesignTokens.Spacing.base),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(
            text = bayitString("player.pauseAsk.selectCharacter"),
            color = DesignTokens.Colors.Text.primary,
            fontSize = DesignTokens.FontSize.lg,
            fontWeight = FontWeight.Bold,
        )

        Spacer(modifier = Modifier.height(DesignTokens.Spacing.lg))

        LazyRow(horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.base)) {
            items(characters) { character ->
                PulsingCharacterItem(
                    character = character,
                    transition = transition,
                    onClick = { onCharacterSelected(character) },
                )
            }
        }

        Spacer(modifier = Modifier.height(DesignTokens.Spacing.xl))

        GlassButton(
            text = bayitString("player.pauseAsk.resumeMovie"),
            onClick = onResume,
            isPrimary = false,
        )
    }
}

@Composable
private fun PulsingCharacterItem(
    character: ContentCharacter,
    transition: InfiniteTransition,
    onClick: () -> Unit,
) {
    val alpha by transition.animateFloat(
        initialValue = PULSE_ALPHA_MIN,
        targetValue = PULSE_ALPHA_MAX,
        animationSpec = infiniteRepeatable(animation = tween(durationMillis = PULSE_DURATION_MS)),
        label = "pulseAlpha",
    )

    Column(
        modifier = Modifier.clickable(onClick = onClick),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        CachedAsyncImage(
            url = character.frameUrl,
            contentDescription = character.name,
            modifier = Modifier
                .size(CHARACTER_CIRCLE_SIZE)
                .clip(CircleShape)
                .border(
                    width = PULSE_BORDER_WIDTH,
                    color = DesignTokens.Colors.Primary.light.copy(alpha = alpha),
                    shape = CircleShape,
                ),
        )

        Spacer(modifier = Modifier.height(DesignTokens.Spacing.sm))

        Text(
            text = character.name,
            color = DesignTokens.Colors.Text.primary,
            fontSize = DesignTokens.FontSize.sm,
            fontWeight = FontWeight.Medium,
            textAlign = TextAlign.Center,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
    }
}

private val CHARACTER_CIRCLE_SIZE = DesignTokens.Spacing.xxxxl + DesignTokens.Spacing.xxl
private val PULSE_BORDER_WIDTH = 2.dp
private const val PULSE_ALPHA_MIN = 0.3f
private const val PULSE_ALPHA_MAX = 1.0f
private const val PULSE_DURATION_MS = 1200
