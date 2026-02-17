package tv.bayit.plus.feature.player.dialogue

import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
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
import tv.bayit.plus.designsystem.theme.DesignTokens

/**
 * Horizontal row of participant avatars for shared interactive sessions.
 *
 * The participant whose turn it is displays a primary-colored border.
 * Host participants show a subtle crown-like accent via font weight.
 */
@Composable
fun SharedParticipantRow(
    participants: List<SharedParticipant>,
    currentTurnUserId: String?,
    modifier: Modifier = Modifier,
) {
    if (participants.isEmpty()) return

    LazyRow(
        modifier = modifier.padding(vertical = DesignTokens.Spacing.xs),
        horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
    ) {
        items(participants, key = { it.userId }) { participant ->
            ParticipantAvatar(
                participant = participant,
                isTurnActive = participant.userId == currentTurnUserId,
            )
        }
    }
}

@Composable
private fun ParticipantAvatar(
    participant: SharedParticipant,
    isTurnActive: Boolean,
) {
    val borderColor = if (isTurnActive) {
        DesignTokens.Colors.Primary.light
    } else {
        Color.Transparent
    }

    val nameColor = if (isTurnActive) {
        DesignTokens.Colors.Primary.light
    } else {
        DesignTokens.Colors.Text.muted
    }

    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        CachedAsyncImage(
            url = participant.avatarUrl,
            contentDescription = participant.displayName,
            modifier = Modifier
                .size(PARTICIPANT_CIRCLE_SIZE)
                .clip(CircleShape)
                .border(PARTICIPANT_BORDER_WIDTH, borderColor, CircleShape),
        )

        Text(
            text = participant.displayName,
            color = nameColor,
            fontSize = DesignTokens.FontSize.xs,
            textAlign = TextAlign.Center,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
    }
}

private val PARTICIPANT_CIRCLE_SIZE = 36.dp
private val PARTICIPANT_BORDER_WIDTH = 2.dp
