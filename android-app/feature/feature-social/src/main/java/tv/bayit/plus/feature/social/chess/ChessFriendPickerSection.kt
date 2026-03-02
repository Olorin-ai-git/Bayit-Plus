package tv.bayit.plus.feature.social.chess

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import tv.bayit.plus.core.model.Friend
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.component.GlassSpinner
import tv.bayit.plus.designsystem.component.SpinnerSize
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.theme.DesignTokens

private val FRIEND_CARD_WIDTH = 120.dp

@Composable
internal fun ChessFriendPickerSection(
    friends: List<Friend>,
    isLoading: Boolean,
    onChallenge: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
    ) {
        Text(
            text = bayitString("chess.challengeFriend"),
            style = MaterialTheme.typography.titleMedium,
            color = DesignTokens.Colors.Text.primary,
            fontWeight = FontWeight.SemiBold,
        )

        when {
            isLoading -> {
                Box(
                    modifier = Modifier.fillMaxWidth(),
                    contentAlignment = Alignment.Center,
                ) {
                    GlassSpinner(size = SpinnerSize.SMALL)
                }
            }
            friends.isEmpty() -> {
                Text(
                    text = bayitString("chess.noFriendsYet"),
                    style = MaterialTheme.typography.bodyMedium,
                    color = DesignTokens.Colors.Text.muted,
                )
            }
            else -> {
                LazyRow(
                    horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
                    contentPadding = PaddingValues(horizontal = DesignTokens.Spacing.xs),
                ) {
                    items(friends, key = { it.id }) { friend ->
                        FriendChallengeCard(
                            friend = friend,
                            onChallenge = { onChallenge(friend.id) },
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun FriendChallengeCard(
    friend: Friend,
    onChallenge: () -> Unit,
    modifier: Modifier = Modifier,
) {
    GlassCard(modifier = modifier.width(FRIEND_CARD_WIDTH)) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
        ) {
            Text(
                text = friend.displayName,
                style = MaterialTheme.typography.bodySmall,
                color = DesignTokens.Colors.Text.primary,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth(),
            )
            GlassButton(
                text = bayitString("chess.challenge"),
                onClick = onChallenge,
                modifier = Modifier.fillMaxWidth(),
            )
        }
    }
}
