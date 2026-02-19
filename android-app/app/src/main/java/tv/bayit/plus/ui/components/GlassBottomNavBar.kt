package tv.bayit.plus.ui.components

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.icons.BayitIcons
import tv.bayit.plus.designsystem.modifier.glassMorphism
import tv.bayit.plus.designsystem.theme.DesignTokens
import tv.bayit.plus.navigation.AppTab

@Composable
fun GlassBottomNavBar(
    selectedTab: AppTab,
    onTabSelected: (AppTab) -> Unit,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .glassMorphism(
                cornerRadius = DesignTokens.Radius.xl,
                backgroundColor = DesignTokens.Colors.Glass.bgStrong,
            )
            .navigationBarsPadding()
            .padding(bottom = 12.dp)
            .height(72.dp)
            .padding(horizontal = DesignTokens.Spacing.sm),
        horizontalArrangement = Arrangement.SpaceEvenly,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        AppTab.entries.filter { it != AppTab.ZEH_ANI }.forEach { tab ->
            BottomNavItem(
                label = bayitString(tab.labelKey),
                icon = getTabIcon(tab),
                isSelected = selectedTab == tab,
                onClick = { onTabSelected(tab) },
            )
        }
    }
}

@Composable
private fun BottomNavItem(
    label: String,
    icon: ImageVector,
    isSelected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier
            .clickable { onClick() }
            .padding(DesignTokens.Spacing.sm),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Icon(
            imageVector = icon,
            contentDescription = label,
            tint = if (isSelected) {
                DesignTokens.Colors.Primary.light
            } else {
                DesignTokens.Colors.Text.muted
            },
            modifier = Modifier.size(24.dp),
        )
        Text(
            text = label,
            color = if (isSelected) {
                DesignTokens.Colors.Primary.light
            } else {
                DesignTokens.Colors.Text.muted
            },
            fontSize = DesignTokens.FontSize.xs,
        )
    }
}

@Composable
private fun getTabIcon(tab: AppTab): ImageVector {
    return when (tab.iconName) {
        "home" -> Icons.Default.Home
        "tv" -> BayitIcons.Tv
        "film" -> BayitIcons.Film
        "person" -> Icons.Default.Person
        "headphones" -> BayitIcons.Headphones
        "search" -> Icons.Default.Search
        "download" -> Icons.Default.Download
        else -> Icons.Default.Home
    }
}
