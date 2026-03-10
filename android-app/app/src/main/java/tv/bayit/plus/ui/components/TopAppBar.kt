package tv.bayit.plus.ui.components

import androidx.compose.foundation.Image
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.QueueMusic
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.SettingsInputAntenna
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
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.modifier.glassMorphism
import tv.bayit.plus.designsystem.theme.DesignTokens
import tv.bayit.plus.navigation.BreadcrumbEntry

@Composable
fun TopAppBar(
    userPhotoUrl: String?,
    userName: String?,
    currentLanguage: String,
    onProfileClick: () -> Unit,
    onSettingsClick: () -> Unit = {},
    onBYOCClick: () -> Unit = {},
    onLanguageSelected: (String) -> Unit,
    onPlaylistClick: () -> Unit,
    onZehAniClick: () -> Unit,
    onHomeClick: () -> Unit = {},
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
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Image(
                painter = painterResource(id = R.drawable.splash_logo),
                contentDescription = bayitString("a11y.homeLogo"),
                modifier = Modifier
                    .height(30.dp)
                    .clickable { onHomeClick() },
            )

            LanguageSelector(
                currentLanguage = currentLanguage,
                onLanguageSelected = onLanguageSelected,
            )

            IconButton(onClick = onPlaylistClick) {
                Icon(
                    imageVector = Icons.AutoMirrored.Filled.QueueMusic,
                    contentDescription = bayitString("nav.playlist"),
                    tint = DesignTokens.Colors.Text.primary,
                    modifier = Modifier.size(28.dp),
                )
            }

            IconButton(onClick = onZehAniClick) {
                Icon(
                    imageVector = Icons.Default.Person,
                    contentDescription = bayitString("nav.zehAniHub"),
                    tint = DesignTokens.Colors.Text.primary,
                    modifier = Modifier.size(28.dp),
                )
            }

            IconButton(onClick = onBYOCClick) {
                Icon(
                    imageVector = Icons.Default.SettingsInputAntenna,
                    contentDescription = bayitString("nav.byoc"),
                    tint = DesignTokens.Colors.Text.primary,
                    modifier = Modifier.size(24.dp),
                )
            }

            IconButton(onClick = onSettingsClick) {
                Icon(
                    imageVector = Icons.Default.Settings,
                    contentDescription = bayitString("nav.settings"),
                    tint = DesignTokens.Colors.Text.primary,
                    modifier = Modifier.size(24.dp),
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
