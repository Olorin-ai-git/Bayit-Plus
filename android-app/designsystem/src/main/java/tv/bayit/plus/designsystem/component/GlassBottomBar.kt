package tv.bayit.plus.designsystem.component

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import tv.bayit.plus.designsystem.modifier.glassMorphism
import tv.bayit.plus.designsystem.theme.DesignTokens

data class BottomBarItem(
    val label: String,
    val icon: ImageVector,
    val isSelected: Boolean,
)

@Composable
fun GlassBottomBar(
    items: List<BottomBarItem>,
    onItemClick: (Int) -> Unit,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .height(72.dp)
            .glassMorphism(
                cornerRadius = DesignTokens.Radius.xl,
                backgroundColor = DesignTokens.Colors.Glass.bgStrong,
            )
            .padding(horizontal = DesignTokens.Spacing.sm),
        horizontalArrangement = Arrangement.SpaceEvenly,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        items.forEachIndexed { index, item ->
            Column(
                modifier = Modifier
                    .clickable { onItemClick(index) }
                    .padding(DesignTokens.Spacing.sm),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Icon(
                    imageVector = item.icon,
                    contentDescription = item.label,
                    tint = if (item.isSelected) DesignTokens.Colors.Primary.light else DesignTokens.Colors.Text.muted,
                    modifier = Modifier.size(24.dp),
                )
                Text(
                    text = item.label,
                    color = if (item.isSelected) DesignTokens.Colors.Primary.light else DesignTokens.Colors.Text.muted,
                    fontSize = DesignTokens.FontSize.xs,
                )
            }
        }
    }
}
