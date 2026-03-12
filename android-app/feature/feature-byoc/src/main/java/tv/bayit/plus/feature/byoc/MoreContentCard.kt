package tv.bayit.plus.feature.byoc

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Devices
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.theme.DesignTokens

@Composable
fun MoreContentCard(
    onExplore: () -> Unit,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier,
) {
    GlassCard(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = DesignTokens.Spacing.lg),
    ) {
        Box(modifier = Modifier.fillMaxWidth()) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(end = DesignTokens.Spacing.xl),
                verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.Devices,
                        contentDescription = null,
                        tint = DesignTokens.Colors.Primary.p400,
                        modifier = Modifier.size(28.dp),
                    )
                    Spacer(modifier = Modifier.width(DesignTokens.Spacing.sm))
                    Text(
                        text = bayitString("ai.gateway.moreContent.title"),
                        style = MaterialTheme.typography.titleMedium,
                        color = DesignTokens.Colors.Text.primary,
                        fontWeight = FontWeight.Bold,
                    )
                }
                Text(
                    text = bayitString("ai.gateway.moreContent.subtitle"),
                    style = MaterialTheme.typography.bodyMedium,
                    color = DesignTokens.Colors.Text.secondary,
                )
                GlassButton(
                    text = bayitString("ai.gateway.moreContent.action"),
                    onClick = onExplore,
                    modifier = Modifier.fillMaxWidth(),
                )
            }
            IconButton(
                onClick = onDismiss,
                modifier = Modifier.align(Alignment.TopEnd),
            ) {
                Icon(
                    imageVector = Icons.Default.Close,
                    contentDescription = bayitString("common.dismiss"),
                    tint = DesignTokens.Colors.Text.secondary,
                    modifier = Modifier.size(20.dp),
                )
            }
        }
    }
}
