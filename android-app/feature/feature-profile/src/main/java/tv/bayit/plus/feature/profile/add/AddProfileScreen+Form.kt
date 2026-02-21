package tv.bayit.plus.feature.profile.add

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import tv.bayit.plus.designsystem.component.CachedAsyncImage
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.theme.DesignTokens

@Composable
internal fun AvatarSelector(
    selectedUrl: String,
    onAvatarSelected: (String) -> Unit,
    enabled: Boolean,
) {
    Text(
        "Choose Avatar",
        style = MaterialTheme.typography.titleSmall,
        color = DesignTokens.Colors.Text.primary,
    )
    Spacer(modifier = Modifier.height(DesignTokens.Spacing.sm))
    LazyRow(
        horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
        contentPadding = PaddingValues(horizontal = DesignTokens.Spacing.xs),
    ) {
        items(AVATAR_OPTIONS, key = { it }) { avatarUrl ->
            val isSelected = avatarUrl == selectedUrl
            val borderColor = if (isSelected) DesignTokens.Colors.Primary.base else DesignTokens.Colors.Glass.bgLight
            Box(
                modifier = Modifier
                    .size(64.dp)
                    .clip(CircleShape)
                    .background(borderColor)
                    .padding(2.dp)
                    .clip(CircleShape)
                    .clickable(enabled = enabled) { onAvatarSelected(avatarUrl) },
                contentAlignment = Alignment.Center,
            ) {
                CachedAsyncImage(
                    url = avatarUrl,
                    contentDescription = "Avatar option",
                    modifier = Modifier.size(60.dp).clip(CircleShape),
                )
            }
        }
    }
}

@Composable
internal fun AgeGroupPicker(
    selectedGroup: AgeGroup,
    onGroupSelected: (AgeGroup) -> Unit,
    enabled: Boolean,
) {
    Text(
        "Age Group",
        style = MaterialTheme.typography.titleSmall,
        color = DesignTokens.Colors.Text.primary,
    )
    Spacer(modifier = Modifier.height(DesignTokens.Spacing.sm))
    Column(verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.xs)) {
        AgeGroup.entries.forEach { group ->
            val isSelected = group == selectedGroup
            GlassCard(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable(enabled = enabled) { onGroupSelected(group) },
            ) {
                Text(
                    text = group.displayLabel,
                    style = MaterialTheme.typography.bodyMedium,
                    color = if (isSelected) DesignTokens.Colors.Primary.base else DesignTokens.Colors.Text.secondary,
                )
            }
        }
    }
}

internal val AVATAR_OPTIONS = listOf(
    "https://cdn.bayit.tv/avatars/aleph.png",
    "https://cdn.bayit.tv/avatars/bet.png",
    "https://cdn.bayit.tv/avatars/gimel.png",
    "https://cdn.bayit.tv/avatars/dalet.png",
    "https://cdn.bayit.tv/avatars/hei.png",
    "https://cdn.bayit.tv/avatars/vav.png",
)
