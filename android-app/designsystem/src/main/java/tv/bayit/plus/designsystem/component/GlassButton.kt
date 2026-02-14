package tv.bayit.plus.designsystem.component

import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.height
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import tv.bayit.plus.designsystem.theme.DesignTokens

@Composable
fun GlassButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    isPrimary: Boolean = true,
) {
    Button(
        onClick = onClick,
        modifier = modifier.height(DesignTokens.TouchTarget.minimum),
        enabled = enabled,
        contentPadding = PaddingValues(
            horizontal = DesignTokens.Spacing.xl,
            vertical = DesignTokens.Spacing.md,
        ),
        colors = ButtonDefaults.buttonColors(
            containerColor = if (isPrimary) DesignTokens.Colors.Primary.base else DesignTokens.Colors.Glass.bg,
            contentColor = DesignTokens.Colors.Text.primary,
            disabledContainerColor = DesignTokens.Colors.Glass.bgStrong,
            disabledContentColor = DesignTokens.Colors.Text.disabled,
        ),
        shape = androidx.compose.foundation.shape.RoundedCornerShape(DesignTokens.Radius.default),
    ) {
        Text(text = text)
    }
}
