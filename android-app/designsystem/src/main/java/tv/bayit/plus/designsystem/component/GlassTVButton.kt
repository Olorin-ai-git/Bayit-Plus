package tv.bayit.plus.designsystem.component

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.scale
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import tv.bayit.plus.designsystem.theme.DesignTokens

@Composable
fun GlassTVButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    isPrimary: Boolean = true,
) {
    var isFocused by remember { mutableStateOf(false) }
    val scale by animateFloatAsState(
        targetValue = if (isFocused) 1.1f else 1f,
        label = "tvButtonScale",
    )
    val backgroundColor = when {
        !enabled -> DesignTokens.Colors.Glass.bg
        isFocused && isPrimary -> DesignTokens.Colors.Primary.base
        isPrimary -> DesignTokens.Colors.Primary.dark
        isFocused -> DesignTokens.Colors.Glass.bgMedium
        else -> DesignTokens.Colors.Glass.bg
    }
    val borderColor = if (isFocused) {
        DesignTokens.Colors.Glass.borderFocus
    } else {
        DesignTokens.Colors.Glass.border
    }
    val textColor = if (enabled) {
        DesignTokens.Colors.Text.primary
    } else {
        DesignTokens.Colors.Text.disabled
    }

    androidx.compose.material3.Button(
        onClick = onClick,
        enabled = enabled,
        shape = RoundedCornerShape(DesignTokens.Radius.md),
        colors = androidx.compose.material3.ButtonDefaults.buttonColors(
            containerColor = backgroundColor,
            contentColor = textColor,
            disabledContainerColor = DesignTokens.Colors.Glass.bg,
            disabledContentColor = DesignTokens.Colors.Text.disabled,
        ),
        border = BorderStroke(2.dp, borderColor),
        contentPadding = PaddingValues(
            horizontal = DesignTokens.Spacing.xl,
            vertical = DesignTokens.Spacing.md,
        ),
        modifier = modifier
            .scale(scale)
            .onFocusChanged { isFocused = it.isFocused },
    ) {
        androidx.compose.material3.Text(
            text = text,
            style = androidx.compose.material3.MaterialTheme.typography.titleMedium,
            color = textColor,
        )
    }
}
