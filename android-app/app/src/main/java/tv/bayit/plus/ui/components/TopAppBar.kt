package tv.bayit.plus.ui.components

import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.QueueMusic
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.dp
import tv.bayit.plus.R
import tv.bayit.plus.designsystem.component.LanguageSelector
import tv.bayit.plus.designsystem.component.ProfileAvatar
import tv.bayit.plus.designsystem.modifier.glassMorphism
import tv.bayit.plus.designsystem.theme.DesignTokens
import tv.bayit.plus.navigation.BreadcrumbEntry

@Composable
fun TopAppBar(
    userPhotoUrl: String?,
    userName: String?,
    currentLanguage: String,
    onProfileClick: () -> Unit,
    onLanguageSelected: (String) -> Unit,
    onPlaylistClick: () -> Unit,
    showBack: Boolean = false,
    onBack: () -> Unit = {},
    breadcrumbs: List<BreadcrumbEntry> = emptyList(),
    onBreadcrumbClick: (BreadcrumbEntry) -> Unit = {},
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .glassMorphism(
                cornerRadius = DesignTokens.Radius.sm,
                backgroundColor = DesignTokens.Colors.Glass.bgStrong,
            )
            .windowInsetsPadding(WindowInsets.statusBars),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .height(52.dp)
                .padding(horizontal = DesignTokens.Spacing.sm),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Image(
                painter = painterResource(id = R.drawable.splash_logo),
                contentDescription = "Bayit+",
                modifier = Modifier.height(30.dp),
            )

            Spacer(modifier = Modifier.weight(1f))

            LanguageSelector(
                currentLanguage = currentLanguage,
                onLanguageSelected = onLanguageSelected,
            )

            IconButton(onClick = onPlaylistClick) {
                Icon(
                    imageVector = Icons.AutoMirrored.Filled.QueueMusic,
                    contentDescription = "Playlist",
                    tint = DesignTokens.Colors.Text.primary,
                    modifier = Modifier.size(28.dp),
                )
            }

            ProfileAvatar(
                photoUrl = userPhotoUrl,
                userName = userName,
                onClick = onProfileClick,
            )
        }

        BreadcrumbRow(
            entries = breadcrumbs,
            onEntryClick = onBreadcrumbClick,
            showBack = showBack,
            onBack = onBack,
        )
    }
}
