// # DEMO-ONLY
package tv.bayit.plus.feature.onboarding.demos

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.theme.DesignTokens
import tv.bayit.plus.feature.onboarding.R

/**
 * Shared top bar for all demo composables. Shows the DEMO-ONLY label
 * and a close button.
 */
@Composable
internal fun DemoTopBar(
    label: String,
    onClose: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .background(DesignTokens.Colors.Glass.bgStrong)
            .padding(
                horizontal = DesignTokens.Spacing.base,
                vertical = DesignTokens.Spacing.sm,
            ),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.labelMedium,
            color = DesignTokens.Colors.Semantic.warning,
            fontWeight = FontWeight.Bold,
        )
        GlassButton(
            text = stringResource(R.string.demo_close),
            onClick = onClose,
            isPrimary = false,
        )
    }
}
