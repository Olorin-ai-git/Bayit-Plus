package tv.bayit.plus.feature.player.dialogue

import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
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
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import tv.bayit.plus.designsystem.component.CachedAsyncImage
import tv.bayit.plus.designsystem.modifier.glassMorphism
import tv.bayit.plus.designsystem.theme.DesignTokens

/**
 * Horizontal row of character circles for multi-character interactions.
 *
 * The currently addressed character displays a primary-colored border with
 * a glassmorphic glow effect. Tapping a circle switches the addressed character.
 */
@Composable
fun MultiCharacterCirclesView(
    characters: List<CharacterProfile>,
    activeCharacter: CharacterProfile?,
    onCharacterTapped: (CharacterProfile) -> Unit,
    modifier: Modifier = Modifier,
) {
    if (characters.size < MIN_MULTI_CHARACTER_COUNT) return

    LazyRow(
        modifier = modifier.padding(vertical = DesignTokens.Spacing.sm),
        horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
    ) {
        items(characters, key = { it.name }) { character ->
            CharacterCircle(
                character = character,
                isActive = character.name == activeCharacter?.name,
                onClick = { onCharacterTapped(character) },
            )
        }
    }
}

@Composable
private fun CharacterCircle(
    character: CharacterProfile,
    isActive: Boolean,
    onClick: () -> Unit,
) {
    val borderColor = if (isActive) {
        DesignTokens.Colors.Primary.light
    } else {
        Color.Transparent
    }

    Column(
        modifier = Modifier.clickable(onClick = onClick),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Box {
            if (isActive) {
                Box(
                    modifier = Modifier
                        .size(CIRCLE_SIZE + GLOW_PADDING)
                        .align(Alignment.Center)
                        .glassMorphism(
                            cornerRadius = CIRCLE_SIZE,
                            backgroundColor = DesignTokens.Colors.Glass.purpleStrong,
                        ),
                )
            }

            CachedAsyncImage(
                url = character.frameUrl,
                contentDescription = character.name,
                modifier = Modifier
                    .size(CIRCLE_SIZE)
                    .clip(CircleShape)
                    .border(BORDER_WIDTH, borderColor, CircleShape)
                    .align(Alignment.Center),
            )
        }

        Spacer(modifier = Modifier.height(DesignTokens.Spacing.xs))

        Text(
            text = character.name,
            color = if (isActive) {
                DesignTokens.Colors.Primary.light
            } else {
                DesignTokens.Colors.Text.muted
            },
            fontSize = DesignTokens.FontSize.xs,
            textAlign = TextAlign.Center,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
    }
}

private val CIRCLE_SIZE = 64.dp
private val GLOW_PADDING = 8.dp
private val BORDER_WIDTH = 2.dp
private const val MIN_MULTI_CHARACTER_COUNT = 2
