package tv.bayit.plus.feature.auth.subscription

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.ClosedCaption
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.MonetizationOn
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassModal
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.theme.DesignTokens

@Composable
fun PlusIntroSheet(
    onSeePlans: () -> Unit,
    onDismiss: () -> Unit,
) {
    GlassModal(onDismissRequest = onDismiss) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
            modifier = Modifier
                .fillMaxWidth()
                .padding(DesignTokens.Spacing.xl),
        ) {
            Icon(
                imageVector = Icons.Default.AutoAwesome,
                contentDescription = null,
                tint = DesignTokens.Colors.Primary.base,
                modifier = Modifier.size(48.dp),
            )
            Text(
                text = bayitString("plus.intro.title"),
                style = MaterialTheme.typography.headlineMedium,
                color = DesignTokens.Colors.Text.primary,
            )
            Text(
                text = bayitString("plus.intro.subtitle"),
                style = MaterialTheme.typography.bodyMedium,
                color = DesignTokens.Colors.Text.muted,
            )
            FeatureBullets()
            GlassButton(
                text = bayitString("plus.intro.seePlans"),
                onClick = onSeePlans,
                isPrimary = true,
                modifier = Modifier.fillMaxWidth(),
            )
            TextButton(onClick = onDismiss) {
                Text(
                    text = bayitString("plus.intro.maybeLater"),
                    color = DesignTokens.Colors.Text.muted,
                )
            }
        }
    }
}

@Composable
private fun FeatureBullets() {
    val bullets: List<Pair<ImageVector, String>> = listOf(
        Icons.Default.Mic to "plus.intro.bullet1",
        Icons.Default.ClosedCaption to "plus.intro.bullet2",
        Icons.Default.Search to "plus.intro.bullet3",
        Icons.Default.MonetizationOn to "plus.intro.bullet4",
    )
    Column(
        verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = DesignTokens.Spacing.sm),
    ) {
        bullets.forEach { (icon, key) ->
            Row(
                horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    tint = DesignTokens.Colors.Primary.base,
                )
                Text(
                    text = bayitString(key),
                    style = MaterialTheme.typography.bodyMedium,
                    color = DesignTokens.Colors.Text.primary,
                )
            }
        }
    }
}
