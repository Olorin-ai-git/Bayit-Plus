package tv.bayit.plus.feature.player.dialogue

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
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import tv.bayit.plus.designsystem.component.CachedAsyncImage
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassModal
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.theme.DesignTokens

/**
 * Bottom sheet for selecting a character to start a dialogue session.
 *
 * Displays a horizontal scrollable row of circular character images with
 * names beneath each. Follows the same ModalBottomSheet pattern used by
 * [SubtitleLanguagePicker] and other player pickers.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CharacterSelectionSheet(
    characters: List<ContentCharacter>,
    onCharacterSelected: (ContentCharacter) -> Unit,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier,
) {
    GlassModal(
        onDismissRequest = onDismiss,
        modifier = modifier,
    ) {
        Column(
            modifier = Modifier.padding(DesignTokens.Spacing.base),
        ) {
            Text(
                text = bayitString("player.dialogue.selectCharacter"),
                color = DesignTokens.Colors.Text.primary,
                fontSize = DesignTokens.FontSize.lg,
                fontWeight = FontWeight.Bold,
            )

            Spacer(modifier = Modifier.height(DesignTokens.Spacing.lg))

            LazyRow(
                horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.base),
            ) {
                items(characters) { character ->
                    CharacterOption(
                        character = character,
                        onClick = { onCharacterSelected(character) },
                    )
                }
            }

            Spacer(modifier = Modifier.height(DesignTokens.Spacing.xl))

            GlassButton(
                text = bayitString("player.dialogue.cancel"),
                onClick = onDismiss,
                isPrimary = false,
            )
        }
    }
}

@Composable
private fun CharacterOption(
    character: ContentCharacter,
    onClick: () -> Unit,
) {
    Column(
        modifier = Modifier
            .clickable(onClick = onClick),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        CachedAsyncImage(
            url = character.frameUrl,
            contentDescription = character.name,
            modifier = Modifier
                .size(CHARACTER_IMAGE_SIZE)
                .clip(CircleShape),
        )

        Spacer(modifier = Modifier.height(DesignTokens.Spacing.sm))

        Text(
            text = character.name,
            color = DesignTokens.Colors.Text.primary,
            fontSize = DesignTokens.FontSize.sm,
            fontWeight = FontWeight.Medium,
            textAlign = TextAlign.Center,
            maxLines = NAME_MAX_LINES,
            overflow = TextOverflow.Ellipsis,
        )

        Text(
            text = character.description,
            color = DesignTokens.Colors.Text.muted,
            fontSize = DesignTokens.FontSize.xs,
            textAlign = TextAlign.Center,
            maxLines = DESCRIPTION_MAX_LINES,
            overflow = TextOverflow.Ellipsis,
        )
    }
}

private val CHARACTER_IMAGE_SIZE = DesignTokens.Spacing.xxxxl + DesignTokens.Spacing.xxl
private const val NAME_MAX_LINES = 1
private const val DESCRIPTION_MAX_LINES = 2
