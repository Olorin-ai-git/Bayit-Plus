package tv.bayit.plus.feature.social.friends

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import tv.bayit.plus.core.model.Friend
import tv.bayit.plus.core.model.FriendRequest
import tv.bayit.plus.designsystem.component.CachedAsyncImage
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.theme.DesignTokens

@Composable
fun AvatarCircle(url: String?, isOnline: Boolean, modifier: Modifier = Modifier) {
    Box(modifier = modifier.size(48.dp)) {
        CachedAsyncImage(
            url = url,
            contentDescription = null,
            modifier = Modifier.size(48.dp).clip(CircleShape),
        )
        if (isOnline) {
            Box(
                modifier = Modifier.size(12.dp).align(Alignment.BottomEnd)
                    .clip(CircleShape).background(DesignTokens.Colors.Semantic.success),
            )
        }
    }
}

@Composable
fun FriendCard(friend: Friend) {
    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
        ) {
            AvatarCircle(url = friend.avatarUrl, isOnline = friend.isOnline)
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = friend.displayName,
                    color = DesignTokens.Colors.Text.primary,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = DesignTokens.FontSize.md,
                )
                Text(
                    text = if (friend.isOnline) bayitString("social.friends.online") else friend.lastSeen.orEmpty(),
                    color = if (friend.isOnline) DesignTokens.Colors.Semantic.success
                    else DesignTokens.Colors.Text.muted,
                    fontSize = DesignTokens.FontSize.sm,
                )
            }
        }
    }
}

@Composable
fun PendingRequestCard(
    request: FriendRequest,
    onAccept: (String) -> Unit,
    onDecline: (String) -> Unit,
) {
    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
        ) {
            AvatarCircle(url = request.fromUser.avatarUrl, isOnline = false)
            Text(
                text = request.fromUser.displayName,
                color = DesignTokens.Colors.Text.primary,
                modifier = Modifier.weight(1f),
            )
            GlassButton(text = bayitString("friends.accept"), onClick = { onAccept(request.id) })
            GlassButton(
                text = bayitString("friends.reject"),
                onClick = { onDecline(request.id) },
                isPrimary = false,
            )
        }
    }
}

@Composable
fun SearchResultCard(user: Friend, onSendRequest: (String) -> Unit) {
    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
        ) {
            AvatarCircle(url = user.avatarUrl, isOnline = user.isOnline)
            Text(
                text = user.displayName,
                color = DesignTokens.Colors.Text.primary,
                modifier = Modifier.weight(1f),
            )
            GlassButton(text = bayitString("friends.add"), onClick = { onSendRequest(user.id) })
        }
    }
}
