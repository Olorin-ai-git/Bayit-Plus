package tv.bayit.plus.feature.discover.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.theme.DesignTokens
import tv.bayit.plus.feature.discover.model.FeaturePrerequisite

/**
 * Vertical list of unmet prerequisites, each shown as a warning icon with a label.
 */
@Composable
internal fun PrerequisitesList(
    prerequisites: List<FeaturePrerequisite>,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier,
        verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
    ) {
        prerequisites.forEach { prerequisite ->
            PrerequisiteRow(prerequisite = prerequisite)
        }
    }
}

@Composable
private fun PrerequisiteRow(prerequisite: FeaturePrerequisite) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
    ) {
        Icon(
            imageVector = Icons.Filled.Warning,
            contentDescription = null,
            tint = DesignTokens.Colors.Semantic.warning,
            modifier = Modifier.size(18.dp),
        )
        Text(
            text = bayitString(prerequisite.labelKey),
            style = MaterialTheme.typography.bodySmall,
            color = DesignTokens.Colors.Text.secondary,
        )
    }
}
