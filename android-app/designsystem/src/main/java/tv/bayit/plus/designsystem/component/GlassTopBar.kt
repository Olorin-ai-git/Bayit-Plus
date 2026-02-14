package tv.bayit.plus.designsystem.component

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import tv.bayit.plus.designsystem.modifier.glassMorphism
import tv.bayit.plus.designsystem.theme.DesignTokens

@Composable
fun GlassTopBar(
    title: String,
    modifier: Modifier = Modifier,
    navigationIcon: @Composable (() -> Unit)? = null,
    actions: @Composable (() -> Unit)? = null,
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .height(64.dp)
            .glassMorphism(
                cornerRadius = DesignTokens.Radius.sm,
                backgroundColor = DesignTokens.Colors.Glass.bgStrong,
            )
            .padding(horizontal = DesignTokens.Spacing.base),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        navigationIcon?.invoke()
        Text(
            text = title,
            color = DesignTokens.Colors.Text.primary,
            fontSize = DesignTokens.FontSize.lg,
            fontWeight = FontWeight.SemiBold,
            modifier = Modifier.weight(1f).padding(horizontal = DesignTokens.Spacing.sm),
        )
        actions?.invoke()
    }
}
